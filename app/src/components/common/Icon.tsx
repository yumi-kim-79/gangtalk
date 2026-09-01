import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * 아이콘 세트.
 * 웹(components/common/AppHeader.vue, pages/StoreDetail.vue)이 쓰던 SVG path 를 그대로 옮겼다.
 * 이모지는 기기·시뮬레이터에 따라 폰트 폴백이 실패해 tofu(□) 로 보이므로 UI 크롬에는 쓰지 않는다.
 */
export type IconName =
  | 'search'
  | 'filter'
  | 'bell'
  | 'menu'
  | 'chevronRight'
  | 'chevronDown'
  | 'star'
  | 'heart'
  | 'home'
  | 'find'
  | 'chat'
  | 'deal'
  | 'user'
  | 'signal'
  | 'calendar'
  | 'support'
  | 'logout'
  | 'login';

type Props = {
  name: IconName;
  size?: number;
  color: string;
  /** star / heart 처럼 채움이 기본인 아이콘의 채움 여부 */
  filled?: boolean;
};

export default function Icon({ name, size = 22, color, filled = true }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  /** 하단 탭 아이콘은 웹과 동일하게 1.6 두께 */
  const thin = {
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    // ── 웹 app-search-ic ──
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={11} cy={11} r={7} {...stroke} />
          <Path d="M21 21l-4.3-4.3" {...stroke} />
        </Svg>
      );
    // ── 웹 app-search-filter ──
    case 'filter':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 6h12" {...stroke} />
          <Path d="M4 12h8" {...stroke} />
          <Path d="M4 18h14" {...stroke} />
          <Circle cx={18} cy={6} r={2} fill={color} />
          <Circle cx={14} cy={12} r={2} fill={color} />
          <Circle cx={20} cy={18} r={2} fill={color} />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16z" {...stroke} />
          <Path d="M10 21a2 2 0 0 0 4 0" {...stroke} />
        </Svg>
      );
    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 7h16M4 12h16M4 17h16" {...stroke} />
        </Svg>
      );
    case 'chevronRight':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" {...stroke} />
        </Svg>
      );
    case 'chevronDown':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9l6 6 6-6" {...stroke} />
        </Svg>
      );
    // ── 웹 StoreDetail 별점 ──
    case 'star':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={filled ? 0 : 2}
            strokeLinejoin="round"
          />
        </Svg>
      );
    // ── 웹 StoreDetail 찜 ──
    case 'heart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12.1 21.35 10 19.28C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8 10.78l-1.9 2.07z"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={filled ? 0 : 2}
            strokeLinejoin="round"
          />
        </Svg>
      );
    // ── 하단 탭 ──
    // ── 하단 탭 — 웹 components/BottomNav.vue 의 path 그대로 ──
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 11.5 12 4l8 7.5v7a1 1 0 0 1-1 1h-4.5v-5.5h-5V20.5H5a1 1 0 0 1-1-1z"
            {...thin}
          />
        </Svg>
      );
    case 'find':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={1.6} fill="none" />
          <Path d="m20 20-3.8-3.8" {...thin} />
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H11l-4.5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            {...thin}
          />
        </Svg>
      );
    case 'deal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3.5 12.5 9 7l6 10 5.5-5.5" {...thin} />
        </Svg>
      );
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.6} fill="none" />
          <Path d="M5 20c1.8-3.3 5-5 7-5s5.2 1.7 7 5" {...thin} />
        </Svg>
      );
    // ── 헤더 햄버거 메뉴 ──
    // 이모지(📅🎧🚪🔑)는 시뮬레이터에서 tofu 로 떠서 SVG 로 대체했다.
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x={3} y={5} width={18} height={16} rx={2.5} {...stroke} fill="none" />
          <Path d="M3 10h18M8 3v4M16 3v4" {...stroke} />
          <Rect x={7} y={13} width={3} height={3} rx={0.8} fill={color} />
        </Svg>
      );
    case 'support':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 13v-1a8 8 0 0 1 16 0v1" {...stroke} />
          <Path
            d="M4 13h2.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM20 13h-2.5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1z"
            {...stroke}
          />
          <Path d="M20 18v1a3 3 0 0 1-3 3h-3" {...stroke} />
        </Svg>
      );
    case 'logout':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" {...stroke} />
          <Path d="M10 16l-4-4 4-4M6 12h9" {...stroke} />
        </Svg>
      );
    case 'login':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" {...stroke} />
          <Path d="M14 16l4-4-4-4M18 12H9" {...stroke} />
        </Svg>
      );
    // 혼잡도 막대 — 웹 현황판의 .mp-metric-wifi 신호 막대
    case 'signal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={14} width={4} height={7} rx={1} fill={color} />
          <Rect x={10} y={9} width={4} height={12} rx={1} fill={color} />
          <Rect x={17} y={4} width={4} height={17} rx={1} fill={color} />
        </Svg>
      );
  }
}
