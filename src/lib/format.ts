import type { Category, DistanceRange, PointTxType, PostStatus, ReceiptStatus, ReviewTag } from '../api/types';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export const pt = (n: number) => `${n.toLocaleString('ko-KR')} P`;
export const signedPt = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('ko-KR')}`;

export const STATUS_LABEL: Record<PostStatus, string> = {
  RECRUITING: '모집중',
  RECRUITED: '모집완료',
  ORDERED: '주문완료',
  SHIPPING: '배송중',
  DISTRIBUTED: '나눔 진행',
  SETTLED: '정산완료',
  CANCELLED: '취소됨',
};

/** 상세 화면 진행 단계 (백엔드 상태 기준. 피그마의 '결제 진행중'·'수령 확인' 단계는 지금 상태값에 없음) */
export const STATUS_STEPS: PostStatus[] = ['RECRUITING', 'RECRUITED', 'ORDERED', 'SHIPPING', 'DISTRIBUTED', 'SETTLED'];

export const CATEGORY_LABEL: Record<Category, string> = {
  FOOD: '식품',
  LIVING: '생활용품',
  DAILY: '생필품',
  ETC: '기타',
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

export const DISTANCE_LABEL: Record<DistanceRange, string> = {
  WITHIN_500M: '500m 이내',
  WITHIN_1KM: '1km 이내',
  OVER_1KM: '1km 이상',
};

export const RECEIPT_LABEL: Record<ReceiptStatus, string> = {
  WAITING: '수령 대기',
  RECEIVED: '받았어요',
  INQUIRING: '문의중',
};

export const TX_LABEL: Record<PointTxType, string> = {
  CHARGE: '충전',
  PAYMENT: '결제',
  REFUND: '환급',
  SETTLEMENT: '정산',
};

export const TAG_LABEL: Record<ReviewTag, string> = {
  PUNCTUAL: '시간 약속을 잘 지켜요',
  CLEAN_SPLIT: '소분이 깔끔해요',
  FAST_REPLY: '응답이 빨라요',
  FAST_PAYMENT: '결제가 빨라요',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** 2026-10-27T14:02:00 → 10.27 14:02 */
export function shortDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fullDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 채팅 시간: 오후 2:10 */
export function clock(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())}`;
}

/** 10분 전, 3시간 전, 어제, 10.24 */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 172800) return '어제';
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 남은 모집 기간: 6일 남음 / 3시간 남음 / 12분 남음 / 모집 기간 종료 */
export function remaining(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return '모집 기간 종료';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '1분 미만 남음';
  if (min < 60) return `${min}분 남음`;
  const h = Math.floor(min / 60);
  return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간 남음` : `${h}시간 ${min % 60}분 남음`;
}

/** 마감까지 하루가 안 남았으면 강조한다 */
export function isClosingSoon(iso: string, now = Date.now()): boolean {
  const diff = new Date(iso).getTime() - now;
  return diff > 0 && diff < 24 * 3600 * 1000;
}

/** 카드 태그용 마감 표시: 오늘 마감 / D-1 (임박) / D-5 / 마감 */
export function dday(iso: string): { label: string; hot: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { label: '마감', hot: false };
  if (diff < 86400000) return { label: '오늘 마감', hot: true };
  const days = Math.ceil(diff / 86400000);
  return { label: `D-${days}`, hot: days <= 1 };
}

/** datetime-local 입력값(로컬 시각) → 백엔드 LocalDateTime 문자열 */
export function toLocalDateTime(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}
