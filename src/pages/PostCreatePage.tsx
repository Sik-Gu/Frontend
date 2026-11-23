import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { postApi } from '../api/endpoints';
import type { Category } from '../api/types';
import { ImageUploader } from '../components/ui';
import { CATEGORIES, CATEGORY_LABEL, pt, won } from '../lib/format';
import { useSession, useToast } from '../lib/session';

const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(/,/g, '')));

/** 04 공구 등록 */
export default function PostCreatePage() {
  const { me, refresh } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [title, setTitle] = useState('');
  const [baseUnit, setBaseUnit] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [hostUnits, setHostUnits] = useState('');
  const [productLink, setProductLink] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [shortage, setShortage] = useState(false);

  const units = num(totalUnits);
  const price = num(totalPrice);
  const host = num(hostUnits);
  const divisible = units > 0 && price > 0 && price % units === 0;
  const unitPrice = divisible ? price / units : NaN;
  const hostPay = divisible && host > 0 ? unitPrice * host : NaN;
  const hostOk = host >= 1 && units >= 2 && host <= units - 1;

  const problems: string[] = [];
  if (units > 0 && price > 0 && !divisible) problems.push('총 상품 가격이 총 단위 수로 나누어떨어져야 해요 (단위당 가격은 원 단위 정수).');
  if (hostUnits && units >= 2 && !hostOk) problems.push(`내가 살 단위는 1~${units - 1}단위여야 해요 (참여자 몫을 1단위 이상 남겨야 해요).`);
  if (totalUnits && !(units >= 2 && units <= 100)) problems.push('총 단위 수는 2~100이에요.');

  const ready = productName.trim() && category && title.trim() && baseUnit.trim() && divisible && hostOk && problems.length === 0;
  const balance = me?.point.availableBalance ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !category) return;
    setBusy(true);
    setShortage(false);
    try {
      const res = await postApi.create({
        title: title.trim(), productName: productName.trim(), productLink: productLink.trim() || undefined,
        category, content: content.trim() || undefined, imageUrls, baseUnit: baseUnit.trim(),
        totalUnits: units, totalPrice: price, hostUnits: host,
      });
      await refresh();
      toast.ok(`공구를 열었어요! 내 몫 ${pt(res.paidPoint)}가 결제(보류)됐어요. 남은 포인트 ${pt(res.balanceAfter)}`);
      navigate(`/posts/${res.postId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'POINT409') setShortage(true);
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow" style={{ maxWidth: 760 }}>
      <form className="card stack lg" style={{ padding: 40 }} onSubmit={submit}>
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>공구 열기</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>함께 살 상품 정보를 입력해 주세요. 등록하면 자동으로 호스트가 되고, 내가 살 몫은 바로 포인트로 결제(보류)돼요.</p>
        </div>

        <div className="field"><label>상품 사진 (최대 10장)</label>
          <ImageUploader type="POST" urls={imageUrls} onChange={setImageUrls} max={10} /></div>

        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="field grow"><label>상품명</label>
            <input className="input" placeholder="예) 코스트코 생수 2L x 24" value={productName} maxLength={100}
              onChange={(e) => setProductName(e.target.value)} /></div>
          <div className="field grow"><label>카테고리</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              <option value="">선택하세요</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select></div>
        </div>

        <div className="field"><label>게시글 제목</label>
          <input className="input" placeholder="예) 생수 같이 사실 분 구해요" value={title} maxLength={50}
            onChange={(e) => setTitle(e.target.value)} /></div>

        <div className="stack" style={{ background: '#f7f7f7', border: '1px solid #e6e6e6', borderRadius: 12, padding: 24 }}>
          <div>
            <div className="section-title" style={{ margin: 0 }}>판매 단위 설정</div>
            <div className="small muted">기본 단위를 정하면 참여자가 단위 기준으로 여러 개 구매할 수 있어요</div>
          </div>
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="field grow"><label>기본 단위</label>
              <input className="input" placeholder="예) 2L 생수 4병" value={baseUnit} maxLength={30} onChange={(e) => setBaseUnit(e.target.value)} /></div>
            <div className="field grow"><label>총 단위 수</label>
              <input className="input" inputMode="numeric" placeholder="예) 6" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value.replace(/\D/g, ''))} /></div>
            <div className="field grow"><label>총 상품 가격 (원)</label>
              <input className="input" inputMode="numeric" placeholder="29040" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value.replace(/\D/g, ''))} /></div>
          </div>
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div className="field grow"><label>단위당 가격 (자동 계산)</label>
              <input className="input" disabled value={divisible ? won(unitPrice) : ''} placeholder="4,840원" /></div>
            <div className="field grow"><label>내가 구매할 수량 (호스트)</label>
              <input className="input" inputMode="numeric" placeholder="예) 2" value={hostUnits} onChange={(e) => setHostUnits(e.target.value.replace(/\D/g, ''))} /></div>
            <div className="grow" />
          </div>
          <div className="input small" style={{ background: '#fff' }}>
            <span className="strong">미리보기 </span>
            {divisible && hostOk
              ? `1단위(${baseUnit || '기본 단위'}) ${won(unitPrice)} · 총 ${units}단위 · 남은 ${units - host}단위 모집 · 1인 최대 ${units - host}단위`
              : '총 단위 수, 총 가격, 내가 살 수량을 입력하면 보여요'}
          </div>
          {problems.map((p) => <div key={p} className="error-text">{p}</div>)}
        </div>

        <div className="field"><label>상품 링크 (선택)</label>
          <input className="input" placeholder="https://" value={productLink} maxLength={500} onChange={(e) => setProductLink(e.target.value)} /></div>
        <div className="field"><label>내용</label>
          <textarea className="textarea" placeholder="수령 방법, 나눔 방식 등을 자유롭게 적어주세요" value={content} maxLength={2000}
            onChange={(e) => setContent(e.target.value)} /></div>

        <div className="field"><label>거래 위치</label>
          <div className="input muted">📍 {me?.location?.dongName ?? '동네 미설정'} · 내 집 위치 기준으로 근처 이웃에게 보여요 (정확한 좌표는 공개되지 않아요)</div></div>

        <div className={`notice${shortage ? ' danger' : ''}`}>
          {Number.isNaN(hostPay)
            ? <>내가 살 수량을 입력하면 결제(보류)될 포인트가 보여요</>
            : <>등록하면 내 몫 <b>{pt(hostPay)}</b>가 바로 결제(보류)돼요</>} · 지금 사용 가능 {pt(balance)}
          {shortage && <> — 포인트가 부족해요. <Link to="/points" style={{ textDecoration: 'underline' }}>충전하러 가기</Link></>}
        </div>

        <hr className="divider" />
        <div className="row between">
          <span className="small muted">* 모집 기간은 7일이에요. 총 단위가 모두 모이면 자동으로 모집 완료돼요.</span>
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>취소</button>
            <button className="btn btn-primary" disabled={!ready || busy}>{busy ? '등록 중…' : '등록하기'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
