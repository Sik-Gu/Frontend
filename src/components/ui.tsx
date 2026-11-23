import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { imageApi } from '../api/endpoints';
import type { ImageType, PostCard, PostStatus } from '../api/types';
import { CATEGORY_LABEL, dday, DISTANCE_LABEL, isClosingSoon, remaining, STATUS_LABEL, won } from '../lib/format';
import { useToast } from '../lib/session';

const ICON_PATHS = {
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chat: <path d="M4 5h16v11H9l-5 4V5Z" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  right: <path d="m9 6 6 6-6 6" />,
  left: <path d="m15 6-6 6 6 6" />,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5Z" />,
};

/** 선 아이콘 (이모지 대신). 글자색을 따라간다 */
export function Icon({ name, size = 16, filled = false, label }: {
  name: keyof typeof ICON_PATHS; size?: number; filled?: boolean; label?: string;
}) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {ICON_PATHS[name]}
    </svg>
  );
}


/** 이미지가 있으면 보여주고, 없으면 피그마처럼 회색 자리표시 */
export function ImageBox({ src, label = '상품 이미지', style, className = '' }: {
  src?: string | null; label?: string; style?: React.CSSProperties; className?: string;
}) {
  return (
    <div className={`img-ph ${className}`} style={style}>
      {src ? <img src={src} alt="" /> : label}
    </div>
  );
}

export function StatusBadge({ status }: { status: PostStatus }) {
  const muted = status === 'SETTLED' || status === 'CANCELLED';
  return <span className={`badge${muted ? ' muted' : ''}`}>{STATUS_LABEL[status]}</span>;
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="progress"><span style={{ width: `${pct}%` }} /></div>;
}

export function Avatar({ name, size = '' }: { name?: string | null; size?: '' | 'sm' | 'lg' }) {
  return <span className={`avatar ${size}`}>{name ? name.slice(0, 1) : ''}</span>;
}

/** 일정 간격으로 현재 시각을 갱신한다 (남은 시간 표시용) */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** 카드 사진: 여러 장이면 자동으로 옆으로 넘어가고, 화살표·점으로 직접 넘길 수도 있다 */
export function CardCarousel({ urls, seed = 0 }: { urls: string[]; seed?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = urls.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    // 카드마다 시작 시점을 조금씩 달리해서 한꺼번에 넘어가지 않게 한다
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      timer = setInterval(() => setIndex((i) => (i + 1) % count), 3000);
    }, (seed % 5) * 400);
    return () => { clearTimeout(start); if (timer) clearInterval(timer); };
  }, [count, paused, seed]);

  if (count === 0) return <ImageBox />;

  const go = (e: React.MouseEvent, next: number) => {
    e.preventDefault(); // 카드 링크로 이동하지 않게
    e.stopPropagation();
    setIndex((next + count) % count);
  };

  return (
    <div className="img-ph carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {urls.map((u) => <img key={u} src={u} alt="" draggable={false} />)}
      </div>
      {count > 1 && (
        <>
          <button type="button" className="carousel-arrow left" aria-label="이전 사진" onClick={(e) => go(e, index - 1)}><Icon name="left" /></button>
          <button type="button" className="carousel-arrow right" aria-label="다음 사진" onClick={(e) => go(e, index + 1)}><Icon name="right" /></button>
          <div className="carousel-dots">
            {urls.map((u, i) => (
              <button key={u} type="button" aria-label={`${i + 1}번째 사진`} className={i === index ? 'on' : ''} onClick={(e) => go(e, i)} />
            ))}
          </div>
          <span className="carousel-count">{index + 1}/{count}</span>
        </>
      )}
    </div>
  );
}

