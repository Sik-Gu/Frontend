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
export type ActionRequired = 'ORDER' | 'SHIP' | 'DISTRIBUTE' | 'CONFIRM_RECEIPT' | 'WRITE_REVIEW' | 'PAY_DEBT';
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

// ---------- 공구 ----------
export interface PostCard {
  postId: number; title: string; thumbnailUrl: string | null; category: Category; unitPrice: number; baseUnit: string;
  totalUnits: number; filledUnits: number; participantCount: number; dongName: string; distance: DistanceRange | null;
  status: PostStatus; viewCount: number; deadlineAt: string; createdAt: string;
}
export interface PostCreateRequest {
  title: string; productName: string; productLink?: string; category: Category; content?: string;
  imageUrls: string[]; baseUnit: string; totalUnits: number; totalPrice: number; hostUnits: number;
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
export interface ChargePrepareResponse { orderId: string; amount: number; orderName: string; }
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
