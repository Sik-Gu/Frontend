import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { postApi } from '../api/endpoints';
import type { OrderDetail, ParticipationRole, ParticipationStatusResponse, PaymentStatus, PostDetail, PostStatus, ReviewTag, ReviewTargetsResponse } from '../api/types';
import ProfileModal from '../components/ProfileModal';
import { canEditPost } from './PostEditPage';
import { Avatar, Icon, ImageBox, ImageUploader, Modal, Progress, StatusBadge } from '../components/ui';
import {
  CATEGORY_LABEL, DISTANCE_LABEL, fullDateTime, pt, RECEIPT_LABEL, remaining, STATUS_LABEL, STATUS_STEPS,
  TAG_LABEL, toLocalDateTime, won,
} from '../lib/format';
import { useSession, useToast } from '../lib/session';

const STEP_GUIDE: Record<string, string> = {
  RECRUITING: '총 단위가 모두 모이면 자동으로 모집완료돼요',
  RECRUITED: '호스트가 나눔 장소를 제안하고, 모두 동의하면 주문해요',
  ORDERED: '호스트가 주문을 마쳤어요. 배송을 기다리는 중이에요',
  SHIPPING: '상품이 오는 중이에요. 도착하면 호스트가 나눔 일시를 정해요',
  DISTRIBUTED: '물건을 받으면 ‘받았어요’를 눌러 주세요. 모두 누르면 자동 정산돼요',
  SETTLED: '정산이 끝났어요. 3일 안에 후기를 남겨 주세요',
  CANCELLED: '취소된 공구예요. 결제한 포인트는 모두 환급됐어요',
};

