import type { DesiredResolution, InquiryResolution, InquiryStatus, InquiryType, LeaveReason, PaymentStatus } from '../api/types';

/** 관리자 화면에서만 쓰는 이름표 */
export const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  NOT_RECEIVED: '못 받음',
  SHORT_QUANTITY: '수량 부족',
  WRONG_OR_DAMAGED: '다른 상품·파손',
  ETC: '기타',
};
export const DESIRED_LABEL: Record<DesiredResolution, string> = {
  REDELIVER: '다시 받기',
  PARTIAL_REFUND: '부분 환불',
  FULL_REFUND: '전액 환불',
};
export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  OPEN: '처리 전',
  IN_PROGRESS: '처리 중',
  RESOLVED: '처리 완료',
};
export const RESOLUTION_LABEL: Record<InquiryResolution, string> = {
  REDELIVER: '다시 받음',
  PARTIAL_REFUND: '부분 환불',
  FULL_REFUND: '전액 환불',
  REJECTED: '문제 없음',
};
export const LEAVE_LABEL: Record<LeaveReason, string> = {
  CHANGED_MIND: '마음이 바뀜',
  PLACE_DISAGREEMENT: '나눔 장소 불일치',
};
export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PAID: '참여 중',
  REFUNDED: '환급됨',
};
