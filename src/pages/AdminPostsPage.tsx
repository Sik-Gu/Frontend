import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/endpoints';
import type { AdminPostItem, Category, Page, PostStatus } from '../api/types';
import { Pagination, StatusBadge } from '../components/ui';
import { CATEGORIES, CATEGORY_LABEL, STATUS_LABEL, fullDateTime, won } from '../lib/format';
import { useToast } from '../lib/session';

const STATUSES = Object.keys(STATUS_LABEL) as PostStatus[];

/** 관리자: 동네·거리와 상관없이 올라온 모든 공구 */
export default function AdminPostsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const keyword = params.get('keyword') ?? '';
  const status = (params.get('status') as PostStatus | null) ?? undefined;
  const category = (params.get('category') as Category | null) ?? undefined;
  const attention = params.get('attention') === 'true';
  const page = Number(params.get('page') ?? 0);
  const [input, setInput] = useState(keyword);
  const [data, setData] = useState<Page<AdminPostItem> | null>(null);

  const update = (next: Partial<{ keyword: string; status: PostStatus; category: Category; attention: boolean; page: number }>) => {
    const merged = { keyword, status, category, attention, page: 0, ...next };
    const sp = new URLSearchParams();
    if (merged.keyword) sp.set('keyword', merged.keyword);
    if (merged.status) sp.set('status', merged.status);
    if (merged.category) sp.set('category', merged.category);
    if (merged.attention) sp.set('attention', 'true');
    if (merged.page) sp.set('page', String(merged.page));
    setParams(sp);
  };

  useEffect(() => {
    setData(null);
    adminApi.posts({ keyword: keyword || undefined, status, category, attention, page })
      .then(setData).catch((e) => toast.error(e));
  }, [keyword, status, category, attention, page, toast]);

  return (
    <div className="page stack lg">
      <div className="row between">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>관리자 · 공구</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>동네와 상관없이 올라온 모든 공구를 볼 수 있어요.</p>
        </div>
        <span className="small muted">{data ? `${data.totalElements.toLocaleString('ko-KR')}개` : ''}</span>
      </div>

      <form className="row wrap" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); update({ keyword: input.trim() }); }}>
        <input className="input grow" style={{ minWidth: 200 }} placeholder="제목 또는 상품명 일부" value={input} maxLength={50}
          onChange={(e) => setInput(e.target.value)} aria-label="공구 검색어" />
        <select className="select" value={status ?? ''} aria-label="상태"
          onChange={(e) => update({ status: (e.target.value || undefined) as PostStatus | undefined })}>
          <option value="">모든 상태</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className="select" value={category ?? ''} aria-label="카테고리"
          onChange={(e) => update({ category: (e.target.value || undefined) as Category | undefined })}>
          <option value="">모든 카테고리</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">검색</button>
      </form>
      <div className="row wrap" style={{ gap: 8 }}>
        <button className={`chip${!attention ? ' active' : ''}`} onClick={() => update({ attention: false })}>전체</button>
        <button className={`chip${attention ? ' active' : ''}`} onClick={() => update({ attention: true })}
          title="처리 전 수령 문의가 있거나, 나눔 진행 뒤 3일이 지나도 정산되지 않은 공구">손봐야 할 공구</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {!data ? <div className="muted" style={{ padding: 24 }}>불러오는 중…</div>
          : data.content.length === 0 ? <div className="muted" style={{ textAlign: 'center', padding: 48 }}>조건에 맞는 공구가 없어요.</div> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>공구</th><th>방장</th><th>동네</th><th className="num">단위</th><th className="num">총액</th><th>상태</th><th>등록</th></tr>
                </thead>
                <tbody>
                  {data.content.map((p) => (
                    <tr key={p.postId}>
                      <td>
                        <Link to={`/admin/posts/${p.postId}`} className="strong" style={{ textDecoration: 'underline' }}>{p.title}</Link>
                        <div className="small muted">#{p.postId} · {CATEGORY_LABEL[p.category]}
                          {p.openInquiryCount > 0 && <span className="badge hot" style={{ marginLeft: 6 }}>문의 {p.openInquiryCount}</span>}
                        </div>
                      </td>
                      <td className="small"><Link to={`/admin/users/${p.host.userId}`} style={{ textDecoration: 'underline' }}>{p.host.nickname}</Link></td>
                      <td className="small muted">{p.dongName ?? '-'}</td>
                      <td className="num tabular">{p.filledUnits}/{p.totalUnits}</td>
                      <td className="num tabular">{won(p.totalPrice)}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="small muted">{fullDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {data && <Pagination page={data.page} hasNext={data.hasNext} total={data.totalElements} size={data.size}
        onChange={(p) => update({ page: p })} />}
    </div>
  );
}
