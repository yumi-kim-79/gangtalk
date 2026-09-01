import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  blockUser,
  subscribeMyBlocks,
  unblockUser,
  type BlockedUser,
} from '@/services/moderation';

/**
 * 내가 차단한 사용자 집합.
 * 목록 화면들은 `hidden(uid)` 로 걸러 상대 콘텐츠를 감춘다.
 */
export function useBlocked() {
  const { uid } = useAuth();
  const [rows, setRows] = useState<BlockedUser[]>([]);

  useEffect(() => {
    if (!uid) {
      setRows([]);
      return;
    }
    return subscribeMyBlocks(uid, setRows);
  }, [uid]);

  const blockedUids = useMemo(() => new Set(rows.map(r => r.uid)), [rows]);

  /** 이 작성자의 콘텐츠를 숨겨야 하나 */
  const hidden = useCallback(
    (authorUid?: string | null) => !!authorUid && blockedUids.has(authorUid),
    [blockedUids],
  );

  return {
    rows,
    blockedUids,
    hidden,
    block: blockUser,
    unblock: unblockUser,
  };
}
