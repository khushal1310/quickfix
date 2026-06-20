// TypeScript Type Definitions for QuickFix

export type UserRole = 'customer' | 'provider' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  mobileNumber: string;
  profileImage: string | null;
  isSuspended?: boolean;
  createdAt: string;
  dob?: string | null;
  custom_user_id?: string;
  customUserId?: string;
  selfie_url?: string;
  kyc_status?: string;
  verification_status?: string;
  completed_orders_count?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
}

export type RequestStatus = 
  | 'OPEN' 
  | 'ACCEPTED' 
  | 'SELECTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'AUTOCOMPLETED' 
  | 'DISPUTED' 
  | 'CANCELLED';

export interface ServiceRequest {
  id: string;
  customerId: string;
  categoryId: string;
  description: string;
  area: string;
  city: string;
  budget: number | null;
  status: RequestStatus;
  createdAt: string;
  
  // Joins
  customer?: User;
  category?: ServiceCategory;
  images?: string[];
  acceptsCount?: number;
}

export interface RequestImage {
  id: string;
  requestId: string;
  imageUrl: string;
}

export interface ProviderAccept {
  id: string;
  requestId: string;
  providerId: string;
  status: 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  
  // Joins
  provider?: User;
}

export type OrderStatus = 
  | 'SELECTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'AUTOCOMPLETED' 
  | 'DISPUTED' 
  | 'CANCELLED';

export interface Order {
  id: string;
  requestId: string;
  customerId: string;
  providerId: string;
  status: OrderStatus;
  startedAt: string | null;
  completedAt: string | null;
  
  // Joins
  request?: ServiceRequest;
  customer?: User;
  provider?: User;
}

export interface Wallet {
  id: string;
  providerId: string;
  balance: number;
  heldAmount: number;
  availableAmount: number;
}

export type TransactionType = 'Credit' | 'Debit' | 'Hold' | 'Release' | 'Fee Deduction';

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  orderId: string;
  order?: Order;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  message: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
  
  // Joins
  sender?: User;
}

export interface Dispute {
  id: string;
  orderId: string;
  reason: string;
  description: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  reporter_custom_id?: string;
  reported_custom_id?: string;
  
  // Joins
  order?: Order;
}
