import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../api/endpoints';
import type { ActionRequired, MyPostCard, MyPostFilter, MyPostTab, Page } from '../api/types';
import LocationPicker from '../components/LocationPicker';
import { Avatar, Empty, Modal, PostCardView } from '../components/ui';
import { pt } from '../lib/format';
import { useSession, useToast } from '../lib/session';

const FILTERS: { value: MyPostFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'HOST', label: '내가 연 공구 (HOST)' },
  { value: 'JOINED', label: '참여한 공구' },
  { value: 'ACTION_REQUIRED', label: '내 액션 필요' },
];

const ACTION_LABEL: Record<ActionRequired, string> = {
  PROPOSE_PLACE: '나눔 장소 제안하기 →',
  AGREE_PLACE: '나눔 장소 확인하고 동의하기 →',
  ORDER: '영수증 등록하고 주문하기 →',
  SHIP: '배송 시작하기 →',
  DISTRIBUTE: '나눔 일시 정하기 →',
  CONFIRM_RECEIPT: '받았어요 ✓',
  WRITE_REVIEW: '후기 남기기 →',
  PAY_DEBT: '미수금 납부 →',
};

/** 07 마이페이지 · 내 공구함 */
export default function MyPage() {
  const { me, logout, refresh } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<MyPostTab>('ONGOING');
  const [filter, setFilter] = useState<MyPostFilter>('ALL');
  const [data, setData] = useState<Page<MyPostCard> | null>(null);
  const [editingDong, setEditingDong] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    let alive = true;
    userApi.myPosts(tab, filter).then((d) => { if (alive) setData(d); }).catch((e) => toast.error(e));
    return () => { alive = false; };
  }, [tab, filter, toast]);

  if (!me) return null;

  return (
    <div className="page">
      <div className="row split" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="card stack" style={{ width: 280, flexShrink: 0 }}>
          <Avatar name={me.nickname} size="lg" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{me.nickname}</div>
            <div className="row small" style={{ gap: 6, marginTop: 6 }}>
              <span className="badge muted">✓ 학교 인증</span>
              <span className="muted">{me.universityName ?? '학교명 없음'}</span>
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>{me.email}</div>
            <div className="small muted">📍 {me.location?.dongName ?? '동네 미설정'}</div>
            <div className="small muted">★ {me.rating ?? '-'} (후기 {me.reviewCount}) · 거래 {me.tradeCount}회</div>
          </div>
          <hr className="divider" />
          <div className="row between" style={{ textAlign: 'center' }}>
            <div><div className="strong" style={{ fontSize: 18 }}>{me.postCounts.ongoing}</div><div className="small muted">진행중</div></div>
            <div><div className="strong" style={{ fontSize: 18 }}>{me.postCounts.done}</div><div className="small muted">완료</div></div>
            <div><div className="strong" style={{ fontSize: 18 }}>{pt(me.point.availableBalance)}</div><div className="small muted">포인트</div></div>
          </div>
          {me.point.heldAmount > 0 && <div className="small muted">공구에 보관 중(보류) {pt(me.point.heldAmount)}</div>}
          <hr className="divider" />
          <div className="stack sm">
            <button className="btn btn-ghost row between" style={{ justifyContent: 'space-between' }} onClick={() => setFilter('ACTION_REQUIRED')}>
              <span>할 일 {me.postCounts.actionRequired}건</span><span>›</span></button>
            <Link to="/points" className="btn btn-ghost" style={{ justifyContent: 'space-between' }}><span>포인트 내역</span><span>›</span></Link>
            <button className="btn btn-ghost" style={{ justifyContent: 'space-between' }} onClick={() => setEditingDong(true)}>
              <span>동네 설정</span><span>›</span></button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}
              onClick={async () => { await logout(); toast.ok('로그아웃했어요'); navigate('/login'); }}>로그아웃</button>
          </div>
        </div>

        <div className="grow stack">
          <h1 style={{ fontSize: 22, margin: 0 }}>내 공구함</h1>
          <div className="row" style={{ gap: 24, borderBottom: '1px solid #e6e6e6' }}>
            {(['ONGOING', 'DONE'] as const).map((t) => (
              <button key={t} className="btn btn-ghost" onClick={() => setTab(t)}
                style={{ padding: '8px 0', borderRadius: 0, color: tab === t ? '#1a1a1a' : '#808080', fontWeight: tab === t ? 700 : 400,
                  borderBottom: tab === t ? '2px solid #333' : '2px solid transparent' }}>
                {t === 'ONGOING' ? `진행중 공구 ${me.postCounts.ongoing}` : `완료 공구 ${me.postCounts.done}`}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {FILTERS.map((f) => (
              <button key={f.value} className={`chip${filter === f.value ? ' active' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>
            ))}
          </div>

          {!data ? <Empty>불러오는 중…</Empty> : data.content.length === 0 ? (
            <Empty>공구가 없어요. <Link to="/" style={{ textDecoration: 'underline' }}>근처 공구 보러 가기</Link></Empty>
          ) : (
            <div className="post-grid">
              {data.content.map((c) => (
                <PostCardView key={c.post.postId} post={c.post} footer={
                  <div className="stack sm">
                    <div className="small muted">{c.myRole === 'HOST' ? 'HOST' : '참여'} · 내 몫 {c.myUnits}단위
                      {c.reviewProgress ? ` · 후기 ${c.reviewProgress.written}/${c.reviewProgress.total}` : ''}</div>
                    <Link to={`/posts/${c.post.postId}`} className={`btn btn-block ${c.actionRequired ? 'btn-primary' : 'btn-secondary'}`}>
                      {c.actionRequired ? ACTION_LABEL[c.actionRequired] : '진행 상태 보기 →'}
                    </Link>
                  </div>
                } />
              ))}
            </div>
          )}
        </div>
      </div>

      {editingDong && (
        <Modal title="동네 설정" onClose={() => setEditingDong(false)}>
          <LocationPicker onDone={() => setEditingDong(false)} />
        </Modal>
      )}
    </div>
  );
}
