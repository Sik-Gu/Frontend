import { Client, type StompSubscription } from '@stomp/stompjs';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tokens } from '../api/client';
import { chatApi } from '../api/endpoints';
import type { ChatMessage, ChatRoomDetail, ChatRoomStatus, ChatRoomSummary } from '../api/types';
import { Avatar, ImageBox, StatusBadge } from '../components/ui';
import { ago, clock, won } from '../lib/format';
import { useSession, useToast } from '../lib/session';

type Conn = 'connecting' | 'connected' | 'disconnected';

/** 05 채팅 */
export default function ChatPage() {
  const { roomId: roomParam } = useParams();
  const roomId = roomParam ? Number(roomParam) : null;
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<ChatRoomStatus>('ONGOING');
  const [rooms, setRooms] = useState<Record<ChatRoomStatus, ChatRoomSummary[]>>({ ONGOING: [], CLOSED: [] });
  const [client, setClient] = useState<Client | null>(null);
  const [conn, setConn] = useState<Conn>('connecting');

  const loadRooms = useCallback(async () => {
    try {
      const [ongoing, closed] = await Promise.all([chatApi.rooms('ONGOING'), chatApi.rooms('CLOSED')]);
      setRooms({ ONGOING: ongoing, CLOSED: closed });
    } catch (e) {
      toast.error(e);
    }
  }, [toast]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // WebSocket(STOMP) 연결은 채팅 화면에 있는 동안 하나만 유지한다
  useEffect(() => {
    const c = new Client({
      brokerURL: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws-stomp`,
      reconnectDelay: 3000,
      beforeConnect: async () => { c.connectHeaders = { Authorization: `Bearer ${tokens.access ?? ''}` }; },
      onConnect: () => setConn('connected'),
      onWebSocketClose: () => setConn('disconnected'),
      onStompError: (frame) => toast.error(new Error(`채팅 서버 오류: ${frame.headers.message ?? ''}`)),
    });
    c.activate();
    setClient(c);
    return () => { c.deactivate(); };
  }, [toast]);

  // 주소에 방 번호가 없으면 첫 방을 연다
  useEffect(() => {
    if (roomId === null && rooms.ONGOING.length > 0) navigate(`/chats/${rooms.ONGOING[0].chatRoomId}`, { replace: true });
  }, [roomId, rooms.ONGOING, navigate]);

  const list = rooms[tab];

  return (
    <div className="page" style={{ paddingBottom: 28 }}>
      <div className="chat-layout">
        <div className="card chat-list">
          <div style={{ padding: '20px 20px 12px' }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>채팅</h2>
            <div className="row" style={{ gap: 16, marginTop: 10 }}>
              {(['ONGOING', 'CLOSED'] as const).map((s) => (
                <button key={s} className="btn btn-ghost" style={{ padding: 0, color: tab === s ? '#1a1a1a' : '#808080', fontWeight: tab === s ? 700 : 400 }}
                  onClick={() => setTab(s)}>{s === 'ONGOING' ? '진행중' : '종료됨'} {rooms[s].length}</button>
              ))}
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {list.length === 0 && <div className="small muted" style={{ padding: 20 }}>
              {tab === 'ONGOING' ? '참여 중인 채팅방이 없어요. 공구를 열거나 참여하면 자동으로 들어가요.' : '종료된 채팅방이 없어요.'}</div>}
            {list.map((r) => (
              <Link key={r.chatRoomId} to={`/chats/${r.chatRoomId}`} className={`chat-list-item${r.chatRoomId === roomId ? ' active' : ''}`}>
                <ImageBox src={r.thumbnailUrl} label="" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                <div className="grow">
                  <div className="row between">
                    <span className="strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name} ({r.participantCount})</span>
                    <span className="small muted" style={{ flexShrink: 0 }}>{ago(r.lastMessageAt)}</span>
                  </div>
                  <div className="row between">
                    <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.lastMessage ?? '아직 메시지가 없어요'}</span>
                    {r.unreadCount > 0 && <span className="unread">{r.unreadCount}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="small muted" style={{ padding: '10px 20px', borderTop: '1px solid #f0f0f0' }}>
            실시간 연결: {conn === 'connected' ? '🟢 연결됨' : conn === 'connecting' ? '🟡 연결 중…' : '🔴 끊김 (자동 재연결 중)'}
          </div>
        </div>

        {roomId !== null && client
          ? <ChatRoom key={roomId} roomId={roomId} client={client} connected={conn === 'connected'} onActivity={loadRooms} />
          : <div className="card muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>채팅방을 골라 주세요</div>}
      </div>
    </div>
  );
}

function ChatRoom({ roomId, client, connected, onActivity }: {
  roomId: number; client: Client; connected: boolean; onActivity: () => void;
}) {
  const { me } = useSession();
  const toast = useToast();
  const [room, setRoom] = useState<ChatRoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);

  const markRead = useCallback(() => { chatApi.read(roomId).then(onActivity).catch(() => undefined); }, [roomId, onActivity]);

  // 방 정보 + 최근 메시지
  useEffect(() => {
    let alive = true;
    Promise.all([chatApi.room(roomId), chatApi.messages(roomId)])
      .then(([r, page]) => {
        if (!alive) return;
        setRoom(r);
        setMessages([...page.messages].reverse()); // 서버는 최신순 → 화면은 오래된 것부터
        setCursor(page.nextCursor);
        setHasMore(page.hasNext);
        markRead();
      })
      .catch((e) => { if (alive) { setError(e.message); toast.error(e); } });
    return () => { alive = false; };
  }, [roomId, markRead, toast]);

  // 실시간 구독 (방 메시지 + 나에게만 오는 에러)
  useEffect(() => {
    if (!connected) return;
    const subs: StompSubscription[] = [];
    subs.push(client.subscribe(`/sub/chats/${roomId}`, (frame) => {
      const m = JSON.parse(frame.body) as ChatMessage;
      setMessages((prev) => (prev.some((x) => x.messageId === m.messageId) ? prev : [...prev, m]));
      markRead();
    }));
    subs.push(client.subscribe('/user/queue/errors', (frame) => {
      const body = JSON.parse(frame.body) as { code: string; message: string };
      toast.error(new Error(`[${body.code}] ${body.message}`));
    }));
    return () => subs.forEach((s) => { try { s.unsubscribe(); } catch { /* 이미 끊김 */ } });
  }, [client, connected, roomId, markRead, toast]);

  useLayoutEffect(() => {
    if (stickBottom.current && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages]);

  const loadOlder = async () => {
    if (!hasMore || cursor === null) return;
    const el = box.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const page = await chatApi.messages(roomId, cursor);
      stickBottom.current = false;
      setMessages((prev) => [...[...page.messages].reverse(), ...prev]);
      setCursor(page.nextCursor);
      setHasMore(page.hasNext);
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
    } catch (e) {
      toast.error(e);
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    if (!connected) { toast.error(new Error('실시간 연결이 끊겨 있어요. 잠시 후 다시 보내 주세요.')); return; }
    stickBottom.current = true;
    client.publish({ destination: `/pub/chats/${roomId}/messages`, body: JSON.stringify({ type: 'TEXT', content }) });
    setText('');
  };

  if (error) return <div className="card">{error}</div>;
  if (!room) return <div className="card muted">불러오는 중…</div>;
  const closed = room.status === 'CLOSED';

  return (
    <div className="card chat-room">
      <div className="row between" style={{ padding: '16px 24px', borderBottom: '1px solid #e6e6e6' }}>
        <div>
          <div className="strong" style={{ fontSize: 16 }}>{room.name}</div>
          <div className="small muted">참여자 {room.participantCount}명 · {room.participants.map((p) => p.nickname + (p.role === 'HOST' ? '(호스트)' : '')).join(', ')}</div>
        </div>
        <Link to={`/posts/${room.post.postId}`} className="btn btn-secondary btn-sm">공구 게시글 보기</Link>
      </div>
      <div className="row" style={{ padding: '12px 24px', background: '#fafafa', borderBottom: '1px solid #e6e6e6' }}>
        <ImageBox src={room.post.thumbnailUrl} label="" style={{ width: 44, height: 44, borderRadius: 6 }} />
        <div className="grow">
          <div className="strong small">{room.post.title}</div>
          <div className="small muted">1단위 {won(room.post.unitPrice)} · {room.post.filledUnits} / {room.post.totalUnits}단위</div>
        </div>
        <StatusBadge status={room.post.status} />
      </div>

      <div className="chat-messages" ref={box} onScroll={(e) => {
        const el = e.currentTarget;
        stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        if (el.scrollTop === 0) loadOlder();
      }}>
        {hasMore && <button className="btn btn-ghost small" style={{ alignSelf: 'center' }} onClick={loadOlder}>이전 메시지 더 보기</button>}
        {messages.map((m) => {
          if (m.type === 'SYSTEM') return <div key={m.messageId} className="msg-system">{m.content}</div>;
          const mine = m.senderId === me?.userId;
          const body = m.type === 'IMAGE' && m.imageUrl
            ? <img src={m.imageUrl} alt="" style={{ maxWidth: 220, borderRadius: 10 }} />
            : <div className="bubble">{m.content}</div>;
          return mine ? (
            <div key={m.messageId} className="msg-mine">{body}<span className="small muted">{clock(m.sentAt)}</span></div>
          ) : (
            <div key={m.messageId} className="msg-other">
              <Avatar name={m.senderNickname} size="sm" />
              <div className="stack" style={{ gap: 4 }}>
                <span className="small muted">{m.senderNickname}</span>
                <div className="row" style={{ alignItems: 'flex-end', gap: 6 }}>{body}<span className="small muted">{clock(m.sentAt)}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <form className="row" style={{ padding: '14px 24px', borderTop: '1px solid #e6e6e6' }} onSubmit={send}>
        <input className="input" style={{ borderRadius: 999, background: '#f2f2f2', border: 0 }}
          placeholder={closed ? '종료된 채팅방이에요 (읽기 전용)' : '메시지를 입력하세요'} value={text} maxLength={1000}
          disabled={closed} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-primary" disabled={closed || !text.trim()}>전송</button>
      </form>
    </div>
  );
}
