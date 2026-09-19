export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  errorCode?: string;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type GatewayStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'IDLE' | 'MAINTENANCE' | 'DISABLED';
export type TransactionStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'WAITING_SMS_CONFIRMATION'
  | 'SUCCESS'
  | 'FAILED'
  | 'TIMEOUT'
  | 'CANCELLED';
export type TransactionType =
  | 'DEPOT'
  | 'RETRAIT'
  | 'TRANSFERT'
  | 'SOLDE'
  | 'ACHAT_CREDIT'
  | 'PAIEMENT'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'BALANCE'
  | 'OTHER';

export type TxPriority = 'URGENT' | 'NORMAL' | 'BASSE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
