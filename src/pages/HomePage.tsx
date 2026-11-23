import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postApi, type PostSearch } from '../api/endpoints';
import type { Category, Page, PostCard, PostSort } from '../api/types';
import LocationPicker from '../components/LocationPicker';
import { Empty, Modal, Pagination, PostCardView } from '../components/ui';
import { CATEGORIES, CATEGORY_LABEL } from '../lib/format';
import { useSession, useToast } from '../lib/session';

const SORTS: { value: PostSort; label: string }[] = [
  { value: 'LATEST', label: '최신순' },
  { value: 'DEADLINE', label: '마감임박' },
  { value: 'POPULAR', label: '조회수순' },
  { value: 'PRICE', label: '가격순' },
];

/** 02 홈 · 공구 목록 */
export default function HomePage() {
  const { me } = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const keyword = params.get('keyword') ?? '';
  const [category, setCategory] = useState<Category | undefined>();
  const [recruitingOnly, setRecruitingOnly] = useState(true);
  const [radius, setRadius] = useState<500 | 1000>(1000);
  const [sort, setSort] = useState<PostSort>('LATEST');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<PostCard> | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingDong, setEditingDong] = useState(false);

  // 동네(좌표)가 바뀌면 그 동네 기준으로 첫 페이지부터 다시 불러온다
  const lat = me?.location?.latitude;
  const lng = me?.location?.longitude;
  useEffect(() => { setPage(0); }, [keyword, category, recruitingOnly, radius, sort, lat, lng]);

  useEffect(() => {
    const search: PostSearch = { keyword: keyword || undefined, category, recruitingOnly, radius, sort, page };
    let alive = true;
    setLoading(true);
    postApi.search(search)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) { setData(null); toast.error(e); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [keyword, category, recruitingOnly, radius, sort, page, lat, lng, toast]);

  const dong = me?.location?.dongName ?? '우리 동네';

  return (
    <div className="page">
      <div className="row split" style={{ alignItems: 'flex-start', gap: 32 }}>
        <aside className="stack" style={{ width: 240, flexShrink: 0, gap: 24 }}>
          <div className="stack sm">
            <div className="section-title" style={{ margin: 0 }}>우리 동네</div>
            <button className="input row between" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => setEditingDong(true)}>
              <span className="strong">📍 {dong}</span><span className="small muted">변경 ▾</span>
            </button>
          </div>

          <div className="stack sm cat-list">
            <div className="section-title" style={{ margin: 0 }}>카테고리</div>
            {[undefined, ...CATEGORIES].map((c) => (
              <button key={c ?? 'ALL'} className="btn btn-ghost" onClick={() => setCategory(c)}
                style={{ justifyContent: 'flex-start', padding: '8px 12px', borderRadius: 6,
                  background: category === c ? '#e6e6e6' : 'transparent', color: category === c ? '#1a1a1a' : '#4d4d4d',
                  fontWeight: category === c ? 700 : 400 }}>
                {c ? CATEGORY_LABEL[c] : '전체'}
              </button>
            ))}
          </div>

          <div className="stack sm">
            <div className="section-title" style={{ margin: 0 }}>상태</div>
            <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={recruitingOnly} onChange={(e) => setRecruitingOnly(e.target.checked)} /> 모집중만 보기
            </label>
          </div>

          <div className="stack sm">
            <div className="section-title" style={{ margin: 0 }}>거리</div>
            <div className="row" style={{ gap: 6 }}>
              {([500, 1000] as const).map((r) => (
                <button key={r} className={`chip${radius === r ? ' active' : ''}`} onClick={() => setRadius(r)}>
                  {r === 500 ? '500m' : '1km'}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="grow stack" style={{ gap: 20 }}>
          <div className="img-ph" style={{ height: 120, borderRadius: 12, fontSize: 13 }}>
            학교 인증 이웃과 함께 사면 더 싸요 · 공구 등록하면 7일 동안 모집해요
          </div>

          <div className="row between">
            <h2 style={{ fontSize: 20, margin: 0 }}>
              {keyword ? <>‘{keyword}’ 검색 결과 </> : <>{dong} 근처 공구 </>}
              {data ? `${data.totalElements}건` : ''}
              {keyword && (
                <button className="btn btn-ghost small" onClick={() => { params.delete('keyword'); setParams(params); }}>검색 지우기 ×</button>
              )}
            </h2>
            <div className="row" style={{ gap: 16 }}>
              {SORTS.map((s) => (
                <button key={s.value} className="btn btn-ghost small" onClick={() => setSort(s.value)}
                  style={{ padding: 0, color: sort === s.value ? '#1a1a1a' : '#808080', fontWeight: sort === s.value ? 700 : 400 }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {loading && !data ? <Empty>불러오는 중…</Empty>
            : !data || data.content.length === 0 ? (
              <Empty>
                {radius === 500 ? '500m 안에' : '1km 안에'} 공구가 없어요.<br />
                <span className="small">다른 계정으로 같은 동네를 설정하고 공구를 열어 보거나, 직접 ‘+ 공구 열기’를 눌러 보세요.</span>
              </Empty>
            ) : (
              <div className="post-grid">
                {data.content.map((p) => <PostCardView key={p.postId} post={p} />)}
              </div>
            )}

          {data && <Pagination page={data.page} hasNext={data.hasNext} total={data.totalElements} size={data.size} onChange={setPage} />}
        </main>
      </div>

      {editingDong && (
        <Modal title="우리 동네 변경" onClose={() => setEditingDong(false)}>
          <LocationPicker onDone={() => setEditingDong(false)} />
        </Modal>
      )}
    </div>
  );
}
