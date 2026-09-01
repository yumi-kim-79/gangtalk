/**
 * 고객센터 상수 — 웹 SupportPage.vue / DiaryPage.vue 에 흩어져 있던 값들.
 * 두 파일에 같은 전화번호가 중복돼 있어 앱에서는 한 곳으로 모았다.
 */
export const SUPPORT_PHONE = '010-5919-0815';
export const SUPPORT_PHONE_TEL = SUPPORT_PHONE.replace(/[^0-9+]/g, '');
export const SUPPORT_EMAIL = 'gangtalk815@gmail.com';
export const SUPPORT_KAKAO_ID = 'gangtalk';
/** 채널 URL 이 아직 없어 웹에서도 [열기] 버튼을 숨긴다 */
export const SUPPORT_KAKAO_URL = '';
export const SUPPORT_HOURS = '10:00 ~ 19:00 (주말/공휴일 제외)';

/** 답변에 굵게·링크가 섞여 있어 조각으로 나눠 둔다 (웹은 v-html) */
export type FaqSegment =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'mail'; v: string };

export interface FaqItem {
  q: string;
  a: FaqSegment[];
}

/** 웹 SupportPage 의 FAQ 5건 — 문구 그대로 */
export const FAQ: FaqItem[] = [
  {
    q: '회원가입 없이 사용할 수 있나요?',
    a: [
      {
        t: 'text',
        v: '일부 화면은 열람만 가능하지만, 채팅/게시판/제휴 문의 등 주요 기능은 회원가입이 필요합니다.',
      },
    ],
  },
  {
    q: '가게 정보가 잘못되었어요. 수정 요청은 어디서 하나요?',
    a: [
      { t: 'text', v: '해당 가게 상세 화면의 ' },
      { t: 'bold', v: '[게시판]' },
      { t: 'text', v: ' 또는 고객센터 이메일(' },
      { t: 'mail', v: SUPPORT_EMAIL },
      { t: 'text', v: ')로 알려주세요.' },
    ],
  },
  {
    q: '현황판 숫자(맞출방/필요인원)는 얼마나 자주 업데이트되나요?',
    a: [
      {
        t: 'text',
        v: '운영자가 수시로 업데이트하며, 일부 항목은 자동 수집됩니다. 새로고침 버튼을 눌러 최신 정보를 확인하세요.',
      },
    ],
  },
  {
    q: '카카오톡 채널로 접속이 안 돼요.',
    a: [
      {
        t: 'text',
        v: '채널 URL 연결이 아직 준비되지 않았거나 일시 장애일 수 있어요. 잠시 후 다시 시도하거나 고객센터로 문의해주세요.',
      },
    ],
  },
  {
    q: '광고/제휴는 어떻게 진행하나요?',
    a: [
      { t: 'text', v: '이메일(' },
      { t: 'mail', v: SUPPORT_EMAIL },
      { t: 'text', v: `) 또는 카카오톡 채널(@${SUPPORT_KAKAO_ID})로 연락 주세요. 담당자가 안내드립니다.` },
    ],
  },
];
