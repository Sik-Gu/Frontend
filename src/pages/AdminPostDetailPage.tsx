import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../api/endpoints';
import type { AdminParticipantRow, AdminPostDetail } from '../api/types';
import { ImageBox, Modal, StatusBadge } from '../components/ui';
import { LEAVE_LABEL, PAYMENT_LABEL } from '../lib/adminLabels';
import { CATEGORY_LABEL, RECEIPT_LABEL, fullDateTime, pt, won } from '../lib/format';
import { useToast } from '../lib/session';
import { InquiryCard } from './AdminInquiriesPage';

/** 관리자: 공구 한 건의 모든 정보 + 강제 취소·대신 수령 처리·문의 처리 */
export default function AdminPostDetailPage() {
  const { postId } = useParams();
  const toast = useToast();
  const [data, setData] = useState<AdminPostDetail | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    adminApi.post(Number(postId)).then(setData).catch((e) => toast.error(e));
  }, [postId, toast]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="page muted">불러오는 중…</div>;
  const p = data;
  const cancellable = p.status === 'RECRUITING' || p.status === 'RECRUITED';
  const deletable = cancellable || p.status === 'CANCELLED' || p.status === 'SETTLED';
  const chatOpen = p.status !== 'CANCELLED' && p.status !== 'SETTLED';
  const t = p.timeline;
  const steps: [string, string | null][] = [
    ['등록', t.createdAt], ['모집 마감', t.deadlineAt], ['모집완료', t.recruitedAt], ['주문완료', t.orderedAt],
    ['배송', t.shippedAt], ['나눔 진행', t.distributedAt], ['정산완료', t.settledAt], ['취소', t.cancelledAt],
  ];

  return (
    <div className="page stack lg">
      <div>
        <Link to="/admin/posts" className="small muted">← 공구 목록</Link>
        <div className="row between wrap" style={{ marginTop: 8 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>{p.title} <span className="small muted">#{p.postId}</span></h1>
          <div className="row" style={{ gap: 8 }}>
            <StatusBadge status={p.status} />
            {cancellable && <button className="btn btn-secondary btn-sm" onClick={() => setCancelling(true)}>강제 취소</button>}
            {deletable && <button className="btn btn-danger btn-sm" onClick={() => setDeleting(true)}>삭제</button>}
          </div>
        </div>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {CATEGORY_LABEL[p.category]} · {p.dongName ?? '동네 없음'} · 방장{' '}
          <Link to={`/admin/users/${p.host.userId}`} style={{ textDecoration: 'underline' }}>{p.host.nickname}</Link>
          {p.host.status === 'SUSPENDED' && <span className="badge" style={{ marginLeft: 6, background: 'var(--danger)', color: '#fff' }}>정지</span>}
        </p>
      </div>

      <div className="row split" style={{ gap: 16, alignItems: 'stretch' }}>
        <section className="card grow stack">
          <h2 className="card-title" style={{ margin: 0 }}>공구 정보</h2>
          <div className="admin-facts">
            <Fact label="상품" value={p.productName} />
            <Fact label="단위" value={`${p.filledUnits} / ${p.totalUnits}`} />
            <Fact label="단위 가격 · 총액" value={`${won(p.unitPrice)} · ${won(p.totalPrice)}`} />
            <Fact label="나눔 장소" value={p.distributionPlaceName ?? '미정'} />
            <Fact label="조회수" value={String(p.viewCount)} />
            {p.productLink && <div className="stack sm" style={{ gap: 4 }}>
              <span className="small muted">상품 링크</span>
              <a href={p.productLink} target="_blank" rel="noreferrer" className="small" style={{ textDecoration: 'underline', wordBreak: 'break-all' }}>열기</a>
            </div>}
          </div>
          <div style={{ background: 'var(--surface-muted)', borderRadius: 8, padding: '10px 14px', whiteSpace: 'pre-wrap' }}>{p.content}</div>
          {p.imageUrls.length > 0 && (
            <div className="row wrap" style={{ gap: 8 }}>
              {p.imageUrls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><ImageBox src={u} style={{ width: 96, height: 96, borderRadius: 8 }} /></a>)}
            </div>
          )}
        </section>
        <section className="card stack" style={{ minWidth: 240 }}>
          <h2 className="card-title" style={{ margin: 0 }}>진행 기록</h2>
          {steps.filter(([, at]) => at).map(([label, at]) => (
            <div key={label} className="row between small"><span className="muted">{label}</span><span className="tabular">{fullDateTime(at)}</span></div>
          ))}
        </section>
      </div>

      {chatOpen && <ChatBox postId={p.postId} />}

      <section className="card stack">
        <h2 className="card-title" style={{ margin: 0 }}>참여자 ({p.participants.filter((x) => x.paymentStatus === 'PAID').length}명 참여 중)</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>이용자</th><th>역할</th><th className="num">단위 · 결제</th><th>참여</th><th>수령</th><th>참여 시각</th><th></th></tr>
            </thead>
            <tbody>
              {p.participants.map((x) => <ParticipantTr key={x.user.userId} row={x} postId={p.postId} distributed={p.status === 'DISTRIBUTED'} onChanged={load} />)}
            </tbody>
          </table>
        </div>
      </section>

      {p.order && (
        <section className="card stack">
          <h2 className="card-title" style={{ margin: 0 }}>주문 · 영수증</h2>
          <div className="admin-facts">
            <Fact label="주문 등록" value={fullDateTime(p.order.registeredAt)} />
            <Fact label="택배" value={p.order.courier ? `${p.order.courier} ${p.order.trackingNumber ?? ''}` : '-'} />
            <Fact label="나눔 일정" value={p.order.distributeAt ? `${fullDateTime(p.order.distributeAt)} · ${p.order.distributePlace ?? ''}` : '-'} />
          </div>
          {p.order.receiptImageUrls.length > 0 && (
            <div className="row wrap" style={{ gap: 8 }}>
              {p.order.receiptImageUrls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><ImageBox src={u} label="영수증" style={{ width: 96, height: 96, borderRadius: 8 }} /></a>)}
            </div>
          )}
        </section>
      )}

      <section className="stack">
        <h2 className="card-title" style={{ margin: 0 }}>수령 문의 ({p.inquiries.length})</h2>
        {p.inquiries.length === 0 ? <div className="card muted">문의가 없어요.</div>
          : p.inquiries.map((i) => <InquiryCard key={i.inquiryId} inquiry={i} onChanged={load} />)}
      </section>

      {deleting && <DeleteModal post={p} willRefund={cancellable} onClose={() => setDeleting(false)}
        onDone={() => { setDeleting(false); load(); }} />}
      {cancelling && <CancelModal post={p} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); load(); }} />}
    </div>
  );
}

