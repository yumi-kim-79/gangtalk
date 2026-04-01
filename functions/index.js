// Node 20, Firebase Functions v2 (CommonJS)
const admin = require("firebase-admin");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2/options");

// ===== 외부 모듈 =====
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");
// ✅ [추가] CoolSMS 문자 인증 SDK
const coolsms = require("coolsms-node-sdk").default;
// ===== Admin 초기화 / Firestore =====
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

// ===== 전역 옵션 =====
setGlobalOptions({
  region: "asia-northeast3",
  timeoutSeconds: 60,
  memoryMiB: 256,
});

/* =========================================================
   공통 유틸
========================================================= */
function safeStr(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  try { return String(v); } catch { return ""; }
}
function safeId(str = "") {
  return String(str).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
}
function tsToIso(v) {
  try {
    if (v && typeof v.toDate === "function") return v.toDate().toISOString();
    if (v && typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
  } catch (_) {}
  return new Date().toISOString();
}
const now = () => new Date().toISOString();

/* =========================================================
   ★ 초톡 집계 유틸 (메시지 파싱/동기화/디바운스)
========================================================= */

// ★ 파싱 규칙 개선:
//   - '호실': 본문 어디에 있든 3자리 숫자(105, 218, 333 등)를 "고유 개수"로 카운트
//   - '필요인원': 본문 내 "N명" 패턴을 전부 합산 (예: "333 때매 5명", "456 콜 10명" → 15)
//   - 이모지/특수문자/잡텍스트는 무시
function parseCounts(text = "") {
  const body = String(text || "");

  // 3자리 호실 고유 카운트
  const roomNums = new Set();
  const roomMatches = body.match(/\b[1-9]\d{2}\b/g);
  if (roomMatches) {
    for (const r of roomMatches) roomNums.add(r);
  }

  // "N명" 전부 합산
  let needSum = 0;
  const needMatches = body.match(/(\d+)\s*명/g);
  if (needMatches) {
    for (const m of needMatches) {
      const n = parseInt(m.replace(/[^0-9]/g, ""), 10);
      if (!Number.isNaN(n)) needSum += n;
    }
  }

  return { roomCount: roomNums.size, needSum };
}

// roomId에서 bizId 유추(e.g., labels_room_01 -> labels)
function bizFromRoomId(roomId = "") {
  const m = String(roomId || "").match(/^([a-z0-9_-]+?)_room_/i);
  return m ? m[1].toLowerCase() : "";
}

// 간단 디바운스: meta/{key} 문서를 이용해 5초 내 중복 계산 방지
function debounceKey(bizId) { return `debounce_rooms_biz_${bizId}`; }
async function tryAcquireDebounce(bizId, ttlMs = 5000) {
  const key = debounceKey(bizId);
  const ref = db.collection("meta").doc(key);
  const nowMs = Date.now();
  const snap = await ref.get();
  const due = snap.exists ? Number(snap.get("until") || 0) : 0;
  if (due > nowMs) return false;
  await ref.set({
    until: nowMs + ttlMs,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return true;
}

// /stores/{id} 동기화(있을 때만)
async function syncStores(bizId, match, persons) {
  const sRef = db.collection("stores").doc(bizId);
  const s = await sRef.get();
  if (!s.exists) return;
  await sRef.set({
    match,
    persons,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// ★ 혼잡도 "점수" 계산 (요청 정의 반영)
//   - score = 맞출방(matchedRooms) + 필요인원(needPeople)
//   - label 은 기본 "보통" (카테고리별 상대 비교는 별도 함수에서 처리)
function computeCongestion(matchedRooms, needPeople) {
  const mr = Math.max(Number(matchedRooms) || 0, 0);
  const np = Math.max(Number(needPeople) || 0, 0);
  const score = mr + np;
  return {
    label: "보통",       // 실제 좋음/나쁨은 카테고리별 재계산에서 결정
    score
  };
}

/* =========================================================
   문자 인증 (CoolSMS)
========================================================= */

// CoolSMS 환경변수( .env 에 반드시 추가 )
// COOLSMS_API_KEY=xxxx
// COOLSMS_API_SECRET=xxxx
// COOLSMS_SENDER=01012345678
const smsClient = new coolsms(
  process.env.COOLSMS_API_KEY,
  process.env.COOLSMS_API_SECRET
);

// 문자 인증번호 발송
exports.sendSmsCode = onCall(async (req) => {
  // 1) 파라미터 정리/검증
  const rawPhone = safeStr(req.data?.phone || "");
  const phone = rawPhone.replace(/[^0-9]/g, "");
  if (!/^\d{10,11}$/.test(phone)) {
    throw new HttpsError("invalid-argument", "휴대폰 번호를 정확히 입력해 주세요.");
  }

  // 2) 6자리 코드 생성 + Firestore 저장
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6자리

  await db.collection("smsAuth").doc(phone).set({
    code,
    createdAt: admin.firestore.Timestamp.now(),
    validUntil: admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 60 * 1000),
  });

  // 3) 환경변수 유무 체크 (개발/테스트 환경에서 키가 없으면 실제 발송 스킵)
  const hasSmsEnv =
    !!process.env.COOLSMS_API_KEY &&
    !!process.env.COOLSMS_API_SECRET &&
    !!process.env.COOLSMS_SENDER;

  if (!hasSmsEnv) {
    console.log(
      "[sendSmsCode] COOLSMS env 없음 → 실제 발송 없이 mock 성공 처리. phone:",
      phone,
      "code:",
      code
    );
    // 프론트에서는 정상 발송처럼 보이게
    return { ok: true, mock: true };
  }

  // 4) 실제 SMS 발송 (CoolSMS)
  try {
    await smsClient.sendOne({
      to: phone,
      from: process.env.COOLSMS_SENDER,
      text: `[GangTalk] 인증번호는 ${code} 입니다. (3분 이내 입력)`,
    });

    console.log("[sendSmsCode] SMS sent:", phone);
    return { ok: true };
  } catch (err) {
    console.error("[sendSmsCode] SMS provider error:", err);

    const msg = String(err?.message || "");

    // ✅ 잔액 부족일 때: 명확하게 알려주기
    if (msg.includes("NotEnoughBalance")) {
      throw new HttpsError(
        "resource-exhausted",
        "sms-balance-empty"  // 클라이언트에서 구분용
      );
    }

    // 그 외는 일반 내부 오류
    throw new HttpsError("internal", "sms-send-failed");
  }
});

// 문자 인증번호 검증 (createdAt + 3분 기준으로 만료 판단)
exports.verifySmsCode = onCall(async (req) => {
  const rawPhone = safeStr(req.data?.phone || "");
  const phone = rawPhone.replace(/[^0-9]/g, ""); // 항상 숫자만 사용
  const code = safeStr(req.data?.code || "");

  if (!phone || !code) {
    throw new HttpsError("invalid-argument", "phone + code required");
  }

  const snap = await db.collection("smsAuth").doc(phone).get();
  if (!snap.exists) {
    console.log("[verifySmsCode] no request for phone:", phone);
    return { ok: false, reason: "no_request" };
  }

  const d = snap.data() || {};
  const expected = safeStr(d.code || "");

  // 코드 불일치
  if (expected !== code) {
    console.log("[verifySmsCode] wrong code:", {
      phone,
      expect: expected,
      got: code,
    });
    return { ok: false, reason: "wrong_code" };
  }

  // ───────── 만료시간 계산: createdAt + 3분 (validUntil 은 보조용) ─────────
  const asMillis = (v) => {
    if (!v) return null;
    try {
      if (typeof v.toMillis === "function") return v.toMillis();
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    } catch {
      return null;
    }
  };

  const createdMs = asMillis(d.createdAt);
  const validUntilMs = asMillis(d.validUntil);
  const nowMs = Date.now();
  const TTL = 3 * 60 * 1000; // 3분

  // 기본은 createdAt + 3분, 없으면 validUntil 그대로 사용
  let expiresMs = null;
  if (createdMs != null) {
    expiresMs = createdMs + TTL;
  } else if (validUntilMs != null) {
    expiresMs = validUntilMs;
  }

  console.log("[verifySmsCode] time check:", {
    phone,
    nowMs,
    createdMs,
    validUntilMs,
    expiresMs,
  });

  if (expiresMs != null && nowMs > expiresMs) {
    console.log("[verifySmsCode] expired:", phone);
    return { ok: false, reason: "expired" };
  }

  // ───────── 성공 시: 인증 기록 삭제 ─────────
  await db.collection("smsAuth").doc(phone).delete();
  console.log("[verifySmsCode] ok:", phone);

  return { ok: true };
});

/* 이메일 중복 체크 */
exports.checkEmailDuplicate = onCall(async (req) => {
  const raw = safeStr(req.data?.email || "");
  if (!raw) throw new HttpsError("invalid-argument", "email required");

  const email = raw.toLowerCase();
  let exists = false;

  // 1️⃣ Firebase Authentication 기준으로 먼저 검사
  try {
    // 이메일을 소문자로 저장하지 않았어도 getUserByEmail 이 알아서 처리
    const userRecord = await admin.auth().getUserByEmail(email);
    if (userRecord && userRecord.uid) {
      exists = true;
    }
  } catch (e) {
    // auth/user-not-found 는 정상 케이스(없는 이메일) → 무시
    if (e?.code !== "auth/user-not-found") {
      console.warn("[checkEmailDuplicate] auth lookup error:", e);
    }
  }

  // 2️⃣ Auth 에 없을 때만 Firestore users 컬렉션도 확인
  if (!exists) {
    const queries = [
      db.collection("users").where("email", "==", raw).limit(1).get(),
      db.collection("users").where("email", "==", email).limit(1).get(),
      db.collection("users").where("profile.email", "==", raw).limit(1).get(),
      db.collection("users").where("profile.email", "==", email).limit(1).get(),
    ];

    const snaps = await Promise.all(queries);
    exists = snaps.some((s) => !s.empty);
  }

  return { exists };
});

/* 닉네임 중복 체크 */
exports.checkNicknameDuplicate = onCall(async (req) => {
  const nick = safeStr(req.data?.nick || "");
  if (!nick) throw new HttpsError("invalid-argument", "nick required");

  const snap = await db
    .collection("users")
    .where("profile.nickname", "==", nick)
    .limit(1)
    .get();

  return { exists: !snap.empty };
});

/* =========================================================
   추천인/포인트 유틸
========================================================= */
function pickAuthorUid(data = {}) {
  return String(data.authorUid || data.authorId || "").trim() || null;
}

// ✅ 유저 문서 안에 흩어져 있는 추천 관련 필드를 한 번에 읽어오기
function readReferral(user = {}) {
  const nested  = user.referral || {};
  const profile = user.profile || {};

  // 내가 누구 코드로 가입했는지
  const refBy =
    nested.refBy ||          // referral.refBy
    user.refBy ||            // 최상위 refBy
    profile.refBy ||         // profile.refBy
    profile.refCode ||       // profile.refCode (프론트에서 이렇게만 넣었을 수도 있음)
    user.refCode ||          // 최상위 refCode
    null;

  // 내 추천코드(친구에게 줄 코드)
  const myCode =
    nested.myCode ||         // referral.myCode
    user.myCode ||           // 최상위 myCode
    profile.myCode ||        // profile.myCode
    profile.referralCode ||  // profile.referralCode
    null;

  // 추천 1회 적용 여부
  const refApplied = Boolean(
    nested.refApplied ??
    user.refApplied ??
    profile.refApplied
  );

  return { refBy, myCode, refApplied };
}

async function addPointsOnce({ uid, amount, reason, key, meta = {} }) {
  if (!uid || !amount) return;
  const userRef = db.collection("users").doc(String(uid));
  const logId = safeId(key || `${reason}_${Date.now()}`);
  const logRef = userRef.collection("point_logs").doc(logId);

  await db.runTransaction(async (tx) => {
    const logSnap = await tx.get(logRef);
    if (logSnap.exists) return;

    tx.set(logRef, {
      amount,
      reason,
      key,
      meta,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(
      userRef,
      {
        points: admin.firestore.FieldValue.increment(amount),
        serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  });
}
async function getPointConfig() {
  try {
    const snap = await db.collection("config").doc("points").get();
    const d = snap.exists ? (snap.data() || {}) : {};
    return {
      // ✅ 추천 포인트 (기존 로직 그대로)
      referralBonus: Number(d.referralBonus ?? 20000),

      // ✅ 추천 리워드 기준 금액(없으면 referralBonus 와 동일하게 사용)
      referralRewardBase: Number(d.referralRewardBase ?? d.referralBonus ?? 20000),

      postCreate: Number(d.postCreate ?? d["postCreate"] ?? 500),
      commentCreate: Number(d.commentCreate ?? 100),
      bestPost: Number(d.bestPost ?? 3000),
      bestComment: Number(d.bestComment ?? 2000),
    };
  } catch {
    return {
      referralBonus: 20000,
      referralRewardBase: 20000,
      postCreate: 500,
      commentCreate: 100,
      bestPost: 3000,
      bestComment: 2000,
    };
  }
}
// ✅ 랜덤 추천코드 생성 (중복 방지)
const REF_CODE_LEN = 8;
const REF_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/1/O/I 제외

function makeRandomCode(len = REF_CODE_LEN) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += REF_CODE_CHARS.charAt(Math.floor(Math.random() * REF_CODE_CHARS.length));
  }
  return out;
}

async function generateUniqueReferralCode() {
  // 중복이 없을 때까지 반복 (실제 충돌 확률은 매우 낮음)
  for (;;) {
    const code = makeRandomCode();
    const q1 = await db.collection("users").where("referral.myCode", "==", code).limit(1).get();
    if (!q1.empty) continue;
    const q2 = await db.collection("users").where("myCode", "==", code).limit(1).get();
    if (!q2.empty) continue;
    return code;
  }
}

/**
 * ✅ 유저 문서에 myCode / referral.myCode 가 없으면 생성
 *  - 이미 있으면 그대로 유지
 *  - 생성 후 해당 코드를 반환
 */
async function ensureMyReferralCode(uid, userData = {}) {
  const ref = userData.referral || {};
  const existing = ref.myCode || userData.myCode;
  if (existing) return existing;

  const newCode = await generateUniqueReferralCode();

  await db.collection("users").doc(uid).set(
    {
      myCode: newCode,
      referral: { ...ref, myCode: newCode },
      serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  console.log("[Referral] generated myCode for user", uid, newCode);
  return newCode;
}

// ✅ 추천인 역할별 리워드 비율
//  - 여성회원: 30%
//  - 기업회원: 30%
//  - 관리자:   20%
//  - 그 외:    30% (디폴트)
function getRoleAndRate(userData = {}) {
  const type   = safeStr(userData.type || userData.profile?.type).toLowerCase();
  const kind   = safeStr(userData.accountKind || userData.profile?.accountKind).toLowerCase();
  const gender = safeStr(userData.gender || userData.profile?.gender).toLowerCase();

  // 여성회원: gender 가 female / f / "여" 계열
  if (gender && (/^f(emale)?$/i.test(gender) || /여/.test(gender))) {
    return { role: "female", rate: 0.30 };
  }

  // 기업회원: company 또는 storeOwner / partnerOwner
  if (type === "company" || kind === "storeowner" || kind === "partnerowner") {
    return { role: "company", rate: 0.30 };
  }

  // 관리자: admin
  if (type === "admin" || kind === "admin") {
    return { role: "admin", rate: 0.20 };
  }

  // 기본값: 일반회원도 30%
  return { role: "default", rate: 0.30 };
}

// ✅ 추천코드로 추천인 찾기
//  - 대소문자 구분 없이
//  - 여러 필드(referral.myCode, myCode, profile.myCode, profile.referralCode, profile.refCode)를 모두 검사
async function findReferrerByCode(code) {
  const raw = safeStr(code);
  if (!raw) return null;

  // 대소문자 변형 후보들 (중복 제거)
  const variants = Array.from(
    new Set([raw, raw.toUpperCase(), raw.toLowerCase()].filter(Boolean))
  );

  // 코드가 저장되어 있을 수 있는 필드들
  const fields = [
    "referral.myCode",
    "myCode",
    "profile.myCode",
    "profile.referralCode",
    "profile.refCode",
  ];

  for (const v of variants) {
    for (const f of fields) {
      try {
        const qs = await db
          .collection("users")
          .where(f, "==", v)
          .limit(1)
          .get();

        if (!qs.empty) {
          console.log("[Referral] referrer found", {
            code: raw,
            matchedCode: v,
            field: f,
            uid: qs.docs[0].id,
          });
          return qs.docs[0];
        }
      } catch (e) {
        console.warn("[Referral] findReferrerByCode query error", { field: f, code: v }, e);
      }
    }
  }

  console.log("[Referral] referrer not found for code", raw);
  return null;
}

async function markRefApplied(uid, currentUser) {
  const ref = currentUser?.referral || {};
  await db.collection("users").doc(uid).set(
    {
      referral: { ...ref, refApplied: true },
      serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
async function migrateReferral(uid, code) {
  await db.collection("users").doc(uid).set(
    {
      referral: { refBy: String(code || "").trim(), refApplied: false },
      serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
async function payReferral(uid, refBy, currentUser) {
  const cfg = await getPointConfig();

  // 1) 추천인 찾기
  const referrerDoc = await findReferrerByCode(refBy);
  if (!referrerDoc) return;

  const referrerUid  = referrerDoc.id;
  const referrerData = referrerDoc.data() || {};
  if (referrerUid === uid) return; // 자기 자신 추천 방지

  // 2) 기본 추천 포인트 (기존 로직 그대로)
  const bonus = Number(cfg.referralBonus || 0);

  // 3) 추천인 역할별 리워드 계산
  const { role, rate } = getRoleAndRate(referrerData);
  const rewardBase     = Number(cfg.referralRewardBase || cfg.referralBonus || 0);
  const rewardAmount   = Math.round(rewardBase * rate);
  const incReward      = admin.firestore.FieldValue.increment(rewardAmount);

  // 4) 리워드 업데이트(추천인에게만) - users.reward + profile.reward 둘 다 올려줌
  const rewardUpdatePromise =
    rewardAmount > 0
      ? db.collection("users").doc(referrerUid).set(
          {
            reward: incReward,
            "profile.reward": incReward,        // 프로필 안에서도 확인 가능하게
            rewardRole: role,                   // 선택: 마지막 리워드 롤 정보
            serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: Date.now(),
          },
          { merge: true }
        )
      : Promise.resolve();

  await Promise.all([
    // 신규 가입자 포인트
    addPointsOnce({
      uid,
      amount: bonus,
      reason: "referral_self",
      key: `referral:self:${refBy}`,
      meta: { refBy },
    }),

    // 추천인 포인트
    addPointsOnce({
      uid: referrerUid,
      amount: bonus,
      reason: "referral_friend",
      key: `referral:friend:${uid}`,
      meta: { newUserId: uid },
    }),

    // 추천 코드 1회 적용 플래그
    markRefApplied(uid, currentUser),

    // 추천인 리워드 적립
    rewardUpdatePromise,
  ]);

  console.log("[Referral] paid referral point & reward", {
    newUserId: uid,
    referrerUid,
    role,
    rate,
    rewardBase,
    rewardAmount,
  });
}

/* =========================================================
   알림(푸시 + 이메일 + 인앱)
========================================================= */
// Gmail OAuth2 secrets
const GMAIL_CLIENT_ID = defineSecret("GMAIL_CLIENT_ID");
const GMAIL_CLIENT_SECRET = defineSecret("GMAIL_CLIENT_SECRET");
const GMAIL_REFRESH_TOKEN = defineSecret("GMAIL_REFRESH_TOKEN");

const GMAIL_FROM = "gangtalk815@gmail.com";
const GMAIL_TO = "gangtalk815@gmail.com";

async function sendEmail(subject, html, text) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: GMAIL_FROM,
        clientId: GMAIL_CLIENT_ID.value(),
        clientSecret: GMAIL_CLIENT_SECRET.value(),
        refreshToken: GMAIL_REFRESH_TOKEN.value(),
      },
    });

    await transporter.sendMail({
      from: GMAIL_FROM,
      to: GMAIL_TO,
      subject: subject || "[GangTalk] 신규 신청",
      text: text || "",
      html: html || (text ? `<pre>${text}</pre>` : ""),
    });

    console.log("✅ Gmail 메일 전송 완료:", subject);
  } catch (error) {
    console.error("❌ Gmail 메일 전송 실패:", error);
  }
}

// ── FCM: 관리자 토픽 푸시
const ADMIN_TOPIC = "admin";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "gangtalk815@gmail.com").trim();

async function sendAdminPush({ title, body, data = {} }) {
  try {
    const msg = {
      topic: ADMIN_TOPIC,
      notification: { title: safeStr(title), body: safeStr(body) },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), safeStr(v)])),
    };
    await admin.messaging().send(msg);
    console.log(`✅ [FCM] 토픽 "${ADMIN_TOPIC}" 전송 OK @ ${now()} | ${title}`);
  } catch (e) {
    console.error("❌ [FCM] push error:", e);
  }
}

/** ▶ 인앱 알림: 관리자 전체 fan-out */
async function notifyAdmins({ title, body, data = {} }) {
  const adminsSnap = await db.collection("admins").get();
  if (adminsSnap.empty) {
    console.log("[notifyAdmins] admins 컬렉션이 비어있습니다.");
    return;
  }

  const batch = db.batch();
  const nowTs = admin.firestore.FieldValue.serverTimestamp();

  adminsSnap.forEach((a) => {
    const uid = a.id;
    const ref = db.collection("users").doc(uid).collection("notifications").doc();
    batch.set(ref, { title, body, data, type: "system_event", read: false, createdAt: nowTs });
  });

  await batch.commit();
  console.log(`✅ [notifyAdmins] ${adminsSnap.size}건 fan-out 완료`);
}

/* =========================================================
   사용자 생성/수정 트리거 (추천인 보너스)
========================================================= */
exports.onUserCreatedReferralBonus = onDocumentCreated(
  "users/{uid}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const uid  = event.params.uid;
    const data = snap.data() || {};

    // 1) 내 추천코드(myCode)가 없으면 생성
    const myCode = await ensureMyReferralCode(uid, data);

    // 2) 가입 시 같이 들어온 추천인 코드(refBy) 읽기
    const { refBy, refApplied } = readReferral(data);

    console.log("[Referral:onCreate]", {
      uid,
      refBy,
      refApplied,
      myCode,
    });

    // 추천 코드가 없거나 이미 적용된 상태면 패스
    if (!refBy || refApplied) return;

    // 3) 추천 포인트/리워드 지급 (신규가입자 + 추천인 모두)
    await payReferral(uid, refBy, data);
  }
);

exports.onUserReferralApplied = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const uid = event.params.uid;

  // ✅ 추천코드가 아직 없는 기존 유저도 여기서 생성
  await ensureMyReferralCode(uid, after);

  const b = readReferral(before);
  const a = readReferral(after);

  if (a.refApplied) return;

  if (a.refBy && a.refBy !== b.refBy) {
    await payReferral(uid, a.refBy, after);
    return;
  }

  if (!a.refBy && after.refBy && after.refBy !== before.refBy) {
    await migrateReferral(uid, after.refBy);
    await payReferral(uid, after.refBy, after);
  }
});

/* =========================================================
   호출형: 즉시 적용
========================================================= */
exports.applyReferralNow = onCall(async (req) => {
  const auth = req.auth;
  if (!auth?.uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const refCode = String(req.data?.refCode || "").trim();
  if (!refCode) throw new HttpsError("invalid-argument", "refCode가 없습니다.");

  const userRef = db.collection("users").doc(auth.uid);
  const userSnap = await userRef.get();
  const user = userSnap.exists ? (userSnap.data() || {}) : {};

  // ✅ 내 코드 없으면 여기서도 생성
  await ensureMyReferralCode(auth.uid, user);

  const { refApplied } = readReferral(user);
  if (refApplied) return { ok: true, already: true };

  await migrateReferral(auth.uid, refCode);
  await payReferral(auth.uid, refCode, user);

  return { ok: true };
});

// ✅ 내 추천인 / 추천 내역 조회 (Callable)
exports.loadReferralInfo = onCall(async (req) => {
  const auth = req.auth;
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const uid = auth.uid;

  // 1) 내 유저 문서 읽기
  const userSnap = await db.collection("users").doc(uid).get();
  const user = userSnap.exists ? (userSnap.data() || {}) : {};

  // ▶ 위에서 확장한 readReferral 공통 사용
  const { refBy, myCode } = readReferral(user);
  const refByCode = safeStr(refBy || "");
  const myCodeVal = safeStr(myCode || "");

  // 2) 나를 추천한 사람
  let referrer = null;
  if (refByCode) {
    const q1 = await db
      .collection("users")
      .where("referral.myCode", "==", refByCode)
      .limit(1)
      .get();
    if (!q1.empty) {
      const doc = q1.docs[0];
      const data = doc.data() || {};
      const p = data.profile || {};
      const r = data.referral || {};
      referrer = {
        id: doc.id,
        nickname: safeStr(
          p.nickname || p.nick || data.nick || data.name || ""
        ),
        name: safeStr(p.name || data.name || ""),
        email: safeStr(p.email || data.email || ""),
        code: safeStr(r.myCode || data.myCode || ""),
      };
    }
  }

  // 3) 내 코드로 가입한 사람들
  let referred = [];
  if (myCodeVal) {
    const q2 = await db
      .collection("users")
      .where("referral.refBy", "==", myCodeVal)
      .get();

    referred = q2.docs.map((doc) => {
      const data = doc.data() || {};
      const p = data.profile || {};
      const r = data.referral || {};
      return {
        id: doc.id,
        nickname: safeStr(
          p.nickname || p.nick || data.nick || data.name || ""
        ),
        name: safeStr(p.name || data.name || ""),
        email: safeStr(p.email || data.email || ""),
        code: safeStr(r.myCode || data.myCode || ""),
      };
    });
  }

  return {
    referrer,
    referred,
    refByCode: refByCode || null,
    myCode: myCodeVal || null,
  };
});

/* =========================================================
   글/댓글/베스트 포인트
========================================================= */
async function payPostCreatePoint(event, collectionHint = "") {
  const postId = event.params.postId;
  const data = event.data.data() || {};
  const cfg = await getPointConfig();

  let uid = pickAuthorUid(data);
  if (!uid) {
    try {
      const snap = await db.collection(collectionHint || "board_posts").doc(postId).get();
      uid = pickAuthorUid(snap.data() || {});
    } catch (_) {}
  }

  if (!uid) return;
  await addPointsOnce({
    uid,
    amount: Number(cfg.postCreate || 0),
    reason: "postCreate",
    key: `postCreate:${postId}`,
    meta: { postId },
  });
}
exports.onPostCreated_board = onDocumentCreated("board_posts/{postId}", async (event) => {
  await payPostCreatePoint(event, "board_posts");
});
exports.onPostCreated_legacy = onDocumentCreated("posts/{postId}", async (event) => {
  await payPostCreatePoint(event, "posts");
});

async function payCommentCreatePoint(event, hint = "") {
  const { postId, commentId } = event.params;
  const data = event.data.data() || {};
  const cfg = await getPointConfig();
  const uid = pickAuthorUid(data);

  if (!uid) return;
  await addPointsOnce({
    uid,
    amount: Number(cfg.commentCreate || 0),
    reason: "commentCreate",
    key: `commentCreate:${postId || "flat"}:${commentId}`,
    meta: { postId, commentId },
  });
}
exports.onCommentCreated_board = onDocumentCreated(
  "board_posts/{postId}/comments/{commentId}",
  async (event) => {
    await payCommentCreatePoint(event, "board_posts/*/comments");
  }
);
exports.onCommentCreatedFlat = onDocumentCreated("comments/{commentId}", async (event) => {
  await payCommentCreatePoint(event, "comments");
});

function turnedBest(before, after) {
  return !!before?.isBest === false && !!after?.isBest === true;
}
async function payBestPost(event, hint = "") {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  if (!turnedBest(before, after)) return;

  const cfg = await getPointConfig();
  const uid = pickAuthorUid(after);
  if (!uid) return;

  await addPointsOnce({
    uid,
    amount: Number(cfg.bestPost || 0),
    reason: "bestPost",
    key: `bestPost:${event.params.postId}`,
    meta: { postId: event.params.postId },
  });
}
exports.onPostBestPicked_board = onDocumentUpdated("board_posts/{postId}", async (e) =>
  payBestPost(e, "board_posts")
);
exports.onPostBestPicked_legacy = onDocumentUpdated("posts/{postId}", async (e) =>
  payBestPost(e, "posts")
);

async function payBestComment(event, hint = "") {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  if (!turnedBest(before, after)) return;

  const cfg = await getPointConfig();
  const uid = pickAuthorUid(after);
  const { postId, commentId } = event.params;
  if (!uid) return;

  await addPointsOnce({
    uid,
    amount: Number(cfg.bestComment || 0),
    reason: "bestComment",
    key: `bestComment:${postId || "flat"}:${commentId}`,
    meta: { postId, commentId },
  });
}
exports.onCommentBestPicked_board = onDocumentUpdated(
  "board_posts/{postId}/comments/{commentId}",
  async (e) => await payBestComment(e, "board_posts/*/comments")
);
exports.onCommentBestPickedFlat = onDocumentUpdated("comments/{commentId}", async (event) => {
  await payBestComment(event, "comments");
});

/* =========================================================
   운영 시드 스케줄러
========================================================= */
const SEED_DEFAULT = {
  enabled: true,
  timezone: "Asia/Seoul",
  categories: {
    daily: { dailyCap: 8, minGapSec: 1800, maxGapSec: 5400 },
    suggest: { dailyCap: 3, minGapSec: 2400, maxGapSec: 7200 },
    pledge: { dailyCap: 4, minGapSec: 2400, maxGapSec: 7200 },
    travel: { dailyCap: 4, minGapSec: 2400, maxGapSec: 7200 },
    health: { dailyCap: 4, minGapSec: 2400, maxGapSec: 7200 },
    quote: { dailyCap: 5, minGapSec: 1200, maxGapSec: 5400 },
  },
  comments: { initialMin: 0, initialMax: 2 },
  scheduleDocPath: "seeder/schedule",
};
const SEED_LIB = {
  daily: {
    titles: ["오늘의 소확행", "점심 뭐 드셨어요?", "퇴근 후 루틴", "가성비 꿀팁 공유"],
    bodies: ["작은 행복 공유해요 😊", "점심 추천 부탁! 사진도 환영입니다", "퇴근 후 30분 루틴 추천해봐요", "이번 주에 알게 된 꿀팁 한 줄!"],
    comments: ["좋아요!", "공유 감사합니다 🙌", "저도 해볼래요", "사진 기대합니다"],
  },
  suggest: {
    titles: ["이 기능 어떤가요?", "가게전용 보완 아이디어", "검색 개선 제안"],
    bodies: ["필요하신 점 편하게 남겨주세요 🙏", "운영팀이 확인 후 검토합니다"],
    comments: ["좋은 제안이네요", "검토해볼게요", "감사합니다"],
  },
  pledge: {
    titles: ["이번 주 다짐", "하루 10분 루틴", "작게 꾸준히"],
    bodies: ["함께 하면 더 쉬워요 💪", "댓글로 서로 응원해요"],
    comments: ["화이팅!", "응원합니다", "저도 동참"],
  },
  travel: {
    titles: ["주말 근교 드라이브", "가을 캠핑 스팟 추천", "숨은 카페 소개"],
    bodies: ["서울 근교 드라이브 코스 추천받아요", "선선할 때 캠핑 최고죠!", "뷰 좋은 카페 아시나요?"],
    comments: ["양평 추천!", "남양주 리버뷰 카페 좋아요", "캠핑엔 라면이죠"],
  },
  health: {
    titles: ["목/어깨 스트레칭 추천", "아침 공복 물 1컵", "수면 루틴 공유"],
    bodies: ["목 아픈 분들 이 동작 추천해요", "물 섭취 중요해요", "취침 1시간 전 폰 금지, 효과 좋아요"],
    comments: ["따라해볼게요!", "정보 감사해요", "저장합니다"],
  },
  quote: {
    titles: ["오늘의 문장", "짧은 명언 한 줄", "위로가 되는 말"],
    bodies: ["천천히 가도 괜찮아. 멈추지 않는다면.", "작지만 확실한 한 걸음.", "어제보다 나은 오늘이 되길."],
    comments: ["좋은 말이네요", "위로가 됩니다", "저장합니다"],
  },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rint = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const nowMs = () => Date.now();
const nextGapMs = (min, max) => rint(min, max) * 1000;

async function readSeedCfg() {
  const snap = await db.doc("seeder/config").get();
  return snap.exists ? { ...SEED_DEFAULT, ...snap.data() } : SEED_DEFAULT;
}
async function readSched(path) {
  const s = await db.doc(path).get();
  return s.exists ? (s.data() || {}) : {};
}
async function writeSched(path, d) {
  await db.doc(path).set(d, { merge: true });
}
function startOfTodayMs(tz) {
  const iso = new Date().toLocaleString("sv-SE", { timeZone: tz }).replace(" ", "T");
  const t = new Date(iso);
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}
exports.tickSeeder = onSchedule(
  {
    schedule: "* * * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    const cfg = await readSeedCfg();
    if (!cfg.enabled) return;

    const sched = await readSched(cfg.scheduleDocPath);
    const cats = Object.keys(cfg.categories);

    for (const cat of cats) {
      const rule = cfg.categories[cat];
      const nextKey = `next_${cat}`;
      if (nowMs() < Number(sched[nextKey] || 0)) continue;

      const since = startOfTodayMs(cfg.timezone);
      const cntSnap = await db
        .collection("board_posts")
        .where("category", "==", cat)
        .where("isSeed", "==", true)
        .where("createdAtMs", ">=", since)
        .count()
        .get();
      if ((cntSnap.data().count || 0) >= rule.dailyCap) {
        sched[nextKey] = nowMs() + nextGapMs(rule.minGapSec, rule.maxGapSec);
        continue;
      }

      const t = nowMs();
      const title = pick(SEED_LIB[cat]?.titles || SEED_LIB.daily.titles);
      const body = pick(SEED_LIB[cat]?.bodies || SEED_LIB.daily.bodies);

      const ref = await db.collection("board_posts").add({
        category: cat,
        title,
        subtitle: "",
        body,
        content: body,
        views: 0,
        likes: 0,
        cmtCount: 0,
        author: "운영팀",
        authorUid: "seed-admin",
        isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: t,
        updatedAtMs: t,
      });

      const n = rint(cfg.comments.initialMin, Math.max(cfg.comments.initialMin, cfg.comments.initialMax));
      if (n > 0) {
        const batch = db.batch();
        const col = ref.collection("comments");
        for (let i = 0; i < n; i++) {
          batch.set(col.doc(), {
            body: pick(SEED_LIB[cat]?.comments || SEED_LIB.daily.comments),
            author: "운영팀",
            authorUid: "seed-admin",
            isSeed: true,
            parentId: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAtMs: t,
            updatedAtMs: t,
          });
        }
        batch.update(ref, {
          cmtCount: admin.firestore.FieldValue.increment(n),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: t,
        });
        await batch.commit();
      }

      sched[nextKey] = nowMs() + nextGapMs(rule.minGapSec, rule.maxGapSec);
    }

    await writeSched(cfg.scheduleDocPath, sched);
  }
);
// === [추가] 초톡 텍스트 줄바꿈 정규화 ===
// - CRLF → LF
// - "——— n층 ———" 전후 줄바꿈 보장
// - " 공백 + 3~4자리 숫자(호실)" 앞에 줄바꿈 삽입
// - 과도한 연속 개행 압축
function normalizeChotalkText(s = "") {
  let t = String(s || "");

  // 줄바꿈 통일
  t = t.replace(/\r\n?/g, "\n");

  // 층 구분 라인 강조: "——— 1층 ———" 형태를 단독 라인으로
  t = t.replace(/ *—+\s*(\d+)\s*층\s*—+ */g, (m, f) => `\n——— ${f}층 ———\n`);

  // 호실(3~4자리 숫자) 앞에 줄바꿈 삽입
  //  - 날짜 "10일", "09월" 등은 건드리지 않기 위해 '3~4자리'만 대상으로
  t = t.replace(/(\s)(\d{3,4}\b)/g, "\n$2");

  // 다중 공백/개행 정리
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{2,}/g, "\n");

  return t.trim();
}

/* =========================================================
   Sheets 업로드 인증 유틸
========================================================= */
async function assertSharedSecret(req) {
  const incoming = String(req.get("x-shared-secret") || "").trim();
  const secret = (process.env.SHEETS_SHARED_SECRET || "").trim();
  if (secret && incoming !== secret) {
    const err = new Error("Invalid shared secret");
    err.code = 401;
    throw err;
  }
}

// vendors/{vendorId}.savedToken 과 비교
async function assertVendor(req) {
  const vendorId = String(req.get("x-vendor-id") || "").trim();
  const vendorToken = String(req.get("x-vendor-token") || "").trim();

  if (!vendorId || !vendorToken) {
    const err = new Error("Missing vendor headers");
    err.code = 400;
    throw err;
  }
  const snap = await db.collection("vendors").doc(vendorId).get();
  if (!snap.exists) {
    const err = new Error("Unknown vendor");
    err.code = 401;
    throw err;
  }
  if (String(snap.get("savedToken") || "").trim() !== vendorToken) {
    const err = new Error("Unauthorized vendor");
    err.code = 401;
    throw err;
  }
  return vendorId;
}

/* =========================================================
   ★ 업체 현황 다이제스트 → 초톡방 자동 게시 (새 경로 규칙)
========================================================= */

// 한국 시간 날짜 포맷(예: 09월 10일 수요일)
function fmtKSTDate(d = new Date()) {
  const z = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).format(d);
  return z;
}

// 벤더 메타 읽기 (chatRoomId = roomId, 없으면 {vendorId}_room_01)
async function readVendorMeta(vendorId) {
  const ref = db.collection("vendors").doc(vendorId);
  const snap = await ref.get();
  const d = snap.exists ? (snap.data() || {}) : {};
  return {
    name: safeStr(d.name || vendorId),
    address: safeStr(d.address || ""),
    chatRoomId: safeStr(d.chatRoomId || d.roomBizId || ""), // 예: labels_room_01
    cooldownUntilMs: Number(d.digestCooldownUntilMs || 0),
    ref,
  };
}

// 다이제스트 문자열 + 합계 생성 (vendors/{vendorId}/status/* 수집)
async function buildVendorDigest(vendorId) {
  const meta = await readVendorMeta(vendorId);
  const statusSnap = await db.collection("vendors").doc(vendorId).collection("status").get();

  const byFloor = {};
  let totalRooms = 0, totalNeeded = 0, totalCurrent = 0, matchedRooms = 0;
  let totalRemaining = 0; // ★ 남은 필요인원 합계

  statusSnap.forEach((doc) => {
    const d = doc.data() || {};
    const floor = Number(d.floor || 0);
    const room = safeStr(d.room);
    if (!floor || !room) return;

    const needed = Number(d.needed) || 0;   // 구글시트 '필요인원' 그대로
    const current = Number(d.current) || 0;
    const remaining = Number(d.remaining ?? Math.max(needed - current, 0));
    const staff = Array.isArray(d.staff) ? d.staff.filter(Boolean).map(safeStr) : [];
    const matchRoom = !!d.matchRoom;
    const manager = safeStr(d.manager || d.owner || "");

    totalRooms += 1;
    totalNeeded += needed;       // ✔ 필요인원 합계
    totalCurrent += current;
    totalRemaining += remaining; // (참고용)
    if (matchRoom) matchedRooms += 1;

    if (!byFloor[floor]) byFloor[floor] = [];
    // ✔ needed 를 같이 저장
    byFloor[floor].push({ room, needed, remaining, staff, matchRoom, manager });
  });

  // ✔ 이제 score = 맞출방 + "필요인원(전체)"
  const { label: congestionLabel, score: congestionScore } = computeCongestion(
    matchedRooms,
    totalNeeded
  );

  const head = [
    `💰💰💰 ${meta.name} 💰💰💰`,
    `🥃 ${fmtKSTDate(new Date())}`,
  ];
  if (meta.address) head.push(meta.address);

  const body = [];
  const floors = Object.keys(byFloor).map(n => Number(n)).sort((a,b)=>a-b);

  for (const f of floors) {
    body.push(`\n——— ${f}층 ———`);
    const rows = byFloor[f].sort((a,b) => {
      const na = parseInt(a.room.replace(/\D/g,"")) || 0;
      const nb = parseInt(b.room.replace(/\D/g,"")) || 0;
      return na - nb;
    });

    for (const r of rows) {
      const std = r.matchRoom ? " 기준" : "";
      const mgr = r.manager ? ` ${r.manager}` : "";
      const need = ` ㅃ${Math.max(Number(r.needed || 0), 0)}`;  // ✔ 필요인원 그대로
      const staff = r.staff.length ? ` ${r.staff.join(" ")}` : "";
      body.push(`${r.room}${std}${mgr}${need}${staff}`.trim());
    }
  }

  const tail = [
    `\n요약: 총방수 ${totalRooms}, 총인원 ${totalCurrent}, 혼잡도 ‘${congestionLabel}’`,
  ];

  const message = [...head, ...body, ...tail].join("\n").replace(/\n{3,}/g, "\n\n");
  return {
    message,
    meta,
    totals: {
      totalRooms,
      totalNeeded,
      totalCurrent,
      totalRemaining,
      matchedRooms,
      congestionLabel,
      congestionScore,
    },
    congestion: congestionLabel
  };
}

// 다이제스트 전송 + 헤더 동기화
async function postVendorDigest(vendorId) {
  const { message, meta, totals, congestion } = await buildVendorDigest(vendorId);

  // ✅ roomId 결정 규칙
  //   1) vendors.chatRoomId / roomBizId 가 이미 있으면 그대로 사용 (예: 'labels_room_01')
  //   2) 없고 vendorId 가 'xxx_sheet' 로 끝나면 → 'xxx_room_01' 로 매핑
  //   3) 그 외에는 기본 `${vendorId}_room_01`
  let roomId = "";
  if (meta.chatRoomId && meta.chatRoomId.includes("_room_")) {
    roomId = meta.chatRoomId;
  } else {
    const baseVendor = vendorId.endsWith("_sheet")
      ? vendorId.replace(/_sheet$/, "")
      : vendorId;
    roomId = `${baseVendor}_room_01`;
  }

  // ✅ 실제 메시지 경로: /rooms_biz/{bizId}/rooms/{roomId}/messages
  //    - bizId : labels_room_01 ➜ labels 처럼 업체 키
  const bizId = bizFromRoomId(roomId) || vendorId;

  const roomRef = db
    .collection("rooms_biz")
    .doc(bizId)
    .collection("rooms")
    .doc(roomId);

  const msgsRef = roomRef.collection("messages");

  const nowTs = admin.firestore.FieldValue.serverTimestamp();
  const nowMsNum = Date.now();

  const msgDoc = {
    text: message,
    body: message,
    kind: "text",
    type: "paste",
    isSystem: false,
    author: "초톡봇",
    authorUid: "system-bot",
    nickname: "초톡봇",
    senderUid: "system-bot",
    uid: "system-bot",
    roomId,
    createdAt: nowTs,
    updatedAt: nowTs,
    createdAtMs: nowMsNum,
    updatedAtMs: nowMsNum,
    meta: { vendorId, source: "vendor-digest" }
  };
  const msgRef = await msgsRef.add(msgDoc);

  // ✅ 헤더는 roomId 에서 bizId 추출(bizFromRoomId) 해서 기록
  const bizIdForHeader = bizFromRoomId(roomId) || vendorId;

  // ▶ 헤더 숫자/혼잡도 동기화: /rooms_biz/{bizIdForHeader}
  await db.collection("rooms_biz").doc(bizIdForHeader).set(
    {
      lastPastedText: message,
      lastPasteMsgId: msgRef.id,
      lastPastedAt: nowTs,
      needRooms: totals.matchedRooms,        // 맞출방
      needPeople: totals.totalNeeded,        // ✔ 필요인원(전체 합계)
      curPeople: totals.totalCurrent,        // 현재 인원(참고)
      congestion,                            // 좋음/보통/나쁨(점수 기반)
      congestionScore: totals.congestionScore,
      updatedAt: nowTs,
      // 레거시 키 미러링
      matched: totals.matchedRooms,
      need: totals.totalNeeded,
      joined: totals.totalCurrent
    },
    { merge: true }
  );

  const baseVendorId = bizIdForHeader.endsWith("_sheet")
    ? bizIdForHeader.replace(/_sheet$/, "")
    : bizIdForHeader;
  // ✔ stores.persons 도 필요인원 합계로 동기화
  await syncStores(baseVendorId, totals.matchedRooms, totals.totalNeeded);

  // 30초 쿨다운
  await db.collection("vendors").doc(vendorId)
    .set({ digestCooldownUntilMs: Date.now() + 30_000 }, { merge: true });

  console.log(`📨 digest → rooms_biz/${bizId}/rooms/${roomId}/messages/${msgRef.id}`);
  return { ok: true, vendorId, roomId, msgId: msgRef.id };
}

async function maybePostVendorDigest(vendorId) {
  const meta = await readVendorMeta(vendorId);
  if (Date.now() < meta.cooldownUntilMs) {
    console.log(`[digest] cooldown active for ${vendorId} until ${meta.cooldownUntilMs}`);
    return;
  }
  await postVendorDigest(vendorId);
}

/* =========================================================
   PASS 연동 API (Express)
========================================================= */
const PASS_CFG = {
  baseUrl:
    process.env.BASE_URL ||
    (process.env.FUNCTIONS_EMULATOR ? "http://localhost:5173" : "https://gangtalk815.com"),
  passVendorUrl: process.env.PASS_VENDOR_URL || "",
  passSiteCode: process.env.PASS_SITE_CODE || "",
  passSitePass: process.env.PASS_SITE_PASS || "",
};
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const sessRef = (txId) => db.collection("pass_sessions").doc(txId);

app.post("/pass/start", async (req, res) => {
  try {
    const txId = uuidv4().replace(/-/g, "");
    await sessRef(txId).set(
      { status: "pending", purpose: String(req.body?.purpose || ""), createdAt: Date.now() },
      { merge: true }
    );

    const authUrl = `${PASS_CFG.baseUrl}/api/pass/mock?txId=${encodeURIComponent(txId)}`;
    res.json({ txId, authUrl });
  } catch (e) {
    console.error("PASS start error:", e?.response?.data || e);
    res.status(500).send("start 실패");
  }
});

app.get("/pass/status", async (req, res) => {
  try {
    const txId = String(req.query.txId || "");
    if (!txId) return res.status(400).json({ error: "txId required" });
    const doc = await sessRef(txId).get();
    if (!doc.exists) return res.json({ done: false });

    const d = doc.data();
    const done = d.status === "done" || d.status === "failed";
    res.json({
      done,
      ok: d.status === "done",
      gender: d.gender || null,
      name: d.name || "",
      birth: d.birth || "",
      phone: d.phone || "",
      diHash: d.diHash || "",
      verifiedAt: d.verifiedAt || 0,
    });
  } catch (e) {
    console.error("PASS status error:", e);
    res.status(500).send("status 실패");
  }
});

app.get("/pass/callback", async (req, res) => {
  try {
    const txId = String(req.query.txId || req.body?.txId || "");
    if (!txId) return res.status(400).send("txId required");

    const result = {
      status: "done",
      gender: "F",
      name: "홍길순",
      birth: "19940101",
      phone: "01012345678",
      diHash: "mock-di-" + txId,
      verifiedAt: Date.now(),
    };
    await sessRef(txId).set(result, { merge: true });

    const closePage = `${PASS_CFG.baseUrl}/pass-complete.html?txId=${encodeURIComponent(txId)}`;
    res.redirect(closePage);
  } catch (e) {
    console.error("PASS callback error:", e);
    res.status(500).send("callback 실패");
  }
});

app.get("/pass/mock", async (req, res) => {
  const txId = String(req.query.txId || "");
  const callbackUrl = `${PASS_CFG.baseUrl}/api/pass/callback?txId=${encodeURIComponent(txId)}`;
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <!doctype html>
    <meta charset="utf-8" />
    <title>PASS 모의 인증</title>
    <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
      <h3>PASS 모의 인증 페이지</h3>
      <p>txId: ${txId}</p>
      <p>3초 후 결과를 콜백으로 전송합니다…</p>
      <script>setTimeout(()=>{ location.href='${callbackUrl}'; }, 3000);</script>
    </body>
  `);
});

// ─────────────────────────────────────────────
// Sheets → vendors 상태 업데이트
// ─────────────────────────────────────────────
app.post("/sheets/vendors/update", async (req, res) => {
  try {
    await assertSharedSecret(req);
    const vendorId = await assertVendor(req);

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const totalsIn = req.body?.totals || null;

    if (!rows.length) {
      return res.status(400).json({ ok: false, error: "No rows" });
    }

    // (1) 방 상태 저장
    const batch = db.batch();
    const nowTs = admin.firestore.FieldValue.serverTimestamp();

    for (const r of rows) {
      const floor = Number(r.floor) || 0;
      const room = String(r.room || "").trim();
      if (!floor || !room) continue;

      const docId = `F${floor}__R${room}`;
      const ref = db.collection("vendors").doc(vendorId).collection("status").doc(docId);

      batch.set(ref, {
        floor,
        room,
        needed: Number(r.needed) || 0,
        current: Number(r.current) || 0,
        remaining: Number(r.remaining) || 0,
        matchRoom: !!r.matchRoom,
        staff: Array.isArray(r.staff) ? r.staff : [],
        congestion: safeStr(r.congestion || ""),
        updatedAt: nowTs,
      }, { merge: true });
    }

    // (2) 합계 계산
    let totalRooms, totalNeeded, totalCurrent, totalRemaining;
    if (totalsIn && typeof totalsIn === "object") {
      totalRooms = Number(totalsIn.totalRooms || 0);
      totalNeeded = Number(totalsIn.totalNeeded || 0);
      totalCurrent = Number(totalsIn.totalCurrent || 0);
      totalRemaining = Math.max(Number(totalsIn.totalRemaining ?? (totalNeeded - totalCurrent)) || 0, 0);
    } else {
      totalRooms = 0; totalNeeded = 0; totalCurrent = 0;
      for (const r of rows) {
        const need = Number(r.needed) || 0;
        const cur  = Number(r.current) || 0;
        if ((Number(r.floor)||0) && String(r.room||'').trim()) {
          totalRooms += 1;
          totalNeeded += need;
          totalCurrent += cur;
        }
      }
      totalRemaining = Math.max(totalNeeded - totalCurrent, 0);
    }

    // (3) vendors/{vendorId} 요약 저장
    const vendorRef = db.collection("vendors").doc(vendorId);
    batch.set(vendorRef, {
      totalRooms,
      totalNeeded,
      totalCurrent,
      totalRemaining,
      updatedAt: nowTs,
      serverUpdatedAt: nowTs,
    }, { merge: true });

    await batch.commit();

    // ✅ 업로드가 끝났으니 바로 다이제스트(초톡 메시지 + 헤더 숫자 동기화)
    await maybePostVendorDigest(vendorId);

    return res.json({
      ok: true,
      n: rows.length,
      vendorId,
      totals: { totalRooms, totalNeeded, totalCurrent, totalRemaining },
      digestPosted: true
    });

  } catch (e) {
    const code = e.code || 500;
    console.error("sheets/vendors/update error:", e);
    return res.status(code).json({ ok: false, error: String(e.message || e) });
  }
});

// ▶ 수동 다이제스트(Express 라우트)
app.post("/vendors/:vendorId/digest", async (req, res) => {
  try {
    await assertSharedSecret(req);
    const vendorId = safeId(req.params.vendorId || "");
    if (!vendorId) return res.status(400).json({ ok: false, error: "vendorId required" });
    await postVendorDigest(vendorId);
    res.json({ ok: true, vendorId });
  } catch (e) {
    console.error("digest route error:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

exports.api = onRequest(
  { region: "asia-northeast3", secrets: ["SHEETS_SHARED_SECRET"] },
  app
);

/* =========================================================
   ★ 신청 알림
========================================================= */
function buildAppPayload(id, d, typeFallback = "unknown") {
  const type = safeStr(d.type || d.kind || typeFallback);
  return {
    id,
    type,
    companyName: safeStr(d.companyName || d.name),
    contactName: safeStr(d.contactName),
    phone: safeStr(d.phone),
    email: safeStr(d.email),
    message: safeStr(d.message),
    createdByUid: safeStr(d.createdByUid || d.ownerId),
    createdByEmail: safeStr(d.createdByEmail),
    createdAt: tsToIso(d.createdAt),
    extra: d.extra || { category: safeStr(d.category), address: safeStr(d.address) },
  };
}
function payloadLines(p) {
  return [
    `- 문서ID: ${p.id}`,
    `- 유형: ${p.type}`,
    `- 업체명: ${p.companyName || "-"}`,
    `- 담당자: ${p.contactName || "-"}`,
    `- 연락처: ${p.phone || "-"}`,
    `- 이메일: ${p.email || "-"}`,
    `- 작성자: ${p.createdByEmail || p.createdByUid || "-"}`,
    `- 생성시각: ${p.createdAt}`,
    p.message ? `- 메시지:\n${p.message}` : null,
    Object.keys(p.extra || {}).length ? `- 부가정보:\n${JSON.stringify(p.extra, null, 2)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

exports.onApplicationCreated = onDocumentCreated(
  {
    document: "applications/{docId}",
    region: "asia-northeast3",
    // ✅ 문자열 대신 defineSecret()으로 만든 객체를 넣어줌
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN],
  },
  async (event) => {
    const id = event.params.docId;
    const d = event.data?.data() || {};

    // ✅ 트리거가 실제로 실행되는지 확인용 로그
    console.log("🔥 [applications] onApplicationCreated fired:", id, d);

    const p = buildAppPayload(id, d);
    const title =
      p.type === "partner"
        ? "업체등록 신청 도착"
        : p.type === "store"
        ? "업체등록 신청 도착"
        : "신청 도착";

    const text = `🆕 ${title}\n${payloadLines(p)}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px;white-space:pre-wrap">${payloadLines(
      p
    )}</pre>`;

    const promises = [
      sendAdminPush({
        title,
        body: `${p.companyName || p.contactName || "신청자"} / ${p.phone || p.email || "-"}`,
        data: { docId: id, type: p.type },
      }),
      sendEmail(
        `[강남톡방] ${title} - ${p.companyName || p.contactName || id}`,
        html,
        text
      ),
      notifyAdmins({
        title,
        body: text,
        data: { kind: "applicationCreated", payload: p },
      }),
    ];

    await Promise.allSettled(promises);
    console.log(`📥 [applications] onCreate processed: ${id} @ ${now()}`);
  }
);

// ▶ 광고신청(ads)
exports.onAdCreated = onDocumentCreated(
  {
    document: "ads/{docId}",
    region: "asia-northeast3",
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN],
  },
  async (event) => {
    const id = event.params.docId;
    const d = event.data?.data() || {};
    const p = buildAppPayload(id, d, "ad");
    p.type = "ad";

    const title = "광고신청 도착";
    const text = `🆕 ${title}\n${payloadLines(p)}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px;white-space:pre-wrap">${payloadLines(
      p
    )}</pre>`;

    const promises = [
      sendAdminPush({
        title,
        body: `${p.companyName || "-"} / ${p.phone || p.email || "-"}`,
        data: { docId: id, type: p.type },
      }),
      sendEmail(`[강남톡방] ${title} - ${p.companyName || id}`, html, text),
      notifyAdmins({ title, body: text, data: { kind: "adCreated", payload: p } }),
    ];

    await Promise.allSettled(promises);
    console.log(`📥 [ads] onCreate processed: ${id} @ ${now()}`);
  }
);

/* ▶▶ 새로 추가: 법률상담 접수 알림 ◀◀ */
exports.onLegalConsultCreated = onDocumentCreated(
  {
    document: "legal_consults/{docId}",
    region: "asia-northeast3",
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN],
  },
  async (event) => {
    const id = event.params.docId;
    const d = event.data?.data() || {};

    console.log("📥 [legal_consults] onCreate fired:", id, d);

    const title = "새 법률상담 접수";

    const userName    = safeStr(d.userName);
    const summary     = safeStr(d.summary);
    const content     = safeStr(d.content);
    const writerEmail = safeStr(d.writerEmail);
    const writerUid   = safeStr(d.writerUid);
    const createdAt   = tsToIso(d.createdAt);

    const lines = [
      `- 문서ID: ${id}`,
      `- 의뢰인: ${userName || "-"}`,
      `- 연락 이메일: ${writerEmail || "-"}`,
      `- 작성자 UID: ${writerUid || "-"}`,
      `- 생성시각: ${createdAt}`,
      summary ? `- 요약: ${summary}` : null,
      content ? `- 상세 내용:\n${content}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const text = `🆕 ${title}\n${lines}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px;white-space:pre-wrap">${lines}</pre>`;

    try {
      await Promise.allSettled([
        // 🔔 관리자 푸시
        sendAdminPush({
          title,
          body: `${userName || "의뢰인"} / ${summary || (content || "").slice(0, 30) || "-"}`,
          data: { kind: "legalConsultCreated", id },
        }),
        // 📧 관리자 이메일 (GMAIL_TO = gangtalk815@gmail.com)
        sendEmail(`[강남톡방] ${title} - ${userName || id}`, html, text),
        // 📱 앱 내 알림(관리자 계정들)
        notifyAdmins({
          title,
          body: text,
          data: { kind: "legalConsultCreated", id },
        }),
      ]);

      console.log(`✅ [legal_consults] onCreate processed: ${id} @ ${now()}`);
    } catch (err) {
      console.error("❌ [legal_consults] 알림 처리 중 오류:", err);
    }
  }
);

/* =========================================================
   매장 등록/승인 알림
========================================================= */
function buildStorePayload(d, id) {
  return {
    id,
    name: safeStr(d.name),
    phone: safeStr(d.phone),
    address: safeStr(d.address),
    category: safeStr(d.category),
    contactName: safeStr(d.contactName || d.manager),
    createdByUid: safeStr(d.createdByUid || d.ownerId),
    createdByEmail: safeStr(d.createdByEmail),
    createdAt: tsToIso(d.createdAt),
  };
}
function payloadToTextLines(p) {
  return [
    `- 문서ID: ${p.id}`,
    `- 상호: ${p.name || "-"}`,
    `- 연락처: ${p.phone || "-"}`,
    `- 주소: ${p.address || "-"}`,
    `- 카테고리: ${p.category || "-"}`,
    `- 담당자: ${p.contactName || "-"}`,
    `- 작성자: ${p.createdByEmail || p.createdByUid || "-"}`,
    `- 생성시각: ${p.createdAt}`,
  ].join("\n");
}

// ★ 카테고리별 혼잡도 재계산 (하퍼/쩜오 등)
//   - 입력: category 문자열
//   - stores 에서 해당 카테고리 전부 읽어서 score = match + persons
//   - 그 카테고리 안에서 score 최댓값 → "좋음", 최솟값 → "나쁨", 나머지 "보통"
async function recomputeCategoryCongestion(category) {
  const cat = safeStr(category);
  if (!cat) return;

  const snap = await db.collection("stores").where("category", "==", cat).get();
  if (snap.empty) return;

  const all = [];
  const withData = [];

  snap.forEach((doc) => {
    const d = doc.data() || {};
    const match = Number(d.match || d.needRooms || 0) || 0;
    const persons = Number(d.persons || d.needPeople || 0) || 0;
    const score = Math.max(match, 0) + Math.max(persons, 0);
    const hasData = match > 0 || persons > 0;
    const row = { doc, score, hasData };
    all.push(row);
    if (hasData) withData.push(row);
  });

  let maxScore = -Infinity;
  let minScore = Infinity;

  if (withData.length > 0) {
    for (const r of withData) {
      if (r.score > maxScore) maxScore = r.score;
      if (r.score < minScore) minScore = r.score;
    }
  }

  const onlyOneOrSame = withData.length <= 1 || maxScore === minScore;

  const bw = db.bulkWriter();
  for (const row of all) {
    const { doc, score, hasData } = row;
    let label = "보통";

    if (hasData && !onlyOneOrSame) {
      if (score === maxScore) label = "좋음";
      else if (score === minScore) label = "나쁨";
    }

    // stores/{id}
    bw.set(
      doc.ref,
      {
        congestionLabel: label,
        congestionScore: score,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // rooms_biz/{id} 도 함께 반영 (bizId == storeId 기준)
    const bizId = doc.id;
    bw.set(
      db.collection("rooms_biz").doc(bizId),
      {
        category: cat,
        congestion: label,
        congestionScore: score,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await bw.close();
}

exports.fsStoreRequestCreated = onDocumentCreated(
  {
    document: "storeRequests/{id}",
    region: "asia-northeast3",
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN],
  },
  async (event) => {
    const d = event.data?.data() || {};
    const p = buildStorePayload(d, event.params.id);

    const title = "새 매장 등록 요청이 도착했습니다";
    const text = `🆕 ${title}\n${payloadToTextLines(p)}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px">${payloadToTextLines(p)}</pre>`;

    await Promise.allSettled([
      sendAdminPush({
        title,
        body: `${p.name || "-"} / ${p.phone || "-"}`,
        data: { kind: "storeRequestCreated", id: p.id },
      }),
      sendEmail(title, html, text),
      notifyAdmins({ title, body: text, data: { kind: "storeRequestCreated", payload: p } }),
    ]);

    console.log(`📥 [storeRequests] onCreate processed: ${p.id} @ ${now()}`);
  }
);

exports.fsStoreCreatedNotify = onDocumentCreated(
  {
    document: "stores/{storeId}",
    region: "asia-northeast3",
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN],
  },
  async (event) => {
    const d = event.data?.data() || {};
    const p = buildStorePayload(d, event.params.storeId);

    const title = "새 매장 등록";
    const text = `🆕 ${title}\n${payloadToTextLines(p)}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px">${payloadToTextLines(p)}</pre>`;

    await Promise.allSettled([
      sendAdminPush({
        title,
        body: `${p.name || "-"} / ${p.phone || "-"}`,
        data: { kind: "storeCreated", id: p.id },
      }),
      sendEmail(title, html, text),
      notifyAdmins({ title, body: text, data: { kind: "storeCreated", payload: p } }),
    ]);

    console.log(`📥 [stores] onCreate processed: ${p.id} @ ${now()}`);

    // ★ 새 매장 생성 시 해당 카테고리 기준으로 혼잡도 재계산
    if (p.category) {
      await recomputeCategoryCongestion(p.category);
    }
  }
);

exports.fsStorePendingRequest = onDocumentUpdated(
  {
    document: "stores/{storeId}",
    region: "asia-northeast3",
    secrets: [GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN],
  },
  async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};
    if (safeStr(before.status) === safeStr(after.status)) return;
    if (safeStr(after.status) !== "pending") return;

    const p = buildStorePayload(after, event.params.storeId);
    const title = "승인 신청 도착";
    const text = `📨 ${title}\n${payloadToTextLines(p)}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px">${payloadToTextLines(p)}</pre>`;

    await Promise.allSettled([
      sendAdminPush({
        title,
        body: `${p.name || "-"} / ${p.phone || "-"}`,
        data: { kind: "storePending", id: p.id },
      }),
      sendEmail(title, html, text),
      notifyAdmins({ title, body: text, data: { kind: "storePending", payload: p } }),
    ]);

    console.log(`📥 [stores] status 'pending' processed: ${p.id} @ ${now()}`);
  }
);

// ★ 매장 match/persons 변경 시 → 카테고리별 혼잡도 재계산
exports.fsStoreRecalcCongestion = onDocumentUpdated(
  {
    document: "stores/{storeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data.before.data() || {};
    const after = event.data.after.data() || {};

    // match / persons / category 가 안 변했으면 재계산 스킵 (루프 방지)
    const beforeMatch = Number(before.match || before.needRooms || 0) || 0;
    const afterMatch = Number(after.match || after.needRooms || 0) || 0;
    const beforePersons = Number(before.persons || before.needPeople || 0) || 0;
    const afterPersons = Number(after.persons || after.needPeople || 0) || 0;
    const beforeCat = safeStr(before.category);
    const afterCat = safeStr(after.category);

    if (
      beforeMatch === afterMatch &&
      beforePersons === afterPersons &&
      beforeCat === afterCat
    ) {
      return;
    }

    if (!afterCat) return;
    await recomputeCategoryCongestion(afterCat);
  }
);

/* =========================================================
   관리자 기기 푸시 구독 (Callable)
========================================================= */
exports.subscribeAdminToken = onCall(async (req) => {
  const token = safeStr(req.data?.token);
  if (!token) throw new HttpsError("invalid-argument", "token is required");

  const requesterEmail = (req.auth?.token?.email || "").toLowerCase();
  if (requesterEmail !== ADMIN_EMAIL.toLowerCase()) {
    throw new HttpsError("permission-denied", "관리자만 구독할 수 있습니다.");
  }
  try {
    await admin.messaging().subscribeToTopic([token], ADMIN_TOPIC);
    console.log(`✅ [FCM] '${requesterEmail}' → '${ADMIN_TOPIC}' 구독 OK @ ${now()}`);
    return { ok: true, topic: ADMIN_TOPIC };
  } catch (e) {
    console.error("❌ [FCM] subscribe error:", e);
    throw new HttpsError("internal", "구독 실패");
  }
});

// ─────────────────────────────────────────────
// Sheets → vendors 부트스트랩
// ─────────────────────────────────────────────
app.post("/sheets/vendors/bootstrap", async (req, res) => {
  try {
    await assertSharedSecret(req);

    const vendorId = safeId(req.body?.vendorId || "");
    if (!vendorId) return res.status(400).json({ ok: false, error: "vendorId required" });

    const name = safeStr(req.body?.name || vendorId);
    const sheetUrl = safeStr(req.body?.sheetUrl || "");

    const ref = db.collection("vendors").doc(vendorId);
    const snap = await ref.get();

    let savedToken;
    if (!snap.exists) {
      savedToken = uuidv4();
      await ref.set(
        {
          name,
          sheetUrl,
          savedToken,
          active: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      savedToken = safeStr(snap.get("savedToken"));
      if (!savedToken) {
        savedToken = uuidv4();
        await ref.set(
          {
            name,
            sheetUrl,
            savedToken,
            active: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    return res.json({ ok: true, vendorId, savedToken });
  } catch (e) {
    const code = e.code || 500;
    console.error("bootstrap error:", e);
    return res.status(code).json({ ok: false, error: String(e.message || e) });
  }
});

/* =========================================================
   다이제스트 HTTP 트리거 & FS 트리거
========================================================= */
exports.buildVendorDigest = onRequest(
  { region: "asia-northeast3", secrets: ["SHEETS_SHARED_SECRET"] },
  async (req, res) => {
    try {
      const incoming = String(req.get("x-shared-secret") || req.query.secret || "").trim();
      const secret = (process.env.SHEETS_SHARED_SECRET || "").trim();
      if (secret && incoming !== secret) return res.status(401).send("Unauthorized");

      const vendorId = safeId(req.body?.vendorId || req.query?.vendorId || "");
      if (!vendorId) return res.status(400).send("vendorId required");

      await postVendorDigest(vendorId);
      res.status(200).send({ ok: true, vendorId });
    } catch (e) {
      console.error("buildVendorDigest error:", e);
      res.status(500).send("Internal Error");
    }
  }
);

// 상태문서 생성/업데이트 시 자동 다이제스트(30초 쿨다운)
exports.onVendorStatusCreated = onDocumentCreated("vendors/{vendorId}/status/{docId}", async (event) => {
  const { vendorId } = event.params;
  await maybePostVendorDigest(vendorId);
});
exports.onVendorStatusUpdated = onDocumentUpdated("vendors/{vendorId}/status/{docId}", async (event) => {
  const { vendorId } = event.params;
  await maybePostVendorDigest(vendorId);
});

/* =========================================================
   ★ 초톡 메시지 onCreate → 헤더 자동 집계 (모든 경로 폴백)
   - rooms_biz/{bizId}/rooms/{roomId}/messages/{msgId}
   - chat_rooms/{roomId}/messages/{msgId}
   - rooms/{roomId}/messages/{msgId}
========================================================= */

function parseCountsV2(text = "") {
  const s = String(text || "");
  const lines = s.split(/\n+/);

  const seenRooms = new Set();
  let roomCount = 0;
  let totalNeed = 0;   // ✔ ㅃ숫자 = 필요인원 합계
  let estCurrent = 0;  // 이름(2~3글자) 개수로 추정한 현재 인원

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 요약/총방수 라인은 스킵
    if (/요약|총방수|총인원/.test(line)) continue;

    // 호실(3~4자리 숫자) 추출
    const mRoom = line.match(/\b(\d{3,4})\b/);
    if (!mRoom) continue;
    const roomNo = mRoom[1];

    if (!seenRooms.has(roomNo)) {
      seenRooms.add(roomNo);
      roomCount += 1;
    }

    // 'ㅃ숫자' → 필요인원
    let need = 0;
    const mNeed = line.match(/ㅃ\s*([0-9]+)/);
    if (mNeed) {
      const n = parseInt(mNeed[1], 10);
      if (!Number.isNaN(n)) need = n;
    }

    // 이름: 2~3글자 한글, 흔한 키워드는 제외
    const nameTokens = (line.match(/[가-힣]{2,3}/g) || []).filter(
      (w) => !/^(기준|요약|총방수|총인원)$/.test(w)
    );
    const cur = nameTokens.length;

    estCurrent += cur;
    totalNeed += need;
  }

  return { roomCount, totalNeed, estCurrent };
}

// ★ 파싱 강화 + 혼잡도 기록까지 함께 저장
async function handleMessageCreatedFromText(bizId, text) {
  const raw = String(text || "");
  if (!bizId || !raw.trim()) return;

  // 디바운스(동일 업체 5초 내 중복 방지)
  const ok = await tryAcquireDebounce(bizId, 5000);
  if (!ok) return;

  // ▶ 원문은 보존, 파싱은 정규화 텍스트로
  const normalized = normalizeChotalkText(raw);

  // === parseCountsV2 사용 (필요인원 합계를 totalNeed 로 리턴)
  const { roomCount, totalNeed, estCurrent } = parseCountsV2(normalized);

  // ✔ score = 맞출방 + 필요인원(전체)
  const { label, score } = computeCongestion(roomCount, totalNeed);

  const nowTs = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("rooms_biz").doc(bizId).set({
    // 화면 지표
    needRooms: roomCount,          // 맞출방(줄 수)
    needPeople: totalNeed,         // ✔ 필요인원 합
    congestion: label,             // 기본값: "보통"
    congestionScore: score,

    // 참고값
    totalNeeded: totalNeed,        // 필요인원 합계
    estCurrent,                    // 이름(2~3자) 카운트로 추정한 현재 합

    // 로그/디버그
    lastPastedTextRaw: raw.slice(0, 4000),
    lastPastedText: normalized.slice(0, 4000),
    lastPastedAt: nowTs,
    updatedAt: nowTs,

    // 레거시 호환
    matched: roomCount,
    need: totalNeed,
    joined: estCurrent,
  }, { merge: true });

  // stores 동기화(있을 때만) - match + persons(필요인원)
  await syncStores(bizId, roomCount, totalNeed);
}

// canonical
exports.onRoomsBizMessage = onDocumentCreated(
  // ✅ 정규 경로: rooms_biz/{bizId}/rooms/{roomId}/messages/{msgId}
  "rooms_biz/{bizId}/rooms/{roomId}/messages/{msgId}",
  async (event) => {
    const d = event.data?.data() || {};
    const { bizId } = event.params;
    if (!bizId) return;

    await handleMessageCreatedFromText(bizId, d.text || d.body || "");
  }
);

// legacy A
exports.onChatRoomsMessage = onDocumentCreated(
  "chat_rooms/{roomId}/messages/{msgId}",
  async (event) => {
    const d = event.data?.data() || {};
    const { roomId } = event.params;
    const bizId = bizFromRoomId(roomId) || "";
    if (!bizId) return;
    await handleMessageCreatedFromText(bizId, d.text || d.body || "");
  }
);

// legacy B
exports.onRoomsLegacyMessage = onDocumentCreated(
  "rooms/{roomId}/messages/{msgId}",
  async (event) => {
    const d = event.data?.data() || {};
    const { roomId } = event.params;
    const bizId = bizFromRoomId(roomId) || "";
    if (!bizId) return;
    await handleMessageCreatedFromText(bizId, d.text || d.body || "");
  }
);

/* =========================================================
   ★ 참가자 onCreate/onDelete → matched 자동 집계
========================================================= */
async function recomputeMatched(bizId) {
  const qs = await db.collection("rooms_biz").doc(bizId).collection("participants").get();
  const matched = qs.size;
  await db.collection("rooms_biz").doc(bizId).set({
    matched,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}
exports.onJoinAdded = onDocumentCreated(
  "rooms_biz/{bizId}/participants/{uid}",
  async (event) => { await recomputeMatched(event.params.bizId); }
);
exports.onJoinRemoved = onDocumentUpdated(
  "rooms_biz/{bizId}/participants/{uid}",
  async (event) => {
    // 삭제 트리거가 v2에 없으므로 update로 대체(필요시 rules로 soft delete 사용)
    const before = event.data.before.exists;
    const after = event.data.after.exists;
    if (before && !after) await recomputeMatched(event.params.bizId);
  }
);

/* =========================================================
   ★ 매일 07:00 리셋(옵션)
========================================================= */
exports.dailyReset0700 = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const col = db.collection("rooms_biz");
    const qs = await col.get();
    const bw = db.bulkWriter();
    const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
    for (const doc of qs.docs) {
      bw.set(doc.ref, {
        needRooms: 0,
        needPeople: 0,
        matched: 0,
        lastResetDate: today,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    await bw.close();
    return null;
  }
);
/* =========================================================
   ★ 매일 07:05 이전 날짜 다이제스트 메시지 정리
   - 대상: meta.source === 'vendor-digest' 인 messages
   - 기준: createdAtMs < 오늘 00:00 (Asia/Seoul)
   - 효과: 초톡 현황판에서 예전 날짜 메시지가 쌓이지 않음
========================================================= */
exports.cleanupOldVendorDigests = onSchedule(
  { schedule: "5 7 * * *", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    try {
      const tz = "Asia/Seoul";
      // 오늘 00:00 기준 ms
      const todayStartMs = startOfTodayMs(tz);
      // 🔁 컷오프를 "전날 00:00" 으로 변경 (어제 0시 이전 것만 삭제)
      const cutoffMs = todayStartMs - 24 * 60 * 60 * 1000;

      // rooms_biz / chat_rooms / rooms 경로에 있는 messages 중
      // meta.source === 'vendor-digest' && createdAtMs < cutoffMs 인 것만 삭제
      const qs = await db
        .collectionGroup("messages")
        .where("meta.source", "==", "vendor-digest")
        .where("createdAtMs", "<", cutoffMs)
        .get();

      console.log(`[cleanupOldVendorDigests] found ${qs.size} old digest messages to delete`);

      if (qs.empty) return null;

      const bw = db.bulkWriter();
      qs.docs.forEach((doc) => {
        bw.delete(doc.ref);
      });
      await bw.close();

      console.log("[cleanupOldVendorDigests] cleanup completed");
      return null;
    } catch (e) {
      console.error("[cleanupOldVendorDigests] error:", e);
      return null;
    }
  }
);
