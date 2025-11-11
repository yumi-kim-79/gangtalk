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

// 텍스트 파서: “행의 맨 앞 숫자 = 호실”을 방 1개로 보고,
// 그 행의 ‘첫 숫자’(있으면)를 필요인원으로 누적
function parseCounts(text = "") {
  const lines = String(text || "").split(/\r?\n/);
  let roomCount = 0;
  let needSum = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m1 = line.match(/^\s*(\d{1,4})\b/); // 호실 패턴
    if (!m1) continue;
    roomCount += 1;
    const after = line.slice(m1[0].length);
    const m2 = after.match(/(\d+)/);
    if (m2) {
      const n = Number(m2[1]);
      if (!Number.isNaN(n)) needSum += n;
    }
  }
  return { roomCount, needSum };
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

/* =========================================================
   추천인/포인트 유틸
========================================================= */
function pickAuthorUid(data = {}) {
  return String(data.authorUid || data.authorId || "").trim() || null;
}
function readReferral(user = {}) {
  const nested = user.referral || {};
  const refBy = nested.refBy || user.refBy || null;
  const myCode = nested.myCode || user.myCode || null;
  const refApplied = Boolean(nested.refApplied ?? user.refApplied);
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
      referralBonus: Number(d.referralBonus ?? 20000),
      postCreate: Number(d.postCreate ?? d["postCreate"] ?? 500),
      commentCreate: Number(d.commentCreate ?? 100),
      bestPost: Number(d.bestPost ?? 3000),
      bestComment: Number(d.bestComment ?? 2000),
    };
  } catch {
    return { referralBonus: 20000, postCreate: 500, commentCreate: 100, bestPost: 3000, bestComment: 2000 };
  }
}
async function findReferrerByCode(code) {
  const c = String(code || "").trim();
  if (!c) return null;

  let q = await db.collection("users").where("referral.myCode", "==", c).limit(1).get();
  if (!q.empty) return q.docs[0];

  q = await db.collection("users").where("myCode", "==", c).limit(1).get();
  if (!q.empty) return q.docs[0];

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
  const referrerDoc = await findReferrerByCode(refBy);
  if (!referrerDoc) return;

  const referrerUid = referrerDoc.id;
  if (referrerUid === uid) return;

  const bonus = Number(cfg.referralBonus || 0);

  await Promise.all([
    addPointsOnce({
      uid,
      amount: bonus,
      reason: "referral_self",
      key: `referral:self:${refBy}`,
      meta: { refBy },
    }),
    addPointsOnce({
      uid: referrerUid,
      amount: bonus,
      reason: "referral_friend",
      key: `referral:friend:${uid}`,
      meta: { newUserId: uid },
    }),
    markRefApplied(uid, currentUser),
  ]);
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
exports.onUserCreatedReferralBonus = onDocumentCreated("users/{uid}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data() || {};
  const uid = event.params.uid;

  const { refBy, refApplied } = readReferral(data);
  if (!refBy || refApplied) return;

  await payReferral(uid, refBy, data);
});

exports.onUserReferralApplied = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const uid = event.params.uid;

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

  const { refApplied } = readReferral(user);
  if (refApplied) return { ok: true, already: true };

  await migrateReferral(auth.uid, refCode);
  await payReferral(auth.uid, refCode, user);

  return { ok: true };
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
    comments: ["따라해볼게요!", "정보 감사해요", "진짜 중요하죠"],
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

  statusSnap.forEach((doc) => {
    const d = doc.data() || {};
    const floor = Number(d.floor || 0);
    const room = safeStr(d.room);
    if (!floor || !room) return;

    const needed = Number(d.needed) || 0;
    const current = Number(d.current ?? (Array.isArray(d.staff) ? d.staff.length : 0));
    const remaining = Number(d.remaining ?? Math.max(needed - current, 0));
    const staff = Array.isArray(d.staff) ? d.staff.filter(Boolean).map(safeStr) : [];
    const matchRoom = !!d.matchRoom;
    const manager = safeStr(d.manager || d.owner || "");

    totalRooms += 1;
    totalNeeded += needed;
    totalCurrent += current;
    if (matchRoom) matchedRooms += 1;

    if (!byFloor[floor]) byFloor[floor] = [];
    byFloor[floor].push({ room, remaining, staff, matchRoom, manager });
  });

  const ratio = totalNeeded ? totalCurrent / totalNeeded : 0;
  const congestion = ratio <= 0.6 ? "여유" : (ratio <= 0.85 ? "보통" : "나쁨");

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
      const lack = ` ㅃ${Math.max(Number(r.remaining||0),0)}`;
      const staff = r.staff.length ? ` ${r.staff.join(" ")}` : "";
      body.push(`${r.room}${std}${mgr}${lack}${staff}`.trim());
    }
  }

  const tail = [
    `\n요약: 총방수 ${totalRooms}, 총인원 ${totalCurrent}, 혼잡도 ‘${congestion}’`,
  ];

  const message = [...head, ...body, ...tail].join("\n").replace(/\n{3,}/g, "\n\n");
  return {
    message,
    meta,
    totals: { totalRooms, totalNeeded, totalCurrent, matchedRooms },
    congestion
  };
}

