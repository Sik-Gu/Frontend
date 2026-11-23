import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pointApi } from '../api/endpoints';
import type { ChargeConfirmResponse, ChargeMethod, ChargePrepareResponse, PointMe, PointTransaction, PointTxType } from '../api/types';
import { Modal } from '../components/ui';
import { pt, shortDateTime, signedPt, TX_LABEL } from '../lib/format';
import { isUserCancel, openTossPayment } from '../lib/toss';
import { useSession, useToast } from '../lib/session';

const AMOUNTS = [5000, 10000, 30000, 50000];
const METHODS: { value: ChargeMethod; label: string }[] = [
  { value: 'KAKAOPAY', label: '카카오페이' },
  { value: 'TOSSPAY', label: '토스페이' },
  { value: 'CARD', label: '신용 / 체크카드' },
];
const FILTERS: ('ALL' | PointTxType)[] = ['ALL', 'CHARGE', 'PAYMENT', 'REFUND', 'SETTLEMENT'];

/** 06 포인트 · 충전 · 거래내역 */
export default function PointPage() {
  const { refresh } = useSession();
  const toast = useToast();
  const [wallet, setWallet] = useState<PointMe | null>(null);
  // 0 = 아직 금액을 고르지 않음. 이때 '충전 후 잔액'은 사용 가능 포인트와 같다
  const [amount, setAmount] = useState(0);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState<ChargeMethod>('KAKAOPAY');
  const [pending, setPending] = useState<ChargePrepareResponse | null>(null);
  const [lastDone, setLastDone] = useState<{ order: ChargePrepareResponse; paymentKey: string; result: ChargeConfirmResponse } | null>(null);
  const [filter, setFilter] = useState<'ALL' | PointTxType>('ALL');
  const [txs, setTxs] = useState<PointTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  // 마지막 충전 준비 때 서버가 알려 준 PG. 안내 문구에만 쓴다 (모르면 null)
  const [provider, setProvider] = useState<ChargePrepareResponse['pgProvider'] | null>(null);

  const loadWallet = useCallback(async () => {
    try { setWallet(await pointApi.me()); } catch (e) { toast.error(e); }
  }, [toast]);

  const loadTxs = useCallback(async (f: string, p: number) => {
    try {
      const res = await pointApi.transactions(f, p);
      setTxs((prev) => (p === 0 ? res.content : [...prev, ...res.content]));
      setPage(p);
      setHasNext(res.hasNext);
    } catch (e) {
      toast.error(e);
    }
  }, [toast]);

  useEffect(() => { loadWallet(); }, [loadWallet]);
  useEffect(() => { loadTxs(filter, 0); }, [filter, loadTxs]);

  const reloadAll = async () => { await Promise.all([loadWallet(), loadTxs(filter, 0), refresh()]); };

  const chargeAmount = custom ? Number(custom) : amount;

  // 1단계: 충전 준비 → 주문번호 발급 → 서버 PG가 토스면 토스 결제창, 가짜 PG면 가짜 결제창을 연다
  // 토스는 결제가 끝나면 /points/charge/success 로 이동하고, 그 화면(ChargeResultPage)이 2단계 승인을 부른다
  const prepare = async () => {
    setBusy(true);
    try {
      const order = await pointApi.prepareCharge(chargeAmount, method);
      setProvider(order.pgProvider);
      if (order.pgProvider === 'TOSS') {
        await openTossPayment(order, method);
      } else {
        setPending(order);
      }
    } catch (e) {
      if (isUserCancel(e)) toast.ok('결제 취소 · 준비된 주문은 30분 뒤 만료');
      else toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  // 2단계: PG 결제 결과로 승인 요청
  const confirm = async (order: ChargePrepareResponse, paymentKey: string, amountToSend = order.amount) => {
    setBusy(true);
    try {
      const replay = lastDone?.order.orderId === order.orderId;
      const result = await pointApi.confirmCharge(order.orderId, paymentKey, amountToSend);
      if (replay) {
        // 이미 승인된 주문: 서버는 처음 결과를 그대로 돌려주고 포인트는 더 쌓지 않는다 (BR-24)
        toast.ok(`이미 충전된 주문 · 추가 충전 없음, 사용 가능 포인트 변동 없음`);
      } else {
        toast.ok(`${pt(result.chargedPoint)} 충전 완료 · 사용 가능 포인트 ${pt(result.balanceAfter)}`);
        setLastDone({ order, paymentKey, result });
        // 충전이 끝나면 선택한 금액을 비워서 '충전 후 잔액'과 '사용 가능 포인트'가 같은 값으로 이어지게 한다
        setAmount(0);
        setCustom('');
      }
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
      setPending(null);
      await reloadAll();
    }
  };

  return (
    <div className="page">
      <div className="row split" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="stack" style={{ width: 420, flexShrink: 0, gap: 24 }}>
          <div className="card" style={{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}>
            <div className="small" style={{ opacity: .75 }}>사용 가능 포인트</div>
            <div style={{ fontSize: 34, fontWeight: 700 }} className="tabular">{wallet ? pt(wallet.availableBalance) : '-'}</div>
            <div className="small" style={{ opacity: .75 }}>
              공구에 보관 중(보류) {wallet ? pt(wallet.heldAmount) : '-'} · 마지막 변경 {shortDateTime(wallet?.updatedAt)}
            </div>
          </div>

          <div className="card stack">
            <h2 className="card-title" style={{ margin: 0 }}>포인트 충전</h2>
            <div className="field"><label>충전 금액</label>
              <div className="row wrap" style={{ gap: 8 }}>
                {AMOUNTS.map((a) => (
                  <button key={a} className={`btn btn-sm ${!custom && amount === a ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setAmount(a); setCustom(''); }}>{a.toLocaleString()}</button>
                ))}
              </div>
              <input className="input" inputMode="numeric" placeholder="직접 입력 (1,000P~500,000P, 1,000P 단위)" value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="field"><label>결제 수단</label>
              <div className="stack sm">
                {METHODS.map((m) => (
                  <label key={m.value} className="input row" style={{ cursor: 'pointer', background: method === m.value ? 'var(--surface-muted)' : '#fff', borderColor: method === m.value ? 'var(--primary)' : undefined }}>
                    <input type="radio" name="method" checked={method === m.value} onChange={() => setMethod(m.value)} /> {m.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="stack sm">
              <div className="row between"><span className="muted">충전 후 잔액</span>
                <span className="strong tabular" style={{ fontSize: 18 }}>{wallet ? pt(wallet.availableBalance + (chargeAmount || 0)) : '-'}</span></div>
              {wallet && (
                <div className="small muted tabular" style={{ textAlign: 'right' }}>
                  {chargeAmount
                    ? `사용 가능 ${pt(wallet.availableBalance)} + 충전 ${pt(chargeAmount)}`
                    : '충전할 금액을 고르면 더해서 보여줘요'}
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || !chargeAmount} onClick={prepare}>
              {chargeAmount ? `${chargeAmount.toLocaleString()}원 결제하기` : '충전할 금액을 골라 주세요'}
            </button>
            {provider === 'MOCK' && (
              <p className="hint" style={{ margin: 0 }}>개발 환경이라 실제 결제 없음 (가짜 PG) · 결제창에서 성공·실패 선택 가능</p>
            )}
            {provider === 'TOSS' && (
              <p className="hint" style={{ margin: 0 }}>토스페이먼츠 결제창으로 결제 · 결제가 끝나면 자동 충전</p>
            )}
          </div>

          {lastDone && (
            <div className="card stack sm">
              <div className="strong">멱등성 확인 (같은 주문 다시 승인)</div>
              <div className="small muted">주문 {lastDone.order.orderId} · 처음 결과 잔액 {pt(lastDone.result.balanceAfter)}</div>
              <div className="small muted">같은 주문번호로 승인을 다시 요청해도 포인트 중복 적립 없음</div>
              <button className="btn btn-secondary btn-sm" disabled={busy}
                onClick={() => confirm(lastDone.order, lastDone.paymentKey)}>같은 주문번호로 한 번 더 승인 요청</button>
            </div>
          )}
        </div>

        <div className="card grow" style={{ padding: 0 }}>
          <div style={{ padding: '24px 24px 16px' }}>
            <h2 className="card-title" style={{ marginBottom: 12 }}>거래 내역</h2>
            <div className="row" style={{ gap: 8 }}>
              {FILTERS.map((f) => (
                <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'ALL' ? '전체' : TX_LABEL[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>일시</th><th>유형</th><th>내용</th><th className="num">금액</th><th className="num">잔액</th></tr></thead>
            <tbody>
              {txs.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 32 }}>내역 없음</td></tr>}
              {txs.map((t) => (
                <tr key={t.transactionId}>
                  <td className="muted tabular">{shortDateTime(t.createdAt)}</td>
                  <td className="strong">{TX_LABEL[t.type] ?? t.type}</td>
                  <td>{t.postId ? <Link to={`/posts/${t.postId}`} style={{ textDecoration: 'underline' }}>{t.description}</Link> : t.description}</td>
                  <td className="num strong tabular">{signedPt(t.amount)}</td>
                  <td className="num muted tabular">{pt(t.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {hasNext && (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <button className="btn btn-ghost small" onClick={() => loadTxs(filter, page + 1)}>더보기</button>
            </div>
          )}
        </div>
      </div>

      {pending && (
        <Modal title="결제창 (가짜 PG)" onClose={() => { setPending(null); toast.ok('결제 취소 · 준비된 주문은 30분 뒤 만료'); }}>
          <div className="notice small">가짜 결제창 · 결과 선택</div>
          <div className="stack sm small">
            <div className="row between"><span className="muted">주문번호</span><code>{pending.orderId}</code></div>
            <div className="row between"><span className="muted">상품</span><span>{pending.orderName}</span></div>
            <div className="row between"><span className="muted">금액</span><span className="strong">{pending.amount.toLocaleString()}원</span></div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}
            onClick={() => confirm(pending, `mock_${Date.now()}`)}>결제 성공</button>
          <div className="row">
            <button className="btn btn-secondary grow" disabled={busy}
              onClick={() => confirm(pending, `fail_${Date.now()}`)}>결제 실패 (카드 거절)</button>
            <button className="btn btn-secondary grow" disabled={busy}
              onClick={() => confirm(pending, `mock_${Date.now()}`, pending.amount + 1000)}>금액 조작 시도</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