/** 공구 카드 (02 홈, 07 내 공구함) */
export function PostCardView({ post, footer }: { post: PostCard; footer?: ReactNode }) {
  const now = useNow();
  const images = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : post.thumbnailUrl ? [post.thumbnailUrl] : [];
  const recruiting = post.status === 'RECRUITING';
  const soon = recruiting && isClosingSoon(post.deadlineAt, now);
  const d = dday(post.deadlineAt);
  const left = post.totalUnits - post.filledUnits;
  return (
    <div className="stack sm">
      <Link to={`/posts/${post.postId}`} className="post-card">
        <div className="post-card-media">
          <CardCarousel urls={images} seed={post.postId} />
          <span className="post-card-tag">
            {recruiting
              ? <span className={`badge${d.hot ? ' hot' : ''}`}>{d.label}</span>
              : <span className="badge muted">{STATUS_LABEL[post.status]}</span>}
          </span>
        </div>
        <div className="post-card-body">
          <div className="small muted">
            {CATEGORY_LABEL[post.category]} · {post.distance ? DISTANCE_LABEL[post.distance] : post.dongName}
          </div>
          <div className="post-card-title">{post.title}</div>
          <div className="post-card-price">
            <strong>{won(post.unitPrice)}</strong><span className="muted" style={{ fontSize: 13 }}>/ {post.baseUnit}</span>
          </div>
          <Progress value={post.filledUnits} max={post.totalUnits} />
          <div className="post-card-foot">
            <span>{post.filledUnits}/{post.totalUnits}단위 · {left > 0 ? `${left}단위 남음` : '다 찼어요'}</span>
            {recruiting && !footer && left > 0 && <span className="post-card-cta">참여하기</span>}
          </div>
          <div className="row between small">
            <span className={soon ? 'deadline soon' : 'deadline'}>
              {recruiting ? `마감까지 ${remaining(post.deadlineAt, now)}` : '모집 마감'}
            </span>
            <span className="muted tabular" title="조회수">조회 {post.viewCount.toLocaleString('ko-KR')}</span>
          </div>
        </div>
      </Link>
      {footer}
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <h2 className="card-title" style={{ margin: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** 이미지 업로드 (POST /api/images) 후 받은 URL 목록을 부모에 넘긴다 */
export function ImageUploader({ type, urls, onChange, max, label = '+ 사진 추가' }: {
  type: ImageType; urls: string[]; onChange: (urls: string[]) => void; max: number; label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, max - urls.length);
    setBusy(true);
    try {
      const res = await imageApi.upload(list, type);
      onChange([...urls, ...res.images.map((i) => i.url)]);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="row wrap" style={{ gap: 12 }}>
      {urls.length < max && (
        <button type="button" className="img-ph" disabled={busy}
          style={{ width: 96, height: 96, borderRadius: 8, border: '1px dashed var(--line-button)', background: 'var(--bg)', cursor: 'pointer' }}
          onClick={() => input.current?.click()}>
          {busy ? '올리는 중…' : label}
        </button>
      )}
      {urls.map((u) => (
        <div key={u} style={{ position: 'relative' }}>
          <ImageBox src={u} style={{ width: 96, height: 96, borderRadius: 8 }} />
          <button type="button" className="btn-ghost" aria-label="사진 빼기"
            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 999, border: 0, width: 22, height: 22, cursor: 'pointer', lineHeight: '20px' }}
            onClick={() => onChange(urls.filter((x) => x !== u))}>×</button>
        </div>
      ))}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        onChange={(e) => upload(e.target.files)} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card muted" style={{ textAlign: 'center', padding: 48 }}>{children}</div>;
}

export function Pagination({ page, hasNext, total, size, onChange }: {
  page: number; hasNext: boolean; total: number; size: number; onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
      <button className="btn btn-ghost" disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="이전 쪽"><Icon name="left" /></button>
      {Array.from({ length: pages }, (_, i) => (
        <button key={i} className={`btn btn-ghost${i === page ? ' strong' : ''}`}
          style={i === page ? { color: 'var(--text-strong)' } : undefined} onClick={() => onChange(i)}>{i + 1}</button>
      ))}
      <button className="btn btn-ghost" disabled={!hasNext} onClick={() => onChange(page + 1)} aria-label="다음 쪽"><Icon name="right" /></button>
    </div>
  );
}
