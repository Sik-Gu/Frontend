// 백엔드 DTO (SIKGU-BACKEND/Web/.../dto) 를 그대로 옮긴 타입

export type PostStatus = 'RECRUITING' | 'RECRUITED' | 'ORDERED' | 'SHIPPING' | 'DISTRIBUTED' | 'SETTLED' | 'CANCELLED';
export type Category = 'FOOD' | 'LIVING' | 'DAILY' | 'ETC';
export type ParticipationRole = 'HOST' | 'PARTICIPANT';
export type PaymentStatus = 'PAID' | 'REFUNDED';
export type ReceiptStatus = 'WAITING' | 'RECEIVED' | 'INQUIRING';
export type DistanceRange = 'WITHIN_500M' | 'WITHIN_1KM' | 'OVER_1KM';
export type PostSort = 'LATEST' | 'DEADLINE' | 'POPULAR' | 'PRICE';
export type LeaveReason = 'CHANGED_MIND' | 'PLACE_DISAGREEMENT';
export type MyPostTab = 'ONGOING' | 'DONE';
export type MyPostFilter = 'ALL' | 'HOST' | 'JOINED' | 'ACTION_REQUIRED';
export type ActionRequired = 'PROPOSE_PLACE' | 'AGREE_PLACE' | 'ORDER' | 'SHIP' | 'DISTRIBUTE' | 'CONFIRM_RECEIPT' | 'WRITE_REVIEW' | 'PAY_DEBT';
export type ChatRoomStatus = 'ONGOING' | 'CLOSED';
export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM';
export type ImageType = 'POST' | 'RECEIPT' | 'INQUIRY' | 'REPORT' | 'CHAT';
export type ChargeMethod = 'KAKAOPAY' | 'TOSSPAY' | 'CARD';
export type PointTxType = 'CHARGE' | 'PAYMENT' | 'REFUND' | 'SETTLEMENT';
export type ReviewTag = 'PUNCTUAL' | 'CLEAN_SPLIT' | 'FAST_REPLY' | 'FAST_PAYMENT';

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; hasNext: boolean; }

// ---------- 인증·회원 ----------
export interface EmailSendResponse { email: string; expiresInSec: number; }
export interface EmailVerifyResponse { verificationToken: string; expiresInSec: number; }
export interface SignupResponse { userId: number; nickname: string; }
export interface LoginResponse { accessToken: string; refreshToken: string; userId: number; nickname: string; }
export interface TokenResponse { accessToken: string; refreshToken: string; }

export interface LocationResponse { dongName: string; latitude: number; longitude: number; }
export interface MeResponse {
  userId: number; nickname: string; email: string; universityName: string | null;
  location: LocationResponse | null; joinedAt: string; rating: number | null; reviewCount: number;
  tradeCount: number; postCounts: { ongoing: number; done: number; actionRequired: number };
  point: { availableBalance: number; heldAmount: number; unpaidDebt: number }; restricted: boolean;
  role: 'USER' | 'ADMIN';
}
export interface MyPostCard {
  post: PostCard; myRole: ParticipationRole; myUnits: number;
  actionRequired: ActionRequired | null; reviewProgress: { written: number; total: number } | null;
}
export interface ProfileResponse {
  userId: number; nickname: string; universityName: string | null; dongName: string | null; joinedAt: string;
  rating: number | null; reviewCount: number; tradeCount: number; mainCategories: Category[];
  tagCounts: { tag: ReviewTag; count: number }[];
  recentReviews: { reviewerNickname: string; postTitle: string; rating: number; content: string | null; createdAt: string }[];
  recentTrades: { postId: number; role: ParticipationRole; title: string; status: PostStatus; settledAt: string | null }[];
  isBlocked: boolean;
}

export interface ReceivedReview {
  reviewId: number; reviewerId: number; reviewerNickname: string; reviewerRole: ParticipationRole; postId: number;
  postTitle: string; rating: number; tags: ReviewTag[]; content: string | null; createdAt: string;
}

