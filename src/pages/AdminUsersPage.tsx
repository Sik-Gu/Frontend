import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/endpoints';
import type { AdminUserItem, Page, UserStatus } from '../api/types';
import { Pagination } from '../components/ui';
import { fullDateTime } from '../lib/format';
import { useToast } from '../lib/session';

const FILTERS: { value: UserStatus | undefined; label: string }[] = [
  { value: undefined, label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '정지' },
];

/** 관리자: 이용자 검색 (닉네임·학교 이메일) */
export default function AdminUsersPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const keyword = params.get('keyword') ?? '';
  const status = (params.get('status') as UserStatus | null) ?? undefined;
  const page = Number(params.get('page') ?? 0);
  const [input, setInput] = useState(keyword);
  const [data, setData] = useState<Page<AdminUserItem> | null>(null);

  const update = useCallback((next: { keyword?: string; status?: UserStatus; page?: number }) => {
    const sp = new URLSearchParams();
    if (next.keyword) sp.set('keyword', next.keyword);
    if (next.status) sp.set('status', next.status);
    if (next.page) sp.set('page', String(next.page));
    setParams(sp);
  }, [setParams]);

  useEffect(() => {
    setData(null);
    adminApi.users(keyword || undefined, status, page).then(setData).catch((e) => toast.error(e));
  }, [keyword, status, page, toast]);

  return (
    <div className="page stack lg">
      <div className="row between">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>관리자 · 이용자</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>닉네임이나 학교 이메일로 찾고, 눌러서 자세히 볼 수 있어요.</p>
        </div>
        <span className="small muted">{data ? `${data.totalElements.toLocaleString('ko-KR')}명` : ''}</span>
      </div>

      <form className="row wrap" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); update({ keyword: input.trim(), status }); }}>
        <input className="input grow" style={{ minWidth: 200 }} placeholder="닉네임 또는 이메일 일부" value={input} maxLength={50}
          onChange={(e) => setInput(e.target.value)} aria-label="이용자 검색어" />
        <button className="btn btn-primary" type="submit">검색</button>
      </form>
      <div className="row" style={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <button key={f.label} className={`chip${status === f.value ? ' active' : ''}`}
            onClick={() => update({ keyword, status: f.value })}>{f.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {!data ? <div className="muted" style={{ padding: 24 }}>불러오는 중…</div>
          : data.content.length === 0 ? <div className="muted" style={{ textAlign: 'center', padding: 48 }}>찾는 이용자가 없어요.</div> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>이용자</th><th>학교 · 동네</th><th className="num">별점</th><th className="num">거래</th><th>상태</th><th>가입일</th></tr>
                </thead>
                <tbody>
                  {data.content.map((u) => (
                    <tr key={u.userId}>
                      <td>
                        <Link to={`/admin/users/${u.userId}`} className="strong" style={{ textDecoration: 'underline' }}>{u.nickname}</Link>
                        {u.role === 'ADMIN' && <span className="badge muted" style={{ marginLeft: 6 }}>관리자</span>}
                        <div className="small muted">{u.email}</div>
                      </td>
                      <td className="small">{u.universityName ?? '-'}<div className="muted">{u.dongName ?? '동네 미설정'}</div></td>
                      <td className="num tabular">{u.ratingAvg ?? '-'}</td>
                      <td className="num tabular">{u.tradeCount}</td>
                      <td><UserStatusBadge status={u.status} until={u.suspendedUntil} /></td>
                      <td className="small muted">{fullDateTime(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {data && <Pagination page={data.page} hasNext={data.hasNext} total={data.totalElements} size={data.size}
        onChange={(p) => update({ keyword, status, page: p })} />}
    </div>
  );
}

export function UserStatusBadge({ status, until }: { status: UserStatus; until: string | null }) {
  if (status === 'ACTIVE') return <span className="badge muted">활성</span>;
  return (
    <span className="badge" style={{ background: 'var(--danger)', color: '#fff' }}
      title={until ? `${fullDateTime(until)}까지` : '무기한'}>정지</span>
  );
}
