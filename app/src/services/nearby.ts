/**
 * 내 주변 10km — 웹 composables/useNearby.ts 이식.
 *
 * 웹은 계산 후 지도 라우트로 넘어가지만 앱에는 지도 화면이 없어,
 * 같은 하버사인 계산으로 **목록을 거리순으로 좁히는** 방식으로 옮겼다.
 * 계산식·반경·폴백 중심(강남역)은 웹과 동일하다.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import type { Store } from '@/types/store';

export interface LatLng {
  lat: number;
  lng: number;
}

/** 권한/위치 실패 시 기준점 — 웹 DEFAULT_CENTER 와 동일 */
export const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 };
export const DEFAULT_CENTER_LABEL = '강남역';
export const NEARBY_RADIUS_KM = 10;

/** 하버사인 거리(km) */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** 업체 좌표 — 세대별로 필드명이 달라 웹 coordOf 와 같은 순서로 찾는다 */
export function coordOf(s: Store): LatLng | null {
  const x = s as unknown as Record<string, unknown>;
  const geo = (x.geo ?? x.location ?? {}) as Record<string, unknown>;
  const lat = Number(x.lat ?? x.latitude ?? geo.lat ?? NaN);
  const lng = Number(x.lng ?? x.longitude ?? geo.lng ?? NaN);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

async function ensureAndroidPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: '위치 권한',
      message: '내 주변 10km 안의 업체를 찾기 위해 위치 정보가 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '거부',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export interface CenterResult {
  center: LatLng;
  /** true = 위치를 못 받아 강남역 기준으로 계산했다 */
  usedDefault: boolean;
}

/** 현재 위치. 실패하면 강남역으로 폴백하고 usedDefault 를 알린다 (웹과 같은 동작) */
export async function getCenter(): Promise<CenterResult> {
  try {
    const ok = await ensureAndroidPermission();
    if (!ok) return { center: DEFAULT_CENTER, usedDefault: true };
    const pos = await new Promise<LatLng>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
    return { center: pos, usedDefault: false };
  } catch {
    return { center: DEFAULT_CENTER, usedDefault: true };
  }
}

export interface NearbyStore {
  store: Store;
  distKm: number;
}

/** 반경 안 업체를 가까운 순으로. 좌표가 없는 업체는 제외 (웹 pickWithin 과 동일) */
export function pickWithin(
  stores: Store[],
  center: LatLng,
  radiusKm = NEARBY_RADIUS_KM,
): NearbyStore[] {
  return stores
    .map(store => ({ store, c: coordOf(store) }))
    .filter((x): x is { store: Store; c: LatLng } => !!x.c)
    .map(x => ({ store: x.store, distKm: distanceKm(center, x.c) }))
    .filter(x => x.distKm <= radiusKm)
    .sort((a, b) => a.distKm - b.distKm);
}