// ---------- 공구 ----------
export interface PostCard {
  postId: number; title: string; thumbnailUrl: string | null; imageUrls: string[]; category: Category; unitPrice: number; baseUnit: string;
  totalUnits: number; filledUnits: number; participantCount: number; dongName: string; distance: DistanceRange | null;
  status: PostStatus; viewCount: number; deadlineAt: string; createdAt: string;
}
export interface PostCreateRequest {
  title: string; productName: string; productLink?: string; category: Category; content?: string;
  imageUrls: string[]; baseUnit: string; totalUnits: number; totalPrice: number; hostUnits: number;
}
/** PATCH /api/posts/{id}: 모집중이고 다른 참여자가 없을 때만. 가격·단위는 못 바꾼다 */
export interface PostUpdateRequest {
  title?: string; productName?: string; productLink?: string; category?: Category; content?: string; imageUrls?: string[];
}
export interface PostCreateResponse { postId: number; chatRoomId: number | null; unitPrice: number; paidPoint: number; balanceAfter: number; }
export interface PostCancelResponse { postId: number; postStatus: PostStatus; refundedCount: number; refundedPoint: number; }
export interface StatusTimeline {
  recruitedAt: string | null; orderedAt: string | null; shippedAt: string | null;
  distributedAt: string | null; settledAt: string | null; cancelledAt: string | null;
}
export interface HostSummary { userId: number; nickname: string; rating: number | null; tradeCount: number; mainCategories: Category[]; }
export interface ParticipantSummary {
  userId: number; nickname: string; role: ParticipationRole; units: number; rating: number | null;
  tradeCount: number; mainCategories: Category[]; placeAgreed: boolean;
}
export interface DistributionPlaceInfo {
  name: string | null; latitude: number | null; longitude: number | null; proposedAt: string | null;
  agreedCount: number; memberCount: number; allAgreed: boolean; myAgreed: boolean | null;
}
export interface MyParticipation { role: ParticipationRole; units: number; paymentStatus: PaymentStatus; receiptStatus: ReceiptStatus; }
export interface PostDetail {
  postId: number; title: string; productName: string; productLink: string | null; category: Category; content: string | null;
  imageUrls: string[]; baseUnit: string; totalUnits: number; filledUnits: number; participantCount: number;
  unitPrice: number; totalPrice: number; status: PostStatus; statusTimeline: StatusTimeline; dongName: string;
  distance: DistanceRange | null; distributionPlace: DistributionPlaceInfo | null; deadlineAt: string; viewCount: number;
  createdAt: string; host: HostSummary; participants: ParticipantSummary[] | null; me: MyParticipation | null;
  maxSelectableUnits: number; chatRoomId: number | null;
}

// ---------- 참여·주문 ----------
export interface JoinResponse { participationId: number; paidPoint: number; balanceAfter: number; postStatus: PostStatus; chatRoomId: number | null; }
export interface LeaveResponse { refundedPoint: number; balanceAfter: number; postStatus: PostStatus; leaveReason: LeaveReason; }
export interface ParticipantStatus {
  userId: number; nickname: string; role: ParticipationRole; units: number; paidPoint: number;
  paymentStatus: PaymentStatus; receiptStatus: ReceiptStatus; isMe: boolean;
}
export interface ParticipationStatusResponse { paidCount: number; receivedCount: number; totalCount: number; participants: ParticipantStatus[]; }
export interface OrderDetail {
  orderId: number; courier: string | null; trackingNumber: string | null; totalPrice: number; receiptImageUrls: string[];
  registeredAt: string; distributeAt: string | null; distributePlace: string | null; heldPoint: number;
}
export interface ReceiptResult { receiptStatus: ReceiptStatus; postStatus: PostStatus; }

