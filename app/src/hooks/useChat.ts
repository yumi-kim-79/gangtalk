import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { sendMessage, subscribeMessages, subscribeRooms } from '@/services/chat';
import type { ChatMessage, ChatRoom } from '@/types/chat';
import { ANON_LABEL } from '@/constants/author';

/** 방 목록 — 규칙상 로그인해야 읽을 수 있어 비로그인이면 구독하지 않는다 */
export function useChatRooms() {
  const { isLoggedIn } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeRooms(
      rows => {
        setRooms(rows);
        setLoading(false);
      },
      () => {
        setError('채팅방을 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    return unsub;
  }, [isLoggedIn]);

  return { rooms, loading, error };
}

/** 방 하나의 메시지 + 전송 */
export function useChatRoom(roomId: string) {
  const { uid, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeMessages(
      roomId,
      uid,
      rows => {
        setMessages(rows);
        setLoading(false);
      },
      () => {
        setError('메시지를 불러오지 못했습니다.');
        setLoading(false);
      },
    );
    return unsub;
  }, [roomId, uid]);

  const send = useCallback(
    async (text: string) => {
      if (!uid || sending || !text.trim()) return;
      setSending(true);
      try {
        await sendMessage({ roomId, uid, author: profile?.nickname || ANON_LABEL, text });
      } catch {
        setError('메시지 전송에 실패했습니다.');
      } finally {
        setSending(false);
      }
    },
    [uid, sending, roomId, profile],
  );

  return { messages, loading, sending, error, send, canSend: !!uid };
}
