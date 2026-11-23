import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { pointApi } from '../api/endpoints';
import { pt } from '../lib/format';
import { useSession, useToast } from '../lib/session';

/**
 * 토스 결제창이 끝나고 돌아오는 화면.
 * - /points/charge/success?paymentKey&orderId&amount → 서버 승인(confirm) → 포인트 화면으로
 * - /points/charge/fail?code&message&orderId → 실패 안내 (준비된 주문은 30분 뒤 서버가 만료 처리)
 * 승인은 같은 주문번호로 여러 번 불러도 한 번만 적립된다 (BR-24). 그래도 새로고침마다 다시 부르지 않게 한 번만 보낸다.
 */
export default function ChargeResultPage({ result }: { result: 'success' | 'fail' }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useSession();
  const sent = useRef(false);
  const [error, setError] = useState<string | null>(result === 'fail' ? params.get('message') ?? '결제가 취소됐어요.' : null);

  useEffect(() => {
    if (result !== 'success' || sent.current) return;
    sent.current = true;
    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = Number(params.get('amount'));
    if (!paymentKey || !orderId || !amount) {
      setError('결제 정보가 올바르지 않아요.');
      return;
    }
    pointApi.confirmCharge(orderId, paymentKey, amount)
      .then(async (res) => {
        toast.ok(`${pt(res.chargedPoint)} 충전됐어요. 사용 가능 포인트 ${pt(res.balanceAfter)}`);
        await refresh();
        navigate('/points', { replace: true });
      })
      .catch((e) => {
        toast.error(e);
        setError(e instanceof Error ? e.message : '충전 승인에 실패했어요.');
      });
  }, [result, params, navigate, toast, refresh]);

  return (
    <div className="page narrow">
      <div className="card stack" style={{ textAlign: 'center' }}>
        {error ? (
          <>
            <h1 style={{ fontSize: 22, margin: 0 }}>충전하지 못했어요</h1>
            <p className="muted" style={{ margin: 0 }}>{error}</p>
            {params.get('code') && <p className="small muted" style={{ margin: 0 }}>{params.get('code')}</p>}
            <Link className="btn btn-primary" to="/points" replace>포인트 화면으로</Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 22, margin: 0 }}>결제를 확인하고 있어요</h1>
            <p className="muted" style={{ margin: 0 }}>잠시만 기다려 주세요. 창을 닫지 마세요.</p>
          </>
        )}
      </div>
    </div>
  );
}