function ParticipantTr({ row: x, postId, distributed, onChanged }: {
  row: AdminParticipantRow; postId: number; distributed: boolean; onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const active = x.paymentStatus === 'PAID';
  const canConfirm = distributed && active && x.receiptStatus === 'WAITING';

  const confirm = async () => {
    if (!window.confirm(`${x.user.nickname} 님 대신 '받았어요'를 누를까요? 마지막 사람이면 바로 정산돼요.`)) return;
    setBusy(true);
    try {
      const r = await adminApi.confirmReceipt(postId, x.user.userId);
      toast.ok(r.postStatus === 'SETTLED' ? '수령 처리했어요. 전원 받아서 정산까지 끝났어요.' : '수령 처리했어요.');
      onChanged();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr style={active ? undefined : { opacity: 0.6 }}>
      <td>
        <Link to={`/admin/users/${x.user.userId}`} className="strong" style={{ textDecoration: 'underline' }}>{x.user.nickname}</Link>
        <div className="small muted">{x.user.email}</div>
      </td>
      <td>{x.role === 'HOST' ? '방장' : '참여자'}</td>
      <td className="num tabular">{x.units} · {pt(x.paidPoint)}</td>
      <td className="small">
        {PAYMENT_LABEL[x.paymentStatus]}
        {x.leftAt && <div className="muted">{fullDateTime(x.leftAt)} 나감{x.leaveReason && ` (${LEAVE_LABEL[x.leaveReason]})`}</div>}
      </td>
      <td className="small">{active ? RECEIPT_LABEL[x.receiptStatus] : '-'}</td>
      <td className="small muted">{fullDateTime(x.joinedAt)}</td>
      <td>{canConfirm && <button className="btn btn-secondary btn-sm" disabled={busy} onClick={confirm}>대신 수령 처리</button>}</td>
    </tr>
  );
}

function CancelModal({ post, onClose, onDone }: { post: AdminPostDetail; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const paying = post.participants.filter((x) => x.paymentStatus === 'PAID');

  const submit = async () => {
    if (!reason.trim()) { toast.error(new Error('취소 사유를 적어 주세요.')); return; }
    setBusy(true);
    try {
      const r = await adminApi.cancelPost(post.postId, reason.trim());
      toast.ok(`공구를 취소했어요. ${r.refundedCount}명에게 ${pt(r.refundedPoint)} 환급했어요.`);
      onDone();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="공구 강제 취소" onClose={onClose}>
      <p style={{ margin: 0 }}>
        방장을 포함한 <span className="strong">{paying.length}명</span>에게 낸 포인트
        <span className="strong"> {pt(paying.reduce((s, x) => s + x.paidPoint, 0))}</span>를 모두 돌려주고 채팅방을 닫아요. 되돌릴 수 없어요.
      </p>
      <div className="field">
        <label htmlFor="cancel-reason">취소 사유 (채팅과 알림으로 참여자에게 보여요)</label>
        <input id="cancel-reason" className="input" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="예: 판매가 금지된 상품" />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>닫기</button>
        <button className="btn btn-danger" onClick={submit} disabled={busy}>{busy ? '취소하는 중…' : '취소하고 환급하기'}</button>
      </div>
    </Modal>
  );
}

/** 공구 채팅방에 운영팀 메시지 보내기 (참여자 전원이 봄) */
function ChatBox({ postId }: { postId: number }) {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await adminApi.sendPostChat(postId, message.trim());
      toast.ok('공구 채팅방에 운영팀 메시지를 보냈어요.');
      setMessage('');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card stack sm">
      <h2 className="card-title" style={{ margin: 0 }}>채팅방에 메시지 보내기</h2>
      <p className="small muted" style={{ margin: 0 }}>이 공구 채팅방에 "[운영팀]" 안내로 올라가고, 참여자 모두가 봐요.</p>
      <form className="row wrap" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input grow" style={{ minWidth: 200 }} maxLength={500} value={message} placeholder="예: 나눔 일정을 오늘 안에 정해 주세요."
          onChange={(e) => setMessage(e.target.value)} aria-label="운영팀 메시지" />
        <button className="btn btn-primary" type="submit" disabled={busy || !message.trim()}>{busy ? '보내는 중…' : '보내기'}</button>
      </form>
    </section>
  );
}

function DeleteModal({ post, willRefund, onClose, onDone }: {
  post: AdminPostDetail; willRefund: boolean; onClose: () => void; onDone: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const paying = post.participants.filter((x) => x.paymentStatus === 'PAID');
  const submit = async () => {
    if (!reason.trim()) { toast.error(new Error('삭제 사유를 적어 주세요.')); return; }
    setBusy(true);
    try {
      const r = await adminApi.deletePost(post.postId, reason.trim());
      toast.ok(r.refundedCount ? `게시글을 삭제했어요. ${r.refundedCount}명에게 ${pt(r.refundedPoint)} 환급했어요.` : '게시글을 삭제했어요.');
      onDone();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="게시글 삭제" onClose={onClose}>
      <p style={{ margin: 0 }}>
        제목·내용·사진을 지우고 "삭제된 게시글"로 바꿔요. 원래 내용은 서버 작업 기록에만 남고 되돌릴 수 없어요.
        {willRefund && <> 모집 중인 공구라 먼저 취소하고 <span className="strong">{paying.length}명</span>에게
          <span className="strong"> {pt(paying.reduce((s, x) => s + x.paidPoint, 0))}</span>를 돌려줘요.</>}
      </p>
      <div className="field">
        <label htmlFor="delete-reason">삭제 사유{willRefund && ' (채팅과 알림으로 참여자에게 보여요)'}</label>
        <input id="delete-reason" className="input" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="예: 개인정보가 들어 있는 게시글" />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>닫기</button>
        <button className="btn btn-danger" onClick={submit} disabled={busy}>{busy ? '삭제하는 중…' : '삭제하기'}</button>
      </div>
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack sm" style={{ gap: 4 }}>
      <span className="small muted">{label}</span>
      <span className="strong">{value}</span>
    </div>
  );
}
