import type { ChargeMethod, ChargePrepareResponse } from '../api/types';

/**
 * 토스페이먼츠 결제창 (SDK v2, API 개별 연동 키).
 * 결제가 끝나면 토스가 successUrl / failUrl 로 이 탭을 이동시킨다 → ChargeResultPage 가 서버 승인을 부른다.
 * 클라이언트 키는 충전 준비 응답(clientKey)으로 받는다. 시크릿 키는 서버에만 있다.
 */
const SDK_URL = 'https://js.tosspayments.com/v2/standard';

interface TossPaymentsSdk {
  (clientKey: string): { payment: (opts: { customerKey: string }) => { requestPayment: (req: unknown) => Promise<void> } };
  ANONYMOUS: string;
}

declare global {
  interface Window { TossPayments?: TossPaymentsSdk; }
}

let loading: Promise<TossPaymentsSdk> | null = null;

function loadSdk(): Promise<TossPaymentsSdk> {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error('토스 결제 모듈 로드 실패')));
      script.onerror = () => { loading = null; reject(new Error('토스 결제 모듈 로드 실패 · 네트워크 확인 필요')); };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/** 우리 결제 수단 → 토스 결제창 옵션. 카카오페이·토스페이는 카드 결제창에서 해당 간편결제로 바로 연다 */
function methodOptions(method: ChargeMethod) {
  if (method === 'CARD') return { method: 'CARD', card: { flowMode: 'DEFAULT' } };
  return { method: 'CARD', card: { flowMode: 'DIRECT', easyPay: method } };
}

/** 토스 결제창을 연다. 사용자가 창을 닫으면 USER_CANCEL 코드로 reject 된다 */
export async function openTossPayment(order: ChargePrepareResponse, method: ChargeMethod): Promise<void> {
  if (!order.clientKey) throw new Error('서버에 토스 클라이언트 키 미설정');
  const TossPayments = await loadSdk();
  const payment = TossPayments(order.clientKey).payment({ customerKey: TossPayments.ANONYMOUS });
  await payment.requestPayment({
    ...methodOptions(method),
    amount: { currency: 'KRW', value: order.amount },
    orderId: order.orderId,
    orderName: order.orderName,
    successUrl: `${location.origin}/points/charge/success`,
    failUrl: `${location.origin}/points/charge/fail`,
  });
}

export function isUserCancel(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'USER_CANCEL';
}
