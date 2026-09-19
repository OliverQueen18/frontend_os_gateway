import { TransactionStatus, TransactionType, TxPriority } from './api.models';

export interface Transaction {
  id: number;
  reference: string;
  type: TransactionType | string;
  status: TransactionStatus;
  operator: string;
  amount: number;
  commission?: number;
  adminCommission?: number;
  distributorCommission?: number;
  currency?: string;
  phoneNumber?: string;
  beneficiaryPhone?: string;
  userId?: number;
  distributorId?: number | null;
  gatewayId?: number;
  /** Solde MM gateway avant exécution. */
  gatewayBalanceBefore?: number | null;
  /** Solde MM gateway après exécution. */
  gatewayBalanceAfter?: number | null;
  gatewayBalanceDelta?: number | null;
  balanceConfirmed?: boolean | null;
  ussdResponse?: string;
  screenshotUrl?: string;
  durationMs?: number;
  note?: string;
  priority?: TxPriority;
  cancellationReasonId?: number | null;
  cancellationNote?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface TransactionCreateRequest {
  userId?: number | null;
  distributorId?: number | null;
  /** PIN transaction du distributeur (4–6 chiffres). */
  pin: string;
  operator: string;
  type: TransactionType | string;
  beneficiaryPhone?: string | null;
  amount?: number | null;
  priority?: TxPriority;
}

export interface TransactionFilters {
  type?: TransactionType | '';
  status?: TransactionStatus | '';
  operator?: string;
  distributorId?: number | null;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface TransactionHistoryEvent {
  id: number;
  status?: TransactionStatus;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  createdAt: string;
}