// 다이제스트 전송 + 헤더 동기화
async function postVendorDigest(vendorId) {
  const { message, meta, totals, congestion } = await buildVendorDigest(vendorId);

  // roomId 결정: vendors.chatRoomId(예: labels_room_01) 없으면 기본값
  const roomId = (meta.chatRoomId && meta.chatRoomId.includes("_room_"))
    ? meta.chatRoomId
    : `${vendorId}_room_01`;

  // 메시지 경로: /rooms_biz/{vendorId}/rooms/{roomId}/messages
  const roomRef = db.collection("rooms_biz").doc(vendorId).collection("rooms").doc(roomId);
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

  // ▶ 헤더 숫자/혼잡도 동기화: /rooms_biz/{vendorId}
  await db.collection("rooms_biz").doc(vendorId).set(
    {
      lastPastedText: message,
      lastPasteMsgId: msgRef.id,
      lastPastedAt: nowTs,
      needRooms: totals.matchedRooms,   // 맞출방
      needPeople: totals.totalNeeded,   // 필요인원
      curPeople: totals.totalCurrent,   // 현재 인원(참고)
      congestion,
      updatedAt: nowTs,
      // 레거시 키 미러링
      matched: totals.matchedRooms,
      need: totals.totalNeeded,
      joined: totals.totalCurrent
    },
    { merge: true }
  );

  // 30초 쿨다운
  await db.collection("vendors").doc(vendorId)
    .set({ digestCooldownUntilMs: Date.now() + 30_000 }, { merge: true });

  console.log(`📨 digest → rooms_biz/${vendorId}/rooms/${roomId}/messages/${msgRef.id}`);
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
    secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
  },
  async (event) => {
    const id = event.params.docId;
    const d = event.data?.data() || {};
    const p = buildAppPayload(id, d);
    const title = p.type === "partner" ? "업체등록 신청 도착" : p.type === "store" ? "업체등록 신청 도착" : "신청 도착";

    const text = `🆕 ${title}\n${payloadLines(p)}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px;white-space:pre-wrap">${payloadLines(p)}</pre>`;

    const promises = [
      sendAdminPush({
        title,
        body: `${p.companyName || p.contactName || "신청자"} / ${p.phone || p.email || "-"}`,
        data: { docId: id, type: p.type },
      }),
      sendEmail(`[강남톡방] ${title} - ${p.companyName || p.contactName || id}`, html, text),
      notifyAdmins({ title, body: text, data: { kind: "applicationCreated", payload: p } }),
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
    secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
  },
  async (event) => {
    const id = event.params.docId;
    const d = event.data?.data() || {};
    const p = buildAppPayload(id, d, "ad");
    p.type = "ad";

    const title = "광고신청 도착";
    const text = `🆕 ${title}\n${payloadLines(p)}`;
    const html = `<h2>${title}</h2><pre style="font-size:14px;white-space:pre-wrap">${payloadLines(p)}</pre>`;

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

exports.fsStoreRequestCreated = onDocumentCreated(
  {
    document: "storeRequests/{id}",
    region: "asia-northeast3",
    secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
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
    secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
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
  }
);

exports.fsStorePendingRequest = onDocumentUpdated(
  {
    document: "stores/{storeId}",
    region: "asia-northeast3",
    secrets: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
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

async function handleMessageCreatedFromText(bizId, text) {
  const body = String(text || "");
  if (!bizId || !body.trim()) return;

  // 연속 붙여넣기 디바운스
  const ok = await tryAcquireDebounce(bizId, 5000);
  if (!ok) return;

  const { roomCount, needSum } = parseCounts(body);

  // /rooms_biz/{bizId} 헤더 갱신
  await db.collection("rooms_biz").doc(bizId).set({
    needRooms: roomCount,
    needPeople: needSum,
    lastPastedText: body.slice(0, 2000),
    lastPastedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // /stores/{bizId} 동기화(있을 때만)
  await syncStores(bizId, roomCount, needSum);
}

// canonical
exports.onRoomsBizMessage = onDocumentCreated(
  "rooms_biz/{bizId}/rooms/{roomId}/messages/{msgId}",
  async (event) => {
    const d = event.data?.data() || {};
    const { bizId } = event.params;
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
