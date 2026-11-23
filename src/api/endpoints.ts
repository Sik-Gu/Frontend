import { del, get, patch, post, put, qs } from './client';
import type * as T from './types';

export const authApi = {
  sendEmail: (email: string) => post<T.EmailSendResponse>('/api/auth/email/send', { email }),
  verifyEmail: (email: string, code: string) => post<T.EmailVerifyResponse>('/api/auth/email/verify', { email, code }),
  signup: (verificationToken: string, password: string) =>
    post<T.SignupResponse>('/api/auth/signup', { verificationToken, password }),
  login: (email: string, password: string) => post<T.LoginResponse>('/api/auth/login', { email, password }),
  logout: () => post<void>('/api/auth/logout'),
  // 비밀번호 찾기: 인증코드 발송 → 확인(재설정 토큰) → 새 비밀번호
  sendResetCode: (email: string) => post<T.EmailSendResponse>('/api/auth/password/email/send', { email }),
  verifyResetCode: (email: string, code: string) =>
    post<T.EmailVerifyResponse>('/api/auth/password/email/verify', { email, code }),
  resetPassword: (resetToken: string, newPassword: string) =>
    post<null>('/api/auth/password/reset', { resetToken, newPassword }),
};

export const userApi = {
  me: () => get<T.MeResponse>('/api/users/me'),
  setLocation: (dongName: string, latitude: number, longitude: number) =>
    patch<T.LocationResponse>('/api/users/me/location', { dongName, latitude, longitude }),
  myPosts: (tab: T.MyPostTab, filter: T.MyPostFilter, page = 0) =>
    get<T.Page<T.MyPostCard>>(`/api/users/me/posts${qs({ tab, filter, page, size: 20 })}`),
  profile: (userId: number) => get<T.ProfileResponse>(`/api/users/${userId}`),
  reviews: (userId: number, page = 0) =>
    get<T.Page<T.ReceivedReview>>(`/api/users/${userId}/reviews${qs({ page, size: 10 })}`),
  block: (userId: number) => post<unknown>(`/api/users/${userId}/block`),
  unblock: (userId: number) => del<unknown>(`/api/users/${userId}/block`),
};

export const locationApi = {
  /** 좌표 → 동 이름 (백엔드가 OpenStreetMap Nominatim 으로 조회) */
  lookupDong: (latitude: number, longitude: number) =>
    get<T.LocationResponse>(`/api/locations/dong${qs({ latitude, longitude })}`),
};

export const adminApi = {
  statsSummary: () => get<T.StatsSummary>('/api/admin/stats/summary'),
  statsDaily: (days: number) => get<T.DailyStat[]>(`/api/admin/stats/daily${qs({ days })}`),
  users: (keyword: string | undefined, status: T.UserStatus | undefined, page = 0) =>
    get<T.Page<T.AdminUserItem>>(`/api/admin/users${qs({ keyword, status, page, size: 20 })}`),
  user: (userId: number) => get<T.AdminUserDetail>(`/api/admin/users/${userId}`),
  reports: (status: T.ReportStatus | undefined, page = 0) =>
    get<T.Page<T.AdminReport>>(`/api/admin/reports${qs({ status, page, size: 20 })}`),
  changeUserStatus: (userId: number, status: T.UserStatus, suspendedUntil?: string | null) =>
    patch<T.AdminUser>(`/api/admin/users/${userId}/status`, { status, suspendedUntil: suspendedUntil ?? null }),
};

export const reportApi = {
  create: (body: T.ReportCreateRequest) => post<T.ReportCreateResponse>('/api/reports', body),
};

export const notificationApi = {
  list: (page = 0) => get<T.Page<T.NotificationItem>>(`/api/notifications${qs({ page, size: 20 })}`),
  unreadCount: () => get<{ unreadCount: number }>('/api/notifications/unread-count'),
  read: (id: number) => patch<T.NotificationItem>(`/api/notifications/${id}/read`),
  readAll: () => patch<{ unreadCount: number }>('/api/notifications/read-all'),
};

