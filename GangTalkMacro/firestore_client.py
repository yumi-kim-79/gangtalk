# -*- coding: utf-8 -*-
"""
firestore_client.py — Firestore 초기화 + 업로드 + 인덱스 자동 로드(옵션)

개선 사항 요약
- 초기화 로깅 강화(어느 경로로 초기화했는지 구분 출력)
- KST 문자열 유틸 보강
- post_status/post_rooms_biz_message/touch_rooms_biz_root 예외 처리 및 타입 힌트 보강
- _mk_aliases 안전성(공백/기호 처리) 유지
- 기존 동작 100% 호환 (함수 시그니처/필드 동일)
"""

from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
import os
import re
import json

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except Exception:
    firebase_admin = None
    credentials = None
    firestore = None


# ─────────────────────────────────────────────
# Firestore 초기화 (내구성 강화)
# ─────────────────────────────────────────────

def _path_exists(p: str) -> bool:
    try:
        return bool(p) and os.path.isfile(p)
    except Exception:
        return False


def init_firestore():
    """
    Firestore 클라이언트 반환. 실패 시 None.
    초기화 우선순위:
      1) 이미 초기화된 앱 사용
      2) firebase_admin.initialize_app()  (ADC / 환경 변수)
      3) C:\\GangTalkMacro\\serviceAccount.json 이 있으면 그걸로
      4) 환경변수 GOOGLE_APPLICATION_CREDENTIALS 경로가 유효하면 그걸로
    """
    if firebase_admin is None:
        print("[Firestore] module not available; skipping upload")
        return None

    # 1) 이미 앱이 있으면 그대로
    try:
        if firebase_admin._apps:
            print("[Firestore] reuse existing app")
            return firestore.client()
    except Exception as e:
        print("[Firestore] existing app check failed:", e)

    # 2) 기본 초기화(ADC/환경변수)
    try:
        firebase_admin.initialize_app()
        print("[Firestore] initialized via default credentials (ADC/env)")
        return firestore.client()
    except Exception as e:
        print("[Firestore] default initialize_app failed:", e)

    # 3) 고정 경로 서비스계정 키 시도
    fallback_sa = r"C:\GangTalkMacro\serviceAccount.json"
    if _path_exists(fallback_sa):
        try:
            cred = credentials.Certificate(fallback_sa)
            firebase_admin.initialize_app(cred)
            print("[Firestore] initialized with serviceAccount.json")
            return firestore.client()
        except Exception as e:
            print("[Firestore] initialize with serviceAccount.json failed:", e)

    # 4) 환경변수 경로 시도
    gac = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if _path_exists(gac):
        try:
            cred = credentials.Certificate(gac)
            firebase_admin.initialize_app(cred)
            print("[Firestore] initialized with GOOGLE_APPLICATION_CREDENTIALS")
            return firestore.client()
        except Exception as e:
            print("[Firestore] initialize with GOOGLE_APPLICATION_CREDENTIALS failed:", e)

    print("[Firestore] initialization failed; upload will be skipped")
    return None


# ─────────────────────────────────────────────
# 공용: 시간/타임스탬프 유틸
# ─────────────────────────────────────────────

def _now_kst() -> datetime:
    try:
        return datetime.now(timezone(timedelta(hours=9)))
    except Exception:
        # 폴백: UTC로라도 반환
        return datetime.utcnow().replace(tzinfo=timezone.utc)


def _now_kst_str(fmt: str = "%Y-%m-%d %H:%M:%S %Z") -> str:
    try:
        return _now_kst().strftime(fmt)
    except Exception:
        # 폴백
        try:
            return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        except Exception:
            return ""


# ─────────────────────────────────────────────
# status_board 업로드
# ─────────────────────────────────────────────

def post_status(
    db,
    cfg: dict,
    *,
    source_title: str,
    raw_text: str,
    vendor: str = "0",
    ts: Optional[str] = None
) -> str:
    """
    status_board에 1건 업로드.
      - mapping.raw: 원문
      - rules.source_title: 채널/방 제목
      - vendor: 벤더코드(문자열) 혹은 업체명
      - ts: 문자열 KST (인간가독), createdAt: 서버타임스탬프(정렬/신뢰)
    """
    if db is None:
        return ""
    try:
        col = cfg.get("firestore", {}).get("status_collection", "status_board")
        ref = db.collection(col).document()
        data = {
            "mapping": {"raw": str(raw_text or "")},
            "rules": {"source_title": str(source_title or "")},
            "vendor": str(vendor or "0"),
            "ts": ts or _now_kst_str(),
        }
        # 서버 타임스탬프(가능하면)
        try:
            data["createdAt"] = firestore.SERVER_TIMESTAMP
        except Exception:
            data["createdAt"] = _now_kst()

        ref.set(data)
        return ref.id
    except Exception as e:
        print("[Firestore] post_status failed:", e)
        return ""


