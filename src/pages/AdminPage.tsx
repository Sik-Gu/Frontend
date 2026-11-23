import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api/endpoints';
import type { AdminReport, AdminUser, Page, ReportReason, ReportStatus, ViolationStage } from '../api/types';
import { ImageBox, Pagination } from '../components/ui';
import { fullDateTime } from '../lib/format';
import { useToast } from '../lib/session';

export const REASON_LABEL: Record<ReportReason, string> = {
  CHAT_ABUSE: '채팅 비속어 등',
  TRADE_VIOLATION: '거래 중 규칙 위반',
  ETC: '기타',
};
const STAGE_LABEL: Record<ViolationStage, string> = {
  RECRUITING: '모집', PAYMENT: '결제', ORDER: '주문', RECEIPT: '수령', SHIPPING: '배송', DISTRIBUTION: '나눔',
};
const FILTERS: { value: ReportStatus | undefined; label: string }[] = [
  { value: undefined, label: '전체' },
  { value: 'PENDING', label: '처리 전' },
  { value: 'DONE', label: '처리 완료' },
];

/** 정지 기간 → 백엔드 LocalDateTime 문자열 (null = 무기한) */
function untilAfterDays(days: number | null): string | null {
  if (days === null) return null;
  const d = new Date(Date.now() + days * 86400000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/** 관리자 전용: 신고 목록 보기 + 신고 대상(또는 신고자) 계정 정지·해제 */
export default function AdminPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<ReportStatus | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AdminReport> | null>(null);

  const load = useCallback(() => {
    adminApi.reports(filter, page).then(setData).catch((e) => toast.error(e));
  }, [filter, page, toast]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="page stack lg">
      <div className="row between">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>관리자 · 신고 관리</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>신고 내용을 확인하고 사용자 계정을 정지하거나 정지를 풀 수 있어요.</p>
        </div>
        <span className="small muted">{data ? `${data.totalElements}건` : ''}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <button key={f.label} className={`chip${filter === f.value ? ' active' : ''}`}
            onClick={() => { setFilter(f.value); setPage(0); }}>{f.label}</button>
        ))}
      </div>

      {!data ? <div className="card muted">불러오는 중…</div>
        : data.content.length === 0 ? <div className="card muted" style={{ textAlign: 'center', padding: 48 }}>신고가 없어요.</div>
          : data.content.map((r) => <ReportCard key={r.reportId} report={r} onChanged={load} />)}

      {data && <Pagination page={data.page} hasNext={data.hasNext} total={data.totalElements} size={data.size} onChange={setPage} />}
    </div>
  );
}

function ReportCard({ report: r, onChanged }: { report: AdminReport; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const markDone = async () => {
    const memo = window.prompt('처리 메모 (서버 작업 기록에만 남아요). 제재가 필요하면 아래 정지 버튼을 따로 눌러 주세요.', '');
    if (memo === null) return;
    setBusy(true);
    try {
      await adminApi.reportDone(r.reportId, memo.trim());
      toast.ok('신고를 처리 완료로 바꿨어요.');
      onChanged();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card stack">
      <div className="row between">
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">{REASON_LABEL[r.reason]}</span>
          {r.violationStage && <span className="badge outline">{STAGE_LABEL[r.violationStage]} 단계</span>}
          <span className={`badge${r.status === 'DONE' ? ' muted' : ' outline'}`}>{r.status === 'DONE' ? '처리 완료' : '처리 전'}</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="small muted">#{r.reportId} · {fullDateTime(r.createdAt)}</span>
          {r.status === 'PENDING' && <button className="btn btn-primary btn-sm" disabled={busy} onClick={markDone}>처리 완료</button>}
        </div>
      </div>

      <div className="row split" style={{ gap: 16, alignItems: 'stretch' }}>
        <UserBox title="신고자" user={r.reporter} onChanged={onChanged} />
        <UserBox title="신고 대상" user={r.target} onChanged={onChanged} highlight />
      </div>

      <div className="stack sm">
        <span className="small strong">신고 내용</span>
        <div style={{ background: 'var(--surface-muted)', borderRadius: 8, padding: '10px 14px', whiteSpace: 'pre-wrap' }}>
          {r.content || <span className="muted">내용 없음</span>}
        </div>
      </div>

      {r.messages.length > 0 && (
        <div className="stack sm">
          <span className="small strong">신고된 채팅 메시지 ({r.messages.length})</span>
          {r.messages.map((m) => (
            <div key={m.messageId} className="row between small" style={{ border: '1px solid var(--surface-muted)', borderRadius: 8, padding: '8px 12px' }}>
              <span>{m.type === 'IMAGE' && m.imageUrl
                ? <a href={m.imageUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>[사진 보기]</a>
                : m.content}</span>
              <span className="muted">{fullDateTime(m.sentAt)}</span>
            </div>
          ))}
        </div>
      )}

      {r.imageUrls.length > 0 && (
        <div className="stack sm">
          <span className="small strong">증빙 사진</span>
          <div className="row wrap" style={{ gap: 8 }}>
            {r.imageUrls.map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer"><ImageBox src={u} style={{ width: 96, height: 96, borderRadius: 8 }} /></a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function UserBox({ title, user, onChanged, highlight }: {
  title: string; user: AdminUser; onChanged: () => void; highlight?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const suspended = user.status === 'SUSPENDED';

  const change = async (status: 'ACTIVE' | 'SUSPENDED', days: number | null = null) => {
    const label = status === 'ACTIVE' ? '정지를 풀까요?' : days ? `${days}일 동안 정지할까요?` : '무기한 정지할까요?';
    if (!window.confirm(`${user.nickname}(${user.email}) 계정을 ${label}`)) return;
    setBusy(true);
    try {
      await adminApi.changeUserStatus(user.userId, status, untilAfterDays(days));
      toast.ok(status === 'ACTIVE' ? '정지를 풀었어요' : '계정을 정지했어요. 정지된 사용자는 로그인할 수 없어요.');
      onChanged();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grow stack sm" style={{ border: `1px solid ${highlight ? 'var(--line-button)' : 'var(--surface-muted)'}`, borderRadius: 10, padding: 14 }}>
      <div className="row between">
        <span className="small muted">{title}</span>
        <span className={`badge${suspended ? '' : ' muted'}`} style={suspended ? { background: 'var(--danger)' } : undefined}>
          {suspended ? '정지됨' : '활성'}
        </span>
      </div>
      <div className="strong">{user.nickname} <span className="small muted">#{user.userId}</span></div>
      <div className="small muted">{user.email}</div>
      {suspended && (
        <div className="small" style={{ color: 'var(--danger)' }}>
          {user.suspendedUntil ? `${fullDateTime(user.suspendedUntil)}까지 정지` : '무기한 정지'}
        </div>
      )}
      {user.role === 'ADMIN' ? <div className="small muted">관리자 계정은 상태를 바꿀 수 없어요.</div> : (
        <div className="row wrap" style={{ gap: 6 }}>
          {suspended ? (
            <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => change('ACTIVE')}>정지 해제</button>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => change('SUSPENDED', 7)}>7일 정지</button>
              <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => change('SUSPENDED', 30)}>30일 정지</button>
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => change('SUSPENDED', null)}>무기한 정지</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