export const imageApi = {
  upload: (files: File[], type: T.ImageType) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return post<{ images: { url: string; originalName: string; size: number }[] }>(`/api/images${qs({ type })}`, form);
  },
};

export interface PostSearch {
  keyword?: string; category?: T.Category; radius: 500 | 1000; recruitingOnly: boolean; sort: T.PostSort; page: number;
}

export const postApi = {
  search: (s: PostSearch) => get<T.Page<T.PostCard>>(`/api/posts${qs({ ...s, size: 9 })}`),
  detail: (postId: number) => get<T.PostDetail>(`/api/posts/${postId}`),
  create: (body: T.PostCreateRequest) => post<T.PostCreateResponse>('/api/posts', body),
  update: (postId: number, body: T.PostUpdateRequest) => patch<{ postId: number }>(`/api/posts/${postId}`, body),
  cancel: (postId: number) => del<T.PostCancelResponse>(`/api/posts/${postId}`),
  join: (postId: number, units: number) => post<T.JoinResponse>(`/api/posts/${postId}/participations`, { units }),
  /** 참여 중인 공구에 수량 추가 (늘리기만, 모집중에만) */
  addUnits: (postId: number, units: number) =>
    patch<T.JoinResponse>(`/api/posts/${postId}/participations/me/units`, { units }),
  leave: (postId: number, reason: T.LeaveReason) =>
    del<T.LeaveResponse>(`/api/posts/${postId}/participations/me${qs({ reason })}`),
  participations: (postId: number) => get<T.ParticipationStatusResponse>(`/api/posts/${postId}/participations`),
  proposePlace: (postId: number, name: string) =>
    put<T.DistributionPlaceInfo>(`/api/posts/${postId}/distribution-place`, { name }),
  agreePlace: (postId: number) => post<T.DistributionPlaceInfo>(`/api/posts/${postId}/distribution-place/agreement`),
  registerOrder: (postId: number, receiptImageUrls: string[]) =>
    post<unknown>(`/api/posts/${postId}/order`, { receiptImageUrls }),
  order: (postId: number) => get<T.OrderDetail>(`/api/posts/${postId}/order`),
  ship: (postId: number, courier: string, trackingNumber: string) =>
    patch<unknown>(`/api/posts/${postId}/order/shipping`, { courier, trackingNumber }),
  distribute: (postId: number, distributeAt: string) =>
    patch<unknown>(`/api/posts/${postId}/order/distribution`, { distributeAt }),
  confirmReceipt: (postId: number) => post<T.ReceiptResult>(`/api/posts/${postId}/receipt`),
  reviewTargets: (postId: number) => get<T.ReviewTargetsResponse>(`/api/posts/${postId}/reviews/targets`),
  writeReviews: (postId: number, reviews: T.ReviewItem[]) =>
    post<{ createdReviewIds: number[] }>(`/api/posts/${postId}/reviews`, { reviews }),
};

export const pointApi = {
  me: () => get<T.PointMe>('/api/points/me'),
  transactions: (type: string, page: number) =>
    get<T.Page<T.PointTransaction>>(`/api/points/transactions${qs({ type, page, size: 10 })}`),
  prepareCharge: (amount: number, method: T.ChargeMethod) =>
    post<T.ChargePrepareResponse>('/api/points/charges', { amount, method }),
  confirmCharge: (orderId: string, paymentKey: string, amount: number) =>
    post<T.ChargeConfirmResponse>('/api/points/charges/confirm', { orderId, paymentKey, amount }),
};

export const chatApi = {
  rooms: (status: T.ChatRoomStatus) => get<T.ChatRoomSummary[]>(`/api/chats${qs({ status })}`),
  room: (roomId: number) => get<T.ChatRoomDetail>(`/api/chats/${roomId}`),
  messages: (roomId: number, cursor?: number | null) =>
    get<T.MessagePage>(`/api/chats/${roomId}/messages${qs({ cursor, size: 30 })}`),
  read: (roomId: number) => patch<unknown>(`/api/chats/${roomId}/read`),
};
