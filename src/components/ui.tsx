import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { imageApi } from '../api/endpoints';
import type { ImageType, PostCard, PostStatus } from '../api/types';
import { ago, CATEGORY_LABEL, DISTANCE_LABEL, STATUS_LABEL, won } from '../lib/format';
import { useToast } from '../lib/session';

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

/** 공구 카드 (02 홈, 07 내 공구함) */
export function PostCardView({ post, footer }: { post: PostCard; footer?: ReactNode }) {
  return (
    <div className="stack sm">
      <Link to={`/posts/${post.postId}`} className="post-card">
        <ImageBox src={post.thumbnailUrl} />
        <div className="post-card-body">
          <div className="row small muted" style={{ gap: 8 }}>
            <StatusBadge status={post.status} />
            <span>{post.dongName}{post.distance ? ` · ${DISTANCE_LABEL[post.distance]}` : ''} · {ago(post.createdAt)}</span>
          </div>
          <div className="post-card-title">{post.title}</div>
          <div className="post-card-price">1단위({post.baseUnit}) {won(post.unitPrice)}</div>
          <Progress value={post.filledUnits} max={post.totalUnits} />
          <div className="small muted">
            {post.filledUnits} / {post.totalUnits}단위 · {post.participantCount}명 참여 · {CATEGORY_LABEL[post.category]}
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
          style={{ width: 96, height: 96, borderRadius: 8, border: '1px dashed #bfbfbf', background: '#fafafa', cursor: 'pointer' }}
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
      <button className="btn btn-ghost" disabled={page === 0} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: pages }, (_, i) => (
        <button key={i} className={`btn btn-ghost${i === page ? ' strong' : ''}`}
          style={i === page ? { color: '#1a1a1a' } : undefined} onClick={() => onChange(i)}>{i + 1}</button>
      ))}
      <button className="btn btn-ghost" disabled={!hasNext} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}