# ─────────────────────────────────────────────
# rooms_biz/<doc>/messages 추가
# ─────────────────────────────────────────────

def post_rooms_biz_message(
    db,
    *,
    room_biz_id: str,
    text: str,
    author_email: str = "gangtalk815@gmail.com",
    author_uid: str = "serviceAccount"
) -> str:
    """
    rooms_biz/<room_biz_id>/messages에 1건 업로드.
      - createdAt: 서버타임스탬프(가능하면) + KST 폴백
    """
    if db is None:
        return ""
    try:
        rbid = str(room_biz_id or "").strip()
        if not rbid:
            print("[Firestore] post_rooms_biz_message skipped: empty room_biz_id")
            return ""

        ref = db.collection("rooms_biz").document(rbid).collection("messages").document()

        data = {
            "author": str(author_email or ""),
            "authorUid": str(author_uid or ""),
            "kind": "paste",
            "text": str(text or ""),
        }
        # 서버 타임스탬프 + 폴백
        try:
            data["createdAt"] = firestore.SERVER_TIMESTAMP
        except Exception:
            data["createdAt"] = _now_kst()

        ref.set(data)
        return ref.id
    except Exception as e:
        print("[Firestore] post_rooms_biz_message failed:", e)
        return ""


def touch_rooms_biz_root(db, *, room_biz_id: str, last_text_preview: str = "") -> None:
    """rooms_biz 루트에 최근 붙여넣기 메타 업데이트(선택)."""
    if db is None:
        return
    try:
        rbid = str(room_biz_id or "").strip()
        if not rbid:
            print("[Firestore] touch_rooms_biz_root skipped: empty room_biz_id")
            return

        root = db.collection("rooms_biz").document(rbid)
        data = {"lastPastedText": str(last_text_preview or "")}
        try:
            data["lastPastedAt"] = firestore.SERVER_TIMESTAMP
        except Exception:
            data["lastPastedAt"] = _now_kst()
        root.set(data, merge=True)
    except Exception as e:
        print("[Firestore] touch_rooms_biz_root failed:", e)


# ─────────────────────────────────────────────
# Firestore에서 업체·rooms_biz 자동 로드 (config에 stores가 없을 때만 사용)
# 반환 예: [{ name:"레.이.블", aliases:["레.이.블","레이블","레 이 블"], room_biz_id:"...", vendor:"0" }, ...]
# ─────────────────────────────────────────────

_DEF_VENDOR = "0"

def _mk_aliases(name: str) -> List[str]:
    base = (name or "").strip()
    if not base:
        return []
    # 다양한 형태 파생
    stripped = re.sub(r"[^\w가-힣]", "", base)  # 기호 제거
    no_dots = base.replace(".", "")
    spaced  = base.replace(".", " ")
    # 글자 수가 너무 길면 과한 중점 삽입을 피함
    mid_dots = "·".join(list(no_dots)) if len(no_dots) <= 6 else no_dots

    uniq: List[str] = []
    for v in [base, no_dots, spaced, stripped, mid_dots]:
        v = (v or "").strip()
        if v and v not in uniq:
            uniq.append(v)
    return uniq


def fetch_store_index(db) -> List[Dict]:
    """
    config에 stores가 비어있을 때 Firestore에서 룸/업체 인덱스를 동적으로 로드.
    - stores 컬렉션(name/title) → id_to_name 매핑
    - rooms_biz 컬렉션을 스캔하며 storeName/storeId/vendor를 수집
    - name 기반으로 다양한 aliases 생성(_mk_aliases)
    반환: [{ "name": str, "aliases": [..], "room_biz_id": str, "vendor": str }, ...]
    """
    if db is None:
        return []

    # 1) stores → id -> name
    id_to_name: Dict[str, str] = {}
    try:
        for d in db.collection("stores").stream():
            x = d.to_dict() or {}
            nm = str(x.get("name") or x.get("title") or "").strip()
            if nm:
                id_to_name[str(d.id)] = nm
    except Exception as e:
        print("[index] stores scan error:", e)

    # 2) rooms_biz 스캔
    out: List[Dict] = []
    try:
        for d in db.collection("rooms_biz").stream():
            x = d.to_dict() or {}
            rb_id = str(d.id)
            nm = str(x.get("storeName") or "").strip()
            sid = str(x.get("storeId") or "").strip()
            if not nm and sid and sid in id_to_name:
                nm = id_to_name[sid]
            if not nm:
                continue
            aliases = _mk_aliases(nm)
            vendor = str(x.get("vendor", _DEF_VENDOR))
            out.append({
                "name": nm,
                "aliases": aliases,
                "room_biz_id": rb_id,
                "vendor": vendor,
            })
    except Exception as e:
        print("[index] rooms_biz scan error:", e)

    return out
