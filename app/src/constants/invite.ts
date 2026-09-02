/**
 * 초대 문구 — 웹 web/src/lib/invite.js 와 **문안·URL 형식이 같아야 한다**.
 * 링크는 `/auth?mode=signup&ref=` — 로그인이 아니라 가입 화면으로 바로 간다.
 */
import { env } from '@/config/env';
import { REFERRAL_REWARD_POINT } from '@/constants/tiers';

export function inviteUrl(code: string): string {
  const base = String(env.webUrl || 'https://gangtox.com').replace(/\/+$/, '');
  return `${base}/auth?mode=signup&ref=${encodeURIComponent(code)}`;
}

export function inviteMessage(code: string): string {
  return [
    '강남톡방에 초대합니다!',
    `제 추천코드 ${code} 로 가입하면 서로 ${REFERRAL_REWARD_POINT.toLocaleString()}P 를 받아요.`,
    inviteUrl(code),
  ].join('\n');
}

/** 리워드 금액 표기 — 웹 rewardWon 과 동일 */
export function rewardWon(n: number): string {
  return `${Math.floor(Number(n) || 0).toLocaleString()}원`;
}
