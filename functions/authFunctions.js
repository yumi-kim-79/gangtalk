// functions/authFunctions.js
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");

// Firestore
const db = admin.firestore();

/* =========================================================
   환경변수(.env)에 다음 이름으로 넣어야 함:
   COOLSMS_API_KEY=...
   COOLSMS_API_SECRET=...
   COOLSMS_SENDER=01012345678  (발신번호 승인된 번호)
========================================================= */
const apiKey    = process.env.COOLSMS_API_KEY;
const apiSecret = process.env.COOLSMS_API_SECRET;
const sender    = process.env.COOLSMS_SENDER;

// CoolSMS SDK
const CoolSMS = require("coolsms-node-sdk").default;
const smsClient = new CoolSMS(apiKey, apiSecret);

/* =========================================================
   이메일 중복 체크
========================================================= */
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

/* =========================================================
   닉네임 중복 체크
========================================================= */
exports.checkNickDuplicate = onCall(async (req) => {
  const nick = String(req.data?.nick || "").trim();
  if (!nick) throw new HttpsError("invalid-argument", "nick required");

  const snap = await db
    .collection("users")
    .where("nick", "==", nick)
    .limit(1)
    .get();

  return { exists: !snap.empty };
});

/* =========================================================
   추천코드 예약 (A00001)
========================================================= */
exports.reserveReferralCode = onCall(async (req) => {
  const prefix = String(req.data?.prefix || "").trim().toUpperCase();
  if (!/^[A-Z]$/.test(prefix)) {
    throw new HttpsError("invalid-argument", "prefix must A~Z 1 char");
  }

  const countersRef = db.collection("meta").doc("referral_counters");
  const snap = await countersRef.get();
  const counter = snap.exists ? snap.data()[prefix] || 0 : 0;
  const next = counter + 1;

  const code = `${prefix}${String(next).padStart(5, "0")}`;

  await countersRef.set({ [prefix]: next }, { merge: true });

  await db.collection("referral_codes").doc(code).set({
    reserved: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { code };
});

/* =========================================================
   추천코드 적용
========================================================= */
exports.applyReferralNow = onCall(async (req) => {
  const auth = req.auth;
  if (!auth?.uid) throw new HttpsError("unauthenticated", "로그인필요");

  const refCode = String(req.data?.refCode || "").trim().toUpperCase();
  if (!refCode) throw new HttpsError("invalid-argument", "refCode required");

  const refSnap = await db.collection("users")
    .where("referral.myCode", "==", refCode)
    .limit(1)
    .get();

  if (refSnap.empty) return { ok: false, message: "not_found" };

  await db.collection("users").doc(auth.uid).set(
    {
      referral: { refBy: refCode, refApplied: true },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true };
});

/* =========================================================
   문자 인증번호 발송 (CoolSMS 실사용)
========================================================= */
exports.sendSmsCode = onCall(async (req) => {
  const phone = String(req.data?.phone || "").replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(phone)) {
    throw new HttpsError("invalid-argument", "invalid phone");
  }

  // 인증번호 생성
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 3 * 60 * 1000; // 3분

  // 문자 발송
  try {
    await smsClient.sendOne({
      to: phone,
      from: sender,
      text: `[GangTalk] 인증번호: ${code} (3분간 유효)`,
    });
  } catch (err) {
    console.error("SMS ERROR:", err);
    throw new HttpsError("internal", "SMS send failed");
  }

  // Firestore 저장
  await db.collection("sms_codes").doc(phone).set({
    code,
    expires,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

/* =========================================================
   문자 인증번호 인증
========================================================= */
exports.verifySmsCode = onCall(async (req) => {
  const phone = String(req.data?.phone || "").replace(/\D/g, "");
  const code = String(req.data?.code || "");

  const snap = await db.collection("sms_codes").doc(phone).get();
  if (!snap.exists) return { ok: false, reason: "no_request" };

  const d = snap.data();

  if (Date.now() > d.expires) return { ok: false, reason: "expired" };
  if (d.code !== code) return { ok: false, reason: "mismatch" };

  await db.collection("sms_codes").doc(phone).delete();
  return { ok: true };
});
