import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../api/endpoints';
import type { AdminUserDetail, Page, PointTransaction } from '../api/types';
import { Pagination } from '../components/ui';
import { STATUS_LABEL, TX_LABEL, fullDateTime, pt, signedPt } from '../lib/format';
import { useToast } from '../lib/session';
import { REASON_LABEL, UserBox } from './AdminPage';

/** 관리자: 이용자 한 명의 상세 (포인트, 활동, 받은 신고) + 정지·해제 */
export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const toast = useToast();
  const [data, setData] = useState<AdminUserDetail | null>(null);

  const load = useCallback(() => {
    adminApi.user(Number(userId)).then(setData).catch((e) => toast.error(e));
  }, [userId, toast]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="page muted">불러오는 중…</div>;
  const u = data.user;

  return (
    <div className="page stack lg">
      <div>
        <Link to="/admin/users" className="small muted">← 이용자 목록</Link>
        <h1 style={{ fontSize: 24, margin: '8px 0 0' }}>{u.nickname} <span className="small muted">#{u.userId}</span></h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {u.universityName ?? '학교 미확인'} · {u.dongName ?? '동네 미설정'} · {fullDateTime(u.createdAt)} 가입
        </p>
      </div>

      <div className="row split" style={{ gap: 16, alignItems: 'stretch' }}>
        <UserBox title="계정" user={u} onChanged={load} highlight />
        <div className="card grow admin-facts">
          <Fact label="사용 가능 포인트" value={pt(data.availablePoint)} />
          <Fact label="보류 중 포인트" value={pt(data.heldPoint)} />
          <Fact label="별점 · 거래" value={`${u.ratingAvg ?? '-'} · ${u.tradeCount}회`} />
          <Fact label="연 공구 · 참여한 공구" value={`${data.hostedPostCount} · ${data.joinedPostCount}`} />
          <Fact label="받은 신고 (처리 전)" value={`${data.reportsReceived} (${data.pendingReportsReceived})`}
            alert={data.pendingReportsReceived > 0} />
          <Fact label="한 신고 · 미수금 기한 초과" value={`${data.reportsMade} · ${data.overdueCount}회`} />
        </div>
      </div>

      <section className="card stack">
        <h2 className="card-title" style={{ margin: 0 }}>최근 참여 공구</h2>
        {data.recentParticipations.length === 0 ? <p className="muted">참여한 공구가 없어요.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>공구</th><th>역할</th><th className="num">수량</th><th>공구 상태</th><th>참여 시각</th></tr></thead>
              <tbody>
                {data.recentParticipations.map((p) => (
                  <tr key={`${p.postId}-${p.joinedAt}`}>
                    <td><Link to={`/admin/posts/${p.postId}`} style={{ textDecoration: 'underline' }}>{p.title}</Link> <span className="small muted">#{p.postId}</span></td>
                    <td>{p.role === 'HOST' ? '방장' : '참여자'}{p.leftAt && <span className="badge muted" style={{ marginLeft: 6 }}>나감</span>}</td>
                    <td className="num tabular">{p.units}</td>
                    <td>{STATUS_LABEL[p.postStatus]}</td>
                    <td className="small muted">{fullDateTime(p.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card stack">
        <div className="row between">
          <h2 className="card-title" style={{ margin: 0 }}>최근 받은 신고</h2>
          <Link to="/admin/reports" className="small" style={{ textDecoration: 'underline' }}>신고 관리로</Link>
        </div>
        {data.recentReports.length === 0 ? <p className="muted">받은 신고가 없어요.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>사유</th><th>신고자</th><th>상태</th><th>신고 시각</th></tr></thead>
              <tbody>
                {data.recentReports.map((r) => (
                  <tr key={r.reportId}>
                    <td>{REASON_LABEL[r.reason]} <span className="small muted">#{r.reportId}</span></td>
                    <td>{r.reporterNickname}</td>
                    <td>{r.status === 'DONE' ? '처리 완료' : '처리 전'}</td>
                    <td className="small muted">{fullDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PointHistory userId={u.userId} />
    </div>
  );
}

/** 포인트 거래 내역 (충전·결제·환급·정산) */
function PointHistory({ userId }: { userId: number }) {
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<PointTransaction> | null>(null);
  useEffect(() => { adminApi.userPoints(userId, page).then(setData).catch((e) => toast.error(e)); }, [userId, page, toast]);

  return (
    <section className="card stack">
      <h2 className="card-title" style={{ margin: 0 }}>포인트 내역</h2>
      {!data ? <p className="muted">불러오는 중…</p> : data.content.length === 0 ? <p className="muted">거래가 없어요.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>종류</th><th>내용</th><th className="num">금액</th><th className="num">거래 후 잔액</th><th>시각</th></tr></thead>
            <tbody>
              {data.content.map((t) => (
                <tr key={t.transactionId}>
                  <td>{TX_LABEL[t.type]}</td>
                  <td className="small">{t.postId ? <Link to={`/admin/posts/${t.postId}`} style={{ textDecoration: 'underline' }}>{t.description}</Link> : t.description}</td>
                  <td className="num tabular">{signedPt(t.amount)}</td>
                  <td className="num tabular">{pt(t.balanceAfter)}</td>
                  <td className="small muted">{fullDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} hasNext={data.hasNext} total={data.totalElements} size={data.size} onChange={setPage} />}
    </section>
  );
}

function Fact({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="stack sm" style={{ gap: 4 }}>
      <span className="small muted">{label}</span>
      <span className="strong tabular" style={alert ? { color: 'var(--accent-text)' } : undefined}>{value}</span>
    </div>
  );
}