/** 03 공구 상세 (03-B~E: 상태·역할에 따라 버튼이 바뀐다) */
export default function PostDetailPage() {
  const { postId: idParam } = useParams();
  const postId = Number(idParam);
  const { me, refresh: refreshMe } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [status, setStatus] = useState<ParticipationStatusResponse | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewTargetsResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [profileOf, setProfileOf] = useState<{ userId: number; role: ParticipationRole } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await postApi.detail(postId);
      setPost(d);
      const member = d.me !== null;
      setStatus(member ? await postApi.participations(postId).catch(() => null) : null);
      const ordered = ['ORDERED', 'SHIPPING', 'DISTRIBUTED', 'SETTLED'].includes(d.status);
      setOrder(member && ordered ? await postApi.order(postId).catch(() => null) : null);
      setReviews(member && d.status === 'SETTLED' ? await postApi.reviewTargets(postId).catch(() => null) : null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
      else toast.error(e);
    }
  }, [postId, toast]);

  useEffect(() => { load(); }, [load]);

  /** 버튼 동작 공통: 실행 → 성공 알림 → 상세·내 포인트 새로고침 */
  const act = useCallback(async (fn: () => Promise<unknown>, success: string | ((r: unknown) => string)) => {
    try {
      const r = await fn();
      toast.ok(typeof success === 'function' ? success(r) : success);
      await Promise.all([load(), refreshMe()]);
      return true;
    } catch (e) {
      toast.error(e);
      await load();
      return false;
    }
  }, [load, refreshMe, toast]);

  if (notFound) return <div className="page"><div className="card">공구를 찾을 수 없어요 (없거나, 차단 관계라 볼 수 없어요). <Link to="/">홈으로</Link></div></div>;
  if (!post || !me) return <div className="page muted">불러오는 중…</div>;

  const isHost = post.host.userId === me.userId;
  const isMember = post.me !== null;
  const remainingUnits = post.totalUnits - post.filledUnits;
  const images = post.imageUrls.length > 0 ? post.imageUrls : [null];

  return (
    <div className="page stack lg">
      <div className="small muted">
        <Link to="/">홈</Link><Icon name="right" size={12} />{CATEGORY_LABEL[post.category]}<Icon name="right" size={12} />{post.title}
      </div>

      {/* 진행 상태 */}
      <div className="card stack" style={{ padding: '20px 28px' }}>
        <div className="row between">
          <div className="row"><span className="strong">진행 상태</span><StatusBadge status={post.status} /></div>
          <span className="small muted">{STEP_GUIDE[post.status]}</span>
        </div>
        {post.status === 'CANCELLED' ? (
          <div className="notice">취소 시각 {fullDateTime(post.statusTimeline.cancelledAt)}</div>
        ) : (
          <div className="stepper">
            {STATUS_STEPS.map((s, i) => {
              const current = STATUS_STEPS.indexOf(post.status);
              return (
                <div key={s} className={`step${i < current ? ' done' : ''}${i === current ? ' current' : ''}`}>
                  <span className="dot">{i < current ? <Icon name="check" size={14} label="완료" /> : i + 1}</span>{STATUS_LABEL[s]}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="row split" style={{ alignItems: 'flex-start', gap: 28 }}>
        {/* 왼쪽 */}
        <div className="grow stack lg">
          <div className="stack sm">
            <ImageBox src={images[imageIndex]} label="상품 대표 이미지" style={{ height: 440, borderRadius: 12 }} />
            {post.imageUrls.length > 1 && (
              <div className="row" style={{ gap: 10 }}>
                {post.imageUrls.map((u, i) => (
                  <button key={u} onClick={() => setImageIndex(i)} style={{ border: i === imageIndex ? '2px solid var(--primary)' : '1px solid var(--surface-muted)', padding: 0, borderRadius: 8, cursor: 'pointer', background: 'none' }}>
                    <ImageBox src={u} style={{ width: 96, height: 70, borderRadius: 7 }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card stack">
            <div className="section-title" style={{ margin: 0 }}>상품 설명</div>
            <div className="small muted">상품명: {post.productName}</div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{post.content || '내용이 없어요.'}</p>
            {post.productLink && (
              <a className="notice row between" href={post.productLink} target="_blank" rel="noreferrer">
                <span className="row" style={{ gap: 6, minWidth: 0 }}><Icon name="link" />{post.productLink.length > 50 ? `${post.productLink.slice(0, 50)}…` : post.productLink}</span>
                <span className="strong row" style={{ gap: 4 }}>상품 링크 열기<Icon name="external" size={14} /></span>
              </a>
            )}
            <hr className="divider" />
            <div className="row between small"><span className="muted">거래 동네</span><span className="strong">{post.dongName}</span></div>
            <div className="row between small"><span className="muted">나눔 장소</span>
              <span className="strong">{post.distributionPlace?.name ?? '호스트가 아직 제안하지 않았어요'}</span></div>
            <div className="row between small"><span className="muted">수령 일시</span>
              <span className="strong">{order?.distributeAt ? fullDateTime(order.distributeAt) : '채팅방에서 협의'}</span></div>
          </div>

          <ParticipantsCard post={post} status={status} onProfile={(userId, role) => setProfileOf({ userId, role })} />

          {order && (
            <div className="card stack">
              <div className="section-title" style={{ margin: 0 }}>주문 정보</div>
              <div className="row between small"><span className="muted">주문 시각</span><span>{fullDateTime(order.registeredAt)}</span></div>
              <div className="row between small"><span className="muted">총 금액</span><span>{won(order.totalPrice)}</span></div>
              <div className="row between small"><span className="muted">택배</span>
                <span>{order.courier ? `${order.courier} ${order.trackingNumber}` : '입력 안 함 (직접 구매 등)'}</span></div>
              <div className="row between small"><span className="muted">보관 중인 포인트</span><span>{pt(order.heldPoint)}</span></div>
              <div className="small muted">영수증</div>
              <div className="row wrap" style={{ gap: 8 }}>
                {order.receiptImageUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer"><ImageBox src={u} style={{ width: 110, height: 110, borderRadius: 8 }} /></a>
                ))}
              </div>
            </div>
          )}

          {reviews && <ReviewCard data={reviews} postId={post.postId} onDone={load} />}
        </div>

        {/* 오른쪽 */}
        <div className="stack" style={{ width: 460, flexShrink: 0 }}>
          <div className="card stack">
            <div className="row"><StatusBadge status={post.status} /><span className="small muted">{CATEGORY_LABEL[post.category]}</span></div>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <h1 style={{ fontSize: 24, margin: 0 }}>{post.title}</h1>
              {canEditPost(post, me.userId) && (
                <Link to={`/posts/${post.postId}/edit`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>수정</Link>
              )}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>1단위 {won(post.unitPrice)}</div>
            <div className="small muted">기본 단위: {post.baseUnit} · 총 {post.totalUnits}단위 ({won(post.totalPrice)})</div>
            <hr className="divider" />
            <div className="row between small"><span className="muted">위치</span>
              <span>{post.dongName}{post.distance ? ` · ${DISTANCE_LABEL[post.distance]}` : ''}</span></div>
            <div className="row between small"><span className="muted">등록일</span><span>{fullDateTime(post.createdAt)}</span></div>
            <div className="row between small"><span className="muted">조회수</span><span className="tabular">{post.viewCount.toLocaleString('ko-KR')}</span></div>
            <div className="row between small"><span className="muted">모집 마감</span>
              <span>{fullDateTime(post.deadlineAt)} {post.status === 'RECRUITING' ? `(${remaining(post.deadlineAt)})` : ''}</span></div>
            <Progress value={post.filledUnits} max={post.totalUnits} />
            <div className="small strong">{post.filledUnits} / {post.totalUnits}단위 · {post.participantCount}명 참여 · {remainingUnits}단위 남음</div>
            <div className="row" style={{ background: 'var(--surface-muted)', borderRadius: 8, padding: 12 }}>
              <button type="button" className="link-button" title="프로필 보기"
                onClick={() => setProfileOf({ userId: post.host.userId, role: 'HOST' })}><Avatar name={post.host.nickname} /></button>
              <div className="grow">
                <button type="button" className="link-button strong" title="프로필 보기"
                  onClick={() => setProfileOf({ userId: post.host.userId, role: 'HOST' })}>{post.host.nickname}{isHost ? ' (나)' : ''}</button>
                <div className="small muted">평점 {post.host.rating ?? '-'} · 거래 {post.host.tradeCount}회
                  {post.host.mainCategories.length > 0 ? ` · 주로 ${post.host.mainCategories.map((c) => CATEGORY_LABEL[c]).join('·')}` : ''}</div>
              </div>
              <span className="badge muted">HOST</span>
            </div>
          </div>

          <ActionPanel post={post} isHost={isHost} isMember={isMember} status={status} act={act}
            onCancelled={() => navigate('/me')} />
        </div>
      </div>

      {profileOf && (
        <ProfileModal userId={profileOf.userId} role={profileOf.role} onClose={() => setProfileOf(null)}
          post={{ postId: post.postId, title: post.title, thumbnailUrl: post.imageUrls[0] ?? null, chatRoomId: post.chatRoomId }} />
      )}
    </div>
  );
}

function ParticipantsCard({ post, status, onProfile }: {
  post: PostDetail; status: ParticipationStatusResponse | null; onProfile: (userId: number, role: ParticipationRole) => void;
}) {
  if (status) {
    return (
      <div className="card stack">
        <div className="row between">
          <div className="section-title" style={{ margin: 0 }}>참여자 · 결제/수령 현황</div>
          <span className="small muted">결제 {status.paidCount}/{status.totalCount} · 수령 {status.receivedCount}/{status.totalCount}</span>
        </div>
        {status.participants.map((p) => {
          const agreed = post.participants?.find((x) => x.userId === p.userId)?.placeAgreed;
          return (
            <div key={p.userId} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <button type="button" className="link-button" title="프로필 보기" onClick={() => onProfile(p.userId, p.role)}><Avatar name={p.nickname} /></button>
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className="link-button strong" title="프로필 보기" onClick={() => onProfile(p.userId, p.role)}>{p.nickname}{p.isMe ? ' (나)' : ''}</button>
                  {p.role === 'HOST' && <span className="badge muted">HOST</span>}
                </div>
                <div className="small muted">
                  {pt(p.paidPoint)} {payLabel(p.paymentStatus, post.status)} · {RECEIPT_LABEL[p.receiptStatus]}
                  {post.distributionPlace?.name && ['RECRUITING', 'RECRUITED'].includes(post.status)
                    ? ` · 장소 ${agreed ? '동의함' : '대기'}` : ''}
                </div>
              </div>
              <span className="strong">{p.units}단위</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="card stack">
      <div className="section-title" style={{ margin: 0 }}>참여자 정보 <span className="small muted">{post.participantCount}명 · {post.filledUnits} / {post.totalUnits}단위</span></div>
      {(post.participants ?? []).map((p) => (
        <div key={p.userId} className="row" style={{ padding: '6px 0' }}>
          <button type="button" className="link-button" title="프로필 보기" onClick={() => onProfile(p.userId, p.role)}><Avatar name={p.nickname} /></button>
          <div className="grow">
            <div className="row" style={{ gap: 6 }}><button type="button" className="link-button strong" title="프로필 보기" onClick={() => onProfile(p.userId, p.role)}>{p.nickname}</button>{p.role === 'HOST' && <span className="badge muted">HOST</span>}</div>
            <div className="small muted">평점 {p.rating ?? '신규'} · 거래 {p.tradeCount}회</div>
          </div>
          <span className="strong">{p.units}단위</span>
        </div>
      ))}
      {post.totalUnits - post.filledUnits > 0 && (
        <div className="small muted">{post.totalUnits - post.filledUnits}단위 남음 · 참여를 기다리고 있어요</div>
      )}
    </div>
  );
}

type Act = (fn: () => Promise<unknown>, success: string | ((r: unknown) => string)) => Promise<boolean>;

/** 오른쪽 아래: 지금 내가 할 수 있는 행동 */
/** 결제 상태 문구: 정산이 끝나면 더 이상 '보류'가 아니다 */
function payLabel(paymentStatus: PaymentStatus, postStatus: PostStatus) {
  if (paymentStatus === 'REFUNDED') return '환급됨';
  return postStatus === 'SETTLED' ? '결제 · 정산 완료' : '결제(보류)';
}

function ActionPanel({ post, isHost, isMember, status, act, onCancelled }: {
  post: PostDetail; isHost: boolean; isMember: boolean; status: ParticipationStatusResponse | null;
  act: Act; onCancelled: () => void;
}) {
  const { me } = useSession();
  const [units, setUnits] = useState(1);
  const [moreUnits, setMoreUnits] = useState(1);
  const [placeName, setPlaceName] = useState(post.distributionPlace?.name ?? '');
  const [receipts, setReceipts] = useState<string[]>([]);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [distributeAt, setDistributeAt] = useState('');
  const [confirming, setConfirming] = useState<null | 'cancel' | 'leave' | 'disagree'>(null);

  const id = post.postId;
  const beforeOrder = post.status === 'RECRUITING' || post.status === 'RECRUITED';
  const place = post.distributionPlace;
  const balance = me?.point.availableBalance ?? 0;
  const max = Math.max(1, post.maxSelectableUnits);

  const blocks: React.ReactNode[] = [];

  // ----- 참여 전 -----
  if (!isMember) {
    if (post.status === 'RECRUITING' && post.maxSelectableUnits > 0) {
      const price = post.unitPrice * units;
      blocks.push(
        <div key="join" className="stack">
          <div className="stack sm" style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
            <div className="row between">
              <span className="strong">구매 수량</span>
              <div className="row" style={{ gap: 0, border: '1px solid var(--line-strong)', borderRadius: 8, background: '#fff' }}>
                <button className="btn btn-ghost" disabled={units <= 1} onClick={() => setUnits(units - 1)}>−</button>
                <span className="strong tabular" style={{ width: 32, textAlign: 'center' }}>{units}</span>
                <button className="btn btn-ghost" disabled={units >= max} onClick={() => setUnits(units + 1)}>+</button>
              </div>
            </div>
            <div className="row between">
              <span className="small muted">1단위 = {post.baseUnit} · 최대 {post.maxSelectableUnits}단위 선택 가능</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{won(price)}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => act(() => postApi.join(id, units), (r) => {
            const j = r as { paidPoint: number; balanceAfter: number };
            return `참여했어요! ${pt(j.paidPoint)} 결제(보류) · 남은 포인트 ${pt(j.balanceAfter)}`;
          })}>{units}단위 참여하기 · {pt(price)}</button>
          {balance < price && (
            <div className="notice danger small">
              사용 가능 포인트 {pt(balance)}로는 부족해요 ({pt(price - balance)} 더 필요). <Link to="/points" style={{ textDecoration: 'underline' }}>충전하기</Link>
            </div>
          )}
          <p className="small muted" style={{ margin: 0 }}>참여하면 바로 포인트가 결제되어 보관(보류)되고, 정산 때 호스트에게 전달돼요. 모집 중 취소하면 전액 환급돼요.</p>
        </div>,
      );
    } else if (post.status !== 'CANCELLED') {
      blocks.push(<div key="closed" className="notice">모집이 끝난 공구예요.</div>);
    }
  }

  // ----- 참여 중 공통 -----
  if (isMember && post.me) {
    blocks.push(
      <div key="mine" className="row between" style={{ background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
        <span>내 몫 <b>{post.me.units}단위</b> · {pt(post.unitPrice * post.me.units)} {payLabel(post.me.paymentStatus, post.status)}</span>
        <span className="badge outline">{RECEIPT_LABEL[post.me.receiptStatus]}</span>
      </div>,
    );
    // 모집중이고 남은 단위가 있으면 내 몫을 늘릴 수 있다 (줄이기는 없음)
    const left = post.totalUnits - post.filledUnits;
    if (post.status === 'RECRUITING' && left > 0) {
      const addCount = Math.min(moreUnits, left);
      const addPrice = post.unitPrice * addCount;
      blocks.push(
        <div key="more" className="stack sm" style={{ border: '1px solid var(--surface-muted)', borderRadius: 10, padding: 14 }}>
          <div className="row between">
            <span className="strong">수량 추가</span>
            <div className="row" style={{ gap: 0, border: '1px solid var(--line-strong)', borderRadius: 8, background: '#fff' }}>
              <button className="btn btn-ghost" disabled={addCount <= 1} onClick={() => setMoreUnits(addCount - 1)}>−</button>
              <span className="strong tabular" style={{ width: 32, textAlign: 'center' }}>{addCount}</span>
              <button className="btn btn-ghost" disabled={addCount >= left} onClick={() => setMoreUnits(addCount + 1)}>+</button>
            </div>
          </div>
          <div className="small muted">남은 {left}단위 안에서 늘릴 수 있어요 · 늘린 만큼 바로 결제(보류)돼요</div>
          <button className="btn btn-secondary btn-block" onClick={async () => {
            if (await act(() => postApi.addUnits(id, addCount), (r) => {
              const j = r as { paidPoint: number; balanceAfter: number; postStatus: string };
              return `${addCount}단위를 더 담았어요! ${pt(j.paidPoint)} 결제(보류) · 남은 포인트 ${pt(j.balanceAfter)}`
                + (j.postStatus === 'RECRUITED' ? ' · 모집이 완료됐어요' : '');
            })) setMoreUnits(1);
          }}>+{addCount}단위 추가하기 · {pt(addPrice)}</button>
          {balance < addPrice && (
            <div className="notice danger small">사용 가능 포인트 {pt(balance)}로는 부족해요. <Link to="/points" style={{ textDecoration: 'underline' }}>충전하기</Link></div>
          )}
        </div>,
      );
    }
    if (post.chatRoomId) {
      blocks.push(<Link key="chat" to={`/chats/${post.chatRoomId}`} className="btn btn-secondary btn-block"><Icon name="chat" />채팅방 가기</Link>);
    }
  }

  // ----- 나눔 장소 (주문 전) -----
  if (isMember && beforeOrder) {
    if (isHost) {
      blocks.push(
        <div key="place" className="stack sm">
          <div className="strong">나눔 장소 {place?.name ? '변경' : '제안'}</div>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="예) 중앙대 정문 앞" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
            <button className="btn btn-secondary" disabled={!placeName.trim()}
              onClick={() => act(() => postApi.proposePlace(id, placeName.trim()), '나눔 장소를 제안했어요. 참여자 동의를 기다려요.')}>제안</button>
          </div>
          {place?.name && <div className="small muted">현재 ‘{place.name}’ · 동의 {place.agreedCount}/{place.memberCount}{place.allAgreed ? ' · 모두 동의' : ''}</div>}
        </div>,
      );
    } else if (place?.name) {
      blocks.push(
        <div key="agree" className="stack sm" style={{ border: '1px solid var(--surface-muted)', borderRadius: 10, padding: 14 }}>
          <div>호스트가 제안한 나눔 장소: <b>{place.name}</b></div>
          <div className="small muted">동의 {place.agreedCount}/{place.memberCount}</div>
          {place.myAgreed ? <div className="small strong">동의했어요</div> : (
            <div className="row">
              <button className="btn btn-primary grow" onClick={() => act(() => postApi.agreePlace(id), '나눔 장소에 동의했어요')}>동의</button>
              <button className="btn btn-danger" onClick={() => setConfirming('disagree')}>의견이 달라 나가기</button>
            </div>
          )}
        </div>,
      );
    }
  }

  // ----- 호스트 진행 -----
  if (isHost && post.status === 'RECRUITED') {
    const canOrder = place?.allAgreed;
    blocks.push(
      <div key="order" className="stack sm">
        <div className="strong">영수증 등록하고 주문 완료하기</div>
        {!canOrder && <div className="small muted">나눔 장소를 제안하고 참여자 모두 동의해야 주문할 수 있어요.</div>}
        <ImageUploader type="RECEIPT" urls={receipts} onChange={setReceipts} max={5} label="+ 영수증" />
        <button className="btn btn-primary btn-block" disabled={!canOrder || receipts.length === 0}
          onClick={async () => { if (await act(() => postApi.registerOrder(id, receipts), '주문 완료! 참여자에게 알렸어요.')) setReceipts([]); }}>
          영수증 등록하고 주문 완료
        </button>
      </div>,
    );
  }
  if (isHost && post.status === 'ORDERED') {
    blocks.push(
      <div key="ship" className="stack sm">
        <div className="strong">배송 시작</div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" placeholder="택배사 (선택)" value={courier} onChange={(e) => setCourier(e.target.value)} />
          <input className="input" placeholder="송장번호 (선택)" value={tracking} onChange={(e) => setTracking(e.target.value.replace(/[^\d-]/g, ''))} />
        </div>
        <div className="small muted">직접 사 오는 경우 비워 두고 눌러도 돼요. 택배사와 송장번호는 함께 입력해야 해요.</div>
        <button className="btn btn-primary btn-block" onClick={() => act(() => postApi.ship(id, courier.trim(), tracking.trim()), '배송을 시작했어요')}>배송 시작</button>
      </div>,
    );
  }
  if (isHost && post.status === 'SHIPPING') {
    blocks.push(
      <div key="dist" className="stack sm">
        <div className="strong">나눔 일시 정하기</div>
        <input className="input" type="datetime-local" value={distributeAt} onChange={(e) => setDistributeAt(e.target.value)} />
        <div className="small muted">장소는 합의한 ‘{place?.name ?? '-'}’ 그대로예요. 정하면 참여자가 ‘받았어요’를 누를 수 있어요 (호스트 몫은 자동 수령).</div>
        <button className="btn btn-primary btn-block" disabled={!distributeAt}
          onClick={() => act(() => postApi.distribute(id, toLocalDateTime(distributeAt)), '나눔 일시를 정했어요')}>나눔 일시 확정</button>
      </div>,
    );
  }

  // ----- 참여자 수령 -----
  if (isMember && !isHost && post.status === 'DISTRIBUTED' && post.me?.receiptStatus === 'WAITING') {
    blocks.push(
      <button key="receive" className="btn btn-primary btn-block"
        onClick={() => act(() => postApi.confirmReceipt(id), (r) => (r as { postStatus: string }).postStatus === 'SETTLED'
          ? '모두 받았어요! 정산이 끝나 호스트에게 포인트가 전달됐어요.' : '받았어요! 다른 참여자를 기다려요.')}>
        받았어요
      </button>,
    );
  }
  if (post.status === 'DISTRIBUTED' && status) {
    blocks.push(<div key="recv" className="small muted">수령 확인 {status.receivedCount}/{status.totalCount} · 모두 확인되면 자동 정산돼요</div>);
  }

  // ----- 취소·나가기 -----
  if (isHost && beforeOrder) {
    blocks.push(<button key="cancel" className="btn btn-danger btn-block" onClick={() => setConfirming('cancel')}>공구 취소 (전원 환급)</button>);
  }
  if (isMember && !isHost && beforeOrder) {
    blocks.push(<button key="leave" className="btn btn-ghost btn-block" onClick={() => setConfirming('leave')}>참여 취소</button>);
  }

  if (blocks.length === 0) blocks.push(<div key="none" className="notice">{STEP_GUIDE[post.status]}</div>);

  return (
    <div className="card stack">
      {blocks}
      {confirming && (
        <Modal title={confirming === 'cancel' ? '공구를 취소할까요?' : '공구에서 나갈까요?'} onClose={() => setConfirming(null)}>
          <p style={{ margin: 0 }}>
            {confirming === 'cancel'
              ? `참여자 ${post.participantCount}명(나 포함) 모두에게 결제한 포인트를 환급하고 채팅방을 닫아요.`
              : `결제한 ${pt(post.unitPrice * (post.me?.units ?? 0))}를 환급받고 채팅방에서 나가요.`}
          </p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setConfirming(null)}>아니요</button>
            <button className="btn btn-primary" onClick={async () => {
              const kind = confirming;
              setConfirming(null);
              if (kind === 'cancel') {
                const ok = await act(() => postApi.cancel(id), (r) => `공구를 취소했어요. ${(r as { refundedCount: number }).refundedCount}명에게 환급했어요.`);
                if (ok) onCancelled();
              } else {
                await act(() => postApi.leave(id, kind === 'disagree' ? 'PLACE_DISAGREEMENT' : 'CHANGED_MIND'),
                  (r) => `나왔어요. ${pt((r as { refundedPoint: number }).refundedPoint)} 환급됐어요.`);
              }
            }}>네, {confirming === 'cancel' ? '취소할게요' : '나갈게요'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ReviewCard({ data, postId, onDone }: { data: ReviewTargetsResponse; postId: number; onDone: () => void }) {
  const toast = useToast();
  const pending = data.targets.filter((t) => !t.written);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [tags, setTags] = useState<Record<number, ReviewTag[]>>({});
  const [busy, setBusy] = useState(false);

  if (!data.canWrite && pending.length > 0) {
    return <div className="card small muted">후기 작성 기간이 아니에요 (정산 후 3일까지{data.writableUntil ? `, ~${fullDateTime(data.writableUntil)}` : ''}).</div>;
  }
  if (pending.length === 0) {
    return <div className="card small muted">후기를 모두 남겼어요. 고마워요!</div>;
  }

  const submit = async () => {
    setBusy(true);
    try {
      await postApi.writeReviews(postId, pending.filter((t) => ratings[t.userId]).map((t) => ({
        targetUserId: t.userId, rating: ratings[t.userId], tags: tags[t.userId] ?? [],
      })));
      toast.ok('후기를 남겼어요');
      onDone();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <div className="section-title" style={{ margin: 0 }}>후기 남기기 <span className="small muted">~{fullDateTime(data.writableUntil)}</span></div>
      {pending.map((t) => (
        <div key={t.userId} className="stack sm" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
          <div className="row"><Avatar name={t.nickname} size="sm" /><span className="strong">{t.nickname}</span>
            {t.role === 'HOST' && <span className="badge muted">HOST</span>}</div>
          <div className="row" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="btn btn-ghost" style={{ fontSize: 22, padding: '0 2px', color: (ratings[t.userId] ?? 0) >= n ? 'var(--accent)' : 'var(--line-strong)' }}
                onClick={() => setRatings({ ...ratings, [t.userId]: n })} aria-label={`${n}점`}><Icon name="star" size={24} filled /></button>
            ))}
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {(Object.keys(TAG_LABEL) as ReviewTag[]).map((tag) => {
              const on = (tags[t.userId] ?? []).includes(tag);
              return (
                <button key={tag} className={`chip${on ? ' active' : ''}`} onClick={() => setTags({
                  ...tags, [t.userId]: on ? (tags[t.userId] ?? []).filter((x) => x !== tag) : [...(tags[t.userId] ?? []), tag],
                })}>{TAG_LABEL[tag]}</button>
              );
            })}
          </div>
        </div>
      ))}
      <button className="btn btn-primary" disabled={busy || Object.keys(ratings).length === 0} onClick={submit}>후기 보내기</button>
    </div>
  );
}
