import { collection, doc } from '@react-native-firebase/firestore';
import { COLLECTIONS } from '@/constants/app';
import { db } from './index';

/** 컬렉션 참조 헬퍼 — 오타 방지를 위해 COLLECTIONS 를 거친다. */
export const col = (name: (typeof COLLECTIONS)[keyof typeof COLLECTIONS]) =>
  collection(db, name);

export const docRef = (
  name: (typeof COLLECTIONS)[keyof typeof COLLECTIONS],
  id: string,
) => doc(db, name, id);
