import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/endpoints';
import type { ParticipationRole, ProfileResponse, ReceivedReview } from '../api/types';
import { CATEGORY_LABEL, STATUS_LABEL, TAG_LABEL } from '../lib/format';
import { useSession, useToast } from '../lib/session';
import type { ReportPostState } from '../pages/ReportPage';
import { Avatar, Modal } from './ui';

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const mmdd = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * 08 유저 프로필 (모달). 상세의 호스트 카드·참여자 목록, 채팅방 참여자에서 연다.
 * 별점·받은 후기·최근 거래를 보여주고, 다른 사람이면 신고하기·차단하기 버튼을 둔다.
 */
export default function ProfileModal({ userId, role, post, onClose }: {
  userId: number; role?: ParticipationRole; post?: ReportPostState; onClose: () => void;
}) {
  const { me } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [allReviews, setAllReviews] = useState<ReceivedReview[] | null>(null);
  const [reviewPage, setReviewPage] = useState({ page: 0, hasNext: false });
  const [busy, setBusy] = useState(false);

  const load = () => userApi.profile(userId).then(setProfile).catch((e) => { toast.error(e); onClose(); });
  useEffect(() => { load(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReviews = async (page: number) => {
    try {
      const res = await userApi.reviews(userId, page);
      setAllReviews((prev) => (page === 0 ? res.content : [...(prev ?? []), ...res.content]));
      setReviewPage({ page, hasNext: res.hasNext });
    } catch (e) {
      toast.error(e);
    }
  };

  const toggleBlock = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.isBlocked) await userApi.unblock(userId);
      else await userApi.block(userId);
      toast.ok(profile.isBlocked ? '차단을 풀었어요' : '차단했어요. 서로의 공구와 채팅이 보이지 않아요.');
      await load();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return <Modal title="프로필" onClose={onClose}><div className="muted">불러오는 중…</div></Modal>;
  }

  const isMe = me?.userId === profile.userId;
  const reviews = allReviews
    ? allReviews.map((r) => ({ key: r.reviewId, nickname: r.reviewerNickname, title: r.postTitle, rating: r.rating, content: r.content, date: r.createdAt }))
    : profile.recentReviews.map((r, i) => ({ key: i, nickname: r.reviewerNickname, title: r.postTitle, rating: r.rating, content: r.content, date: r.createdAt }));

  return (
    <Modal title="프로필" onClose={onClose}>
      <div className="row" style={{ gap: 16 }}>
        <Avatar name={profile.nickname} size="lg" />
        <div className="stack sm grow">
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{profile.nickname}</span>
            {role === 'HOST' && <span className="badge muted">HOST</span>}
            {isMe && <span className="badge outline">나</span>}
          </div>
          <div className="small muted">
            {profile.universityName ? `✓ ${profile.universityName} 인증` : '학교 인증'}
            {profile.dongName ? ` · 📍 ${profile.dongName}` : ''} · 가입 {profile.joinedAt.slice(0, 7).replace('-', '.')}
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <div className="stat-box">
          <div style={{ fontSize: 18, fontWeight: 700 }}>★ {profile.rating ?? '-'}</div>
          <div className="small muted">평점 · 후기 {profile.reviewCount}개</div>
        </div>
        <div className="stat-box">
          <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.tradeCount}회</div>
          <div className="small muted">거래 횟수</div>
        </div>
        <div className="stat-box">
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {profile.mainCategories.length > 0 ? profile.mainCategories.map((c) => CATEGORY_LABEL[c]).join(' · ') : '-'}
          </div>
          <div className="small muted">주 거래 카테고리</div>
        </div>
      </div>

      {profile.tagCounts.length > 0 && (
        <div className="row wrap" style={{ gap: 6 }}>
          {profile.tagCounts.map((t) => <span key={t.tag} className="chip">{TAG_LABEL[t.tag]} {t.count}</span>)}
        </div>
      )}

      <hr className="divider" />
      <div className="row between">
        <span className="strong">받은 후기 {profile.reviewCount}</span>
        {!allReviews && profile.reviewCount > profile.recentReviews.length && (
          <button className="btn btn-ghost small" onClick={() => loadReviews(0)}>전체보기 ›</button>
        )}
      </div>
      {reviews.length === 0 ? <div className="small muted">아직 받은 후기가 없어요.</div> : (
        <div className="stack sm">
          {reviews.map((r) => (
            <div key={r.key} style={{ background: '#f7f7f7', borderRadius: 8, padding: '10px 14px' }}>
              <div className="row between small">
                <span style={{ letterSpacing: 1 }}>{stars(r.rating)}</span>
                <span className="muted">{r.nickname} · {r.title} · {mmdd(r.date)}</span>
              </div>
              <div className="small" style={{ marginTop: 4 }}>{r.content || '별점만 남겼어요.'}</div>
            </div>
          ))}
          {allReviews && reviewPage.hasNext && (
            <button className="btn btn-ghost small" onClick={() => loadReviews(reviewPage.page + 1)}>후기 더 보기</button>
          )}
        </div>
      )}

      {profile.recentTrades.length > 0 && (
        <>
          <span className="strong">최근 거래</span>
          <div className="stack sm">
            {profile.recentTrades.map((t) => (
              <div key={t.postId} className="row between small">
                <span className="row" style={{ gap: 8 }}>
                  <span className="badge muted">{t.role === 'HOST' ? 'HOST' : '참여'}</span>{t.title}
                </span>
                <span className="muted">{t.settledAt ? `${mmdd(t.settledAt)} 완료` : STATUS_LABEL[t.status]}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!isMe && (
        <>
          <hr className="divider" />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary grow" onClick={() => {
              onClose();
              navigate(`/report?userId=${profile.userId}`, { state: post ? { post } : null });
            }}>🚩 신고하기</button>
            <button className="btn btn-secondary grow" disabled={busy} onClick={toggleBlock}>
              {profile.isBlocked ? '차단 해제' : '차단하기'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
