import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/endpoints';
import type { NotificationItem } from '../api/types';
import { ago } from '../lib/format';
import { useToast } from '../lib/session';
import { Icon } from './ui';

const POLL_MS = 30000;

/** 헤더 종 아이콘: 안 읽은 알림 수(30초마다 확인) + 눌러서 알림 목록 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [page, setPage] = useState({ page: 0, hasNext: false });
  const box = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(() => {
    notificationApi.unreadCount().then((r) => setUnread(r.unreadCount)).catch(() => { /* 다음 확인 때 다시 */ });
  }, []);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, POLL_MS);
    const onFocus = () => loadCount();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [loadCount]);

  const loadList = useCallback(async (p: number) => {
    try {
      const res = await notificationApi.list(p);
      setItems((prev) => (p === 0 ? res.content : [...(prev ?? []), ...res.content]));
      setPage({ page: p, hasNext: res.hasNext });
    } catch (e) {
      toast.error(e);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    loadList(0);
    loadCount();
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, loadList, loadCount]);

  const openItem = async (n: NotificationItem) => {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.notificationId === n.notificationId ? { ...x, read: true } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
      notificationApi.read(n.notificationId).catch(() => loadCount());
    }
    setOpen(false);
    if (n.postId) navigate(`/posts/${n.postId}`);
  };

  const readAll = async () => {
    try {
      await notificationApi.readAll();
      setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? null);
      setUnread(0);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" className="bell" aria-label={`알림 ${unread}개`} onClick={() => setOpen(!open)}>
        <Icon name="bell" size={22} />{unread > 0 && <span className="bell-count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="noti-panel">
          <div className="row between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--surface-muted)' }}>
            <span className="strong">알림</span>
            <button type="button" className="btn btn-ghost small" disabled={unread === 0} onClick={readAll}>모두 읽음</button>
          </div>
          {items === null ? <div className="small muted" style={{ padding: 16 }}>불러오는 중…</div>
            : items.length === 0 ? <div className="small muted" style={{ padding: 24, textAlign: 'center' }}>아직 알림이 없어요.<br />공구에 참여하거나 공구를 열면 진행 소식을 알려드려요.</div>
              : items.map((n) => (
                <button key={n.notificationId} type="button" className={`noti-item${n.read ? '' : ' is-new'}`} onClick={() => openItem(n)}>
                  <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                    <div className="grow">
                      <div className="small noti-msg">{n.message}</div>
                      <div className="small muted">{ago(n.createdAt)}</div>
                    </div>
                    {!n.read && <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--danger)', marginTop: 6 }} />}
                  </div>
                </button>
              ))}
          {items && page.hasNext && (
            <button type="button" className="btn btn-ghost btn-block small" onClick={() => loadList(page.page + 1)}>더 보기</button>
          )}
        </div>
      )}
    </div>
  );
}
