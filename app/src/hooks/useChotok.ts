import { useEffect, useMemo, useState } from 'react';
import {
  defaultRoomId,
  parseChotok,
  subscribeChotok,
  type ChotokMessage,
} from '@/services/chotok';

/**
 * 업체 초톡방 메시지.
 * 마지막 붙여넣기(kind==='paste') 원문에서 맞출방/필요인원도 같이 계산해 준다.
 */
export function useChotok(storeId: string) {
  const [messages, setMessages] = useState<ChotokMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    return subscribeChotok(
      storeId,
      defaultRoomId(storeId),
      rows => {
        setMessages(rows);
        setLoading(false);
      },
      () => {
        setError('초톡 내용을 불러오지 못했습니다.');
        setLoading(false);
      },
    );
  }, [storeId]);

  /** 가장 최근 붙여넣기 기준 지표 */
  const parsed = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].kind === 'paste') return parseChotok(messages[i].text);
    }
    return null;
  }, [messages]);

  return { messages, parsed, loading, error };
}
