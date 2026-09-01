// src/services/applyService.js
// applications 컬렉션에 광고/업체등록 신청 저장

import { getAuth } from "firebase/auth";
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

/**
 * 입력 형식
 * @param {Object} input
 * @param {"ad"|"partner"} input.type        - 신청 유형
 * @param {string} [input.companyName]       - 업체명
 * @param {string} [input.contactName]       - 담당자명
 * @param {string} [input.phone]             - 연락처
 * @param {string} [input.email]             - 이메일
 * @param {string} [input.message]           - 메시지/요청사항
 * @param {Object} [input.extra]             - 추가 필드(자유)
 * @returns {Promise<string>}                - 생성된 문서 ID
 */
export async function submitApplication(input = {}) {
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;

  // 필수값 최소 검증
  const type = String(input.type || "").trim();
  if (!["ad", "partner"].includes(type)) {
    throw new Error('input.type must be "ad" or "partner"');
  }

  const payload = {
    type,
    companyName: (input.companyName || "").trim(),
    contactName: (input.contactName || "").trim(),
    phone: (input.phone || "").trim(),
    email: (input.email || "").trim(),
    message: (input.message || "").trim(),
    extra: input.extra || {},

    // 감사/추적용 메타
    createdByUid: user?.uid || "",
    createdByEmail: user?.email || "",
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "applications"), payload);
  return ref.id;
}

/** 편의: 광고신청 전용 */
export async function submitAdApplication(fields = {}) {
  return submitApplication({ ...fields, type: "ad" });
}

/** 편의: 업체등록 전용 */
export async function submitPartnerApplication(fields = {}) {
  return submitApplication({ ...fields, type: "partner" });
}

export default {
  submitApplication,
  submitAdApplication,
  submitPartnerApplication,
};
