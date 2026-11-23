import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/endpoints';
import type { AdminInquiry, InquiryResolution, Page } from '../api/types';
import { ImageBox, Modal, Pagination } from '../components/ui';
import { DESIRED_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_TYPE_LABEL, RESOLUTION_LABEL } from '../lib/adminLabels';
import { fullDateTime, pt } from '../lib/format';
import { useToast } from '../lib/session';

const FILTERS: { value: boolean | undefined; label: string }[] = [
  { value: false, label: '처리 전' },
  { value: true, label: '처리 완료' },
  { value: undefined, label: '전체' },
];

/** 관리자: 수령 문의 목록과 처리. 문의가 있는 공구는 처리할 때까지 정산이 멈춰 있다 */
export default function AdminInquiriesPage() {
  const toast = useToast();
  const [resolved, setResolved] = useState<boolean | undefined>(false);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminInquiry> | null>(null);

  const load = useCallback(() => {
    adminApi.inquiries(resolved, page).then(setData).catch((e) => toast.error(e));
  }, [resolved, page, toast]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="page stack lg">
      <div className="row between">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>관리자 · 수령 문의</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>문의가 걸린 공구는 처리할 때까지 정산이 멈춰 있어요.</p>
        </div>
        <span className="small muted">{data ? `${data.totalElements}건` : ''}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <button key={f.label} className={`chip${resolved === f.value ? ' active' : ''}`}
            onClick={() => { setResolved(f.value); setPage(0); }}>{f.label}</button>
        ))}
      </div>
      {!data ? <div className="card muted">불러오는 중…</div>
        : data.content.length === 0 ? <div className="card muted" style={{ textAlign: 'center', padding: 48 }}>문의가 없어요.</div>
          : data.content.map((i) => <InquiryCard key={i.inquiryId} inquiry={i} onChanged={load} showPost />)}
      {data && <Pagination page={data.page} hasNext={data.hasNext} total={data.totalElements} size={data.size} onChange={setPage} />}
    </div>
  );
}

/** 문의 한 건 + 처리 버튼 (목록·공구 상세 공용) */
export function InquiryCard({ inquiry: i, onChanged, showPost }: { inquiry: AdminInquiry; onChanged: () => void; showPost?: boolean }) {
  const [resolving, setResolving] = useState(false);
  const done = i.status === 'RESOLVED';
  return (
    <div className="card stack">
      <div className="row between wrap">
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="badge">{INQUIRY_TYPE_LABEL[i.type]}</span>
          <span className="badge outline">희망: {DESIRED_LABEL[i.desiredResolution]}</span>
          <span className={`badge${done ? ' muted' : ' hot'}`}>{INQUIRY_STATUS_LABEL[i.status]}</span>
        </div>
        <span className="small muted">#{i.inquiryId} · {fullDateTime(i.createdAt)}</span>
      </div>
      <div className="small">
        {showPost && <><Link to={`/admin/posts/${i.postId}`} className="strong" style={{ textDecoration: 'underline' }}>{i.postTitle}</Link> · </>}
        <Link to={`/admin/users/${i.user.userId}`} style={{ textDecoration: 'underline' }}>{i.user.nickname}</Link>
        <span className="muted"> ({i.user.email}) · {i.units}단위{i.receivedUnits !== null && ` 중 ${i.receivedUnits}단위 받음`}</span>
      </div>
      <div style={{ background: 'var(--surface-muted)', borderRadius: 8, padding: '10px 14px', whiteSpace: 'pre-wrap' }}>{i.content}</div>
      {i.imageUrls.length > 0 && (
        <div className="row wrap" style={{ gap: 8 }}>
          {i.imageUrls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><ImageBox src={u} style={{ width: 88, height: 88, borderRadius: 8 }} /></a>)}
        </div>
      )}
      {done ? (
        <div className="small">
          <span className="strong">{i.resolution ? RESOLUTION_LABEL[i.resolution] : '-'}</span>
          {!!i.refundAmount && <span> · {pt(i.refundAmount)} 환급</span>}
          <span className="muted"> · {fullDateTime(i.resolvedAt)}</span>
          {i.adminMemo && <div className="muted" style={{ marginTop: 4 }}>메모: {i.adminMemo}</div>}
        </div>
      ) : (
        <div className="row"><button className="btn btn-primary btn-sm" onClick={() => setResolving(true)}>처리하기</button></div>
      )}
      {resolving && <ResolveModal inquiry={i} onClose={() => setResolving(false)} onDone={() => { setResolving(false); onChanged(); }} />}
    </div>
  );
}

const CHOICES: { value: InquiryResolution; label: string; help: string }[] = [
  { value: 'REDELIVER', label: '다시 받음', help: '다시 전달했어요. 이 참여자를 수령 완료로 바꿔요.' },
  { value: 'REJECTED', label: '문제 없음', help: '문제가 없다고 판단했어요. 수령 완료로 바꿔요.' },
  { value: 'FULL_REFUND', label: '전액 환불', help: '이 참여자가 낸 포인트를 전부 돌려주고 공구에서 빼요. 방장 정산에서도 빠져요.' },
];

function ResolveModal({ inquiry, onClose, onDone }: { inquiry: AdminInquiry; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [resolution, setResolution] = useState<InquiryResolution>('REDELIVER');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!memo.trim()) { toast.error(new Error('처리 메모를 적어 주세요.')); return; }
    setBusy(true);
    try {
      const r = await adminApi.resolveInquiry(inquiry.inquiryId, resolution, memo.trim());
      toast.ok(r.postStatus === 'SETTLED' ? '처리했어요. 전원 받아서 정산까지 끝났어요.'
        : r.refundedPoint ? `처리했어요. ${pt(r.refundedPoint)} 환급했어요.` : '처리했어요.');
      onDone();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="수령 문의 처리" onClose={onClose}>
      <div className="stack sm">
        {CHOICES.map((c) => (
          <label key={c.value} className={`radio-card${resolution === c.value ? ' on' : ''}`}>
            <input type="radio" name="resolution" checked={resolution === c.value} onChange={() => setResolution(c.value)} />
            <span><span className="strong">{c.label}</span><span className="small muted" style={{ display: 'block' }}>{c.help}</span></span>
          </label>
        ))}
        <p className="small muted" style={{ margin: 0 }}>부분 환불은 아직 지원하지 않아요.</p>
      </div>
      <div className="field">
        <label htmlFor="inq-memo">처리 메모 (참여자에게는 보이지 않아요)</label>
        <textarea id="inq-memo" className="textarea" rows={3} maxLength={1000} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>닫기</button>
        <button className={`btn ${resolution === 'FULL_REFUND' ? 'btn-danger' : 'btn-primary'}`} onClick={submit} disabled={busy}>
          {busy ? '처리 중…' : '처리하기'}
        </button>
      </div>
    </Modal>
  );
}