// ---------- 포인트 ----------
export interface PointMe { availableBalance: number; heldAmount: number; updatedAt: string | null; }
export type PgProvider = 'TOSS' | 'MOCK';
/** pgProvider 가 TOSS 면 clientKey 로 토스 결제창을, MOCK 이면 가짜 결제창을 연다 */
export interface ChargePrepareResponse { orderId: string; amount: number; orderName: string; pgProvider: PgProvider; clientKey: string | null; }
export interface ChargeConfirmResponse { orderId: string; chargedPoint: number; balanceAfter: number; }
export interface PointTransaction {
  transactionId: number; type: PointTxType; description: string; amount: number;
  balanceAfter: number; postId: number | null; createdAt: string;
}

// ---------- 채팅 ----------
export interface ChatRoomSummary {
  chatRoomId: number; postId: number; name: string; thumbnailUrl: string | null; lastMessage: string | null;
  lastMessageType: MessageType | null; lastMessageAt: string | null; unreadCount: number; participantCount: number;
}
export interface ChatRoomDetail {
  chatRoomId: number; name: string; status: ChatRoomStatus; participantCount: number;
  participants: { userId: number; nickname: string; role: ParticipationRole }[];
  post: { postId: number; title: string; thumbnailUrl: string | null; status: PostStatus; unitPrice: number; filledUnits: number; totalUnits: number };
}
export interface ChatMessage {
  chatRoomId?: number; messageId: number; type: MessageType; senderId: number | null; senderNickname: string | null;
  content: string | null; imageUrl: string | null; sentAt: string;
}
export interface MessagePage { messages: ChatMessage[]; nextCursor: number | null; hasNext: boolean; }

// ---------- 후기 ----------
export interface ReviewTarget { userId: number; nickname: string; role: ParticipationRole; units: number; written: boolean; }
export interface ReviewTargetsResponse {
  postId: number; postTitle: string; postStatus: PostStatus; myRole: ParticipationRole;
  settledAt: string | null; writableUntil: string | null; canWrite: boolean; targets: ReviewTarget[];
}
export interface ReviewItem { targetUserId: number; rating: number; tags: ReviewTag[]; content?: string; }

// ---------- 신고 ----------
export type ReportReason = 'CHAT_ABUSE' | 'TRADE_VIOLATION' | 'ETC';
export type ViolationStage = 'RECRUITING' | 'PAYMENT' | 'ORDER' | 'RECEIPT' | 'SHIPPING' | 'DISTRIBUTION';
export interface ReportCreateRequest {
  targetUserId: number; reason: ReportReason;
  detail?: { messageIds?: number[]; violationStage?: ViolationStage };
  content?: string; imageUrls?: string[];
}
export interface ReportCreateResponse { reportId: number; status: 'PENDING' | 'DONE'; }

// ---------- 알림 ----------
export type NotificationType =
  | 'JOINED' | 'UNITS_ADDED' | 'LEFT' | 'RECRUITED' | 'PLACE_PROPOSED' | 'PLACE_ALL_AGREED'
  | 'ORDERED' | 'SHIPPED' | 'DISTRIBUTION_SCHEDULED' | 'SETTLED' | 'CANCELLED' | 'EXPIRED';
export interface NotificationItem {
  notificationId: number; type: NotificationType; message: string; postId: number | null; read: boolean; createdAt: string;
}

// ---------- 관리자 ----------
export type ReportStatus = 'PENDING' | 'DONE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export interface AdminUser {
  userId: number; nickname: string; email: string; role: 'USER' | 'ADMIN'; status: UserStatus; suspendedUntil: string | null;
}
export interface AdminReport {
  reportId: number; reason: ReportReason; violationStage: ViolationStage | null; content: string | null; imageUrls: string[];
  messages: { messageId: number; type: MessageType; content: string | null; imageUrl: string | null; sentAt: string }[];
  status: ReportStatus; createdAt: string; reporter: AdminUser; target: AdminUser;
}
