import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { postApi, type PostSearch } from '../api/endpoints';
import type { Category, Page, PostCard, PostSort } from '../api/types';
import LocationPicker from '../components/LocationPicker';
import { Empty, Icon, Modal, Pagination, PostCardView } from '../components/ui';
import { CATEGORIES, CATEGORY_LABEL } from '../lib/format';
import { useSession, useToast } from '../lib/session';

const SORTS: { value: PostSort; label: string }[] = [
  { value: 'LATEST', label: '최신순' },
  { value: 'DEADLINE', label: '마감임박' },
  { value: 'POPULAR', label: '조회수순' },
  { value: 'PRICE', label: '가격순' },
];

/** 02 홈 · 공구 목록 (시안 E 레이아웃) */
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
  const radiusLabel = radius === 500 ? '500m' : '1km';

  return (
    <div className="page stack" style={{ gap: 32 }}>
      {!keyword && (
        <section className="hero">
          <div className="hero-copy">
            <button className="hero-dong" onClick={() => setEditingDong(true)}>
              <Icon name="pin" size={14} />{dong} · 변경
            </button>
            <h1>혼자 먹기엔 많은 대용량,<br />이웃과 나눠 사요</h1>
            <p>학교 메일로 인증된 같은 동네 학생끼리만 거래해요. 결제와 정산은 포인트로 한 번에.</p>
            <div className="hero-actions">
              <a href="#posts" className="btn btn-lg hero-btn-light">우리 동네 공구 보기</a>
              <Link to="/posts/new" className="btn btn-lg hero-btn-outline">내가 공구 열기</Link>
            </div>
          </div>
          <div className="split-card" aria-label="소분 예시">
            <div className="row between">
              <span className="small strong muted">이렇게 나눠요</span>
              <span className="badge hot">예시</span>
            </div>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <span className="strong">코스트코 생수 2L × 24병</span>
              <span className="muted" style={{ textDecoration: 'line-through' }}>29,040원</span>
            </div>
            <div className="split-units">
              {Array.from({ length: 6 }, (_, i) => <span key={i} className={i < 4 ? 'on' : ''} />)}
            </div>
            <div className="muted" style={{ fontSize: 14 }}>4병씩 6단위로 나누면</div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="split-price">4,840원</span><span className="strong">/ 1단위</span>
            </div>
          </div>
        </section>
      )}

      <section id="posts" className="stack" style={{ gap: 20, scrollMarginTop: 90 }}>
        <div className="list-head">
          <div>
            <h2>{keyword ? <>‘{keyword}’ 검색 결과</> : <>{dong} 근처 공구</>}</h2>
            <div className="muted" style={{ fontSize: 14 }}>
              {recruitingOnly ? '지금 모집중' : '전체'} {data ? `${data.totalElements}건` : ''} · {radiusLabel} 이내
              {keyword && (
                <button className="btn btn-ghost small" onClick={() => { params.delete('keyword'); setParams(params); }}>검색 지우기 ×</button>
              )}
            </div>
          </div>
          <div className="row wrap home-filters" style={{ gap: 10 }}>
            <div className="segmented" role="group" aria-label="거리">
              {([500, 1000] as const).map((r) => (
                <button key={r} className={radius === r ? 'on' : ''} aria-pressed={radius === r} onClick={() => setRadius(r)}>
                  {r === 500 ? '500m' : '1km'}
                </button>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" checked={recruitingOnly} onChange={(e) => setRecruitingOnly(e.target.checked)} />모집중만
            </label>
            <label className="sort">정렬
              <select value={sort} onChange={(e) => setSort(e.target.value as PostSort)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="row wrap home-cats" role="group" aria-label="카테고리" style={{ gap: 8 }}>
          {[undefined, ...CATEGORIES].map((c) => (
            <button key={c ?? 'ALL'} className={`chip${category === c ? ' active' : ''}`} aria-pressed={category === c}
              style={{ height: 40 }} onClick={() => setCategory(c)}>
              {c ? CATEGORY_LABEL[c] : '전체'}
            </button>
          ))}
        </div>

        {loading && !data ? <Empty>불러오는 중…</Empty>
          : !data || data.content.length === 0 ? (
            <Empty>
              {radiusLabel} 안에 공구 없음<br />
              <span className="small">거리를 넓히거나 직접 ‘공구 열기’로 첫 공구 열기</span>
            </Empty>
          ) : (
            <div className="post-grid">
              {data.content.map((p) => <PostCardView key={p.postId} post={p} />)}
            </div>
          )}

        {data && <Pagination page={data.page} hasNext={data.hasNext} total={data.totalElements} size={data.size} onChange={setPage} />}
      </section>

      {editingDong && (
        <Modal title="우리 동네 변경" onClose={() => setEditingDong(false)}>
          <LocationPicker onDone={() => setEditingDong(false)} />
        </Modal>
      )}
    </div>
  );
}
