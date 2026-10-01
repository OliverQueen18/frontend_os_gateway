export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  enabled: boolean;
  roles: string[];
}

export interface UserRequest {
  username: string;
  email: string;
  password?: string;
  fullName?: string;
  phone?: string;
  enabled?: boolean;
  roles?: string[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface Permission {
  id: number;
  code: string;
  description?: string;
}

export interface PermissionRequest {
  code: string;
  description?: string;
}

export interface SettingItem {
  id?: number;
  key: string;
  value: string;
  description?: string;
}

export type RegistrationStatus = 'FEE_PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export type AttachmentDocType = 'RCCM' | 'NIF' | 'NINA' | 'ID_CARD' | 'OTHER';

export interface Distributor {
  id: number;
  userId?: number;
  code: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  rccm?: string;
  nif?: string;
  nina?: string;
  balance: number;
  commissionRate?: number;
  active: boolean;
  createdAt?: string;
  username?: string;
  hasPin?: boolean;
  /** Présent uniquement juste après création. */
  temporaryPassword?: string;
  registrationStatus?: RegistrationStatus | string;
  registrationFeeAmount?: number;
  registrationFeePaid?: boolean;
  registrationFeePaidAt?: string;
  registrationFeePaymentRef?: string;
  registrationFeePaymentMethod?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  submittedAt?: string;
  attachmentCount?: number;
}

export interface DistributorRequest {
  userId?: number | null;
  code: string;
  /** Login du compte utilisateur (création / modification). */
  username?: string;
  name?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  rccm?: string;
  nif?: string;
  nina?: string;
  balance?: number;
  active?: boolean;
  pin?: string;
  password?: string;
}

export interface Attachment {
  id: number;
  distributorId: number;
  docType: AttachmentDocType | string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt?: string;
}

export interface RejectRequest {
  reason: string;
}

export type UvPaymentMethod = 'CASH' | 'GATEWAY_DEPOSIT';

export interface UvPurchase {
  id: number;
  distributorId: number;
  amount: number;
  paymentMethod: UvPaymentMethod;
  gatewayId?: number;
  reference?: string;
  note?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface UvPurchaseRequest {
  amount: number;
  paymentMethod: UvPaymentMethod;
  gatewayId?: number | null;
  note?: string;
}

export type CommissionPayoutMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';

export interface CommissionBalance {
  distributorId: number;
  distributorCode?: string;
  distributorName?: string;
  earned: number;
  paid: number;
  unpaid: number;
}

export interface CommissionPayout {
  id: number;
  distributorId: number;
  amount: number;
  paymentMethod: CommissionPayoutMethod;
  reference?: string;
  note?: string;
  unpaidAfter: number;
  paidAt: string;
  createdAt?: string;
  createdBy?: string;
}

export interface CommissionPayoutRequest {
  amount: number;
  paymentMethod: CommissionPayoutMethod;
  reference?: string;
  note?: string;
}

export type BalanceEffect = 'DEBIT' | 'CREDIT' | 'NONE';
export type CommissionMode = 'PERCENT' | 'FIXED';

export interface OperationType {
  id: number;
  code: string;
  label: string;
  description?: string;
  /** Classe PrimeIcons, ex. pi pi-arrow-down */
  icon?: string;
  balanceEffect: BalanceEffect;
  commissionMode?: CommissionMode;
  commissionValue?: number;
  adminSharePercent?: number;
  distributorSharePercent?: number;
  active: boolean;
  /** When true, PENDING/QUEUED transactions of this type can be cancelled from the UI. */
  cancellable?: boolean;
  /** When true, beneficiary phone is required on create. */
  requiresPhone?: boolean;
  /** When true, amount (> 0) is required on create. */
  requiresAmount?: boolean;
  operatorCommissions?: OperatorCommission[];
  commissionRules?: CommissionRule[];
}

export type CommissionCalculationMode = 'BASE_THEN_SPLIT' | 'DIRECT_ON_AMOUNT';

export interface CommissionRule {
  id?: number;
  operatorCode: string;
  operatorName?: string;
  amountMin?: number | null;
  amountMax?: number | null;
  calculationMode: CommissionCalculationMode;
  ratePercent?: number | null;
  commissionMin?: number | null;
  commissionMax?: number | null;
  distributorRate: number;
  adminRate: number;
  operatorRate?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  active?: boolean;
  priority?: number;
}

export interface OperatorCommission {
  operatorCode: string;
  operatorName?: string;
  commissionMode?: CommissionMode;
  commissionValue?: number;
  adminSharePercent?: number;
  distributorSharePercent?: number;
}

export interface OperationTypeRequest {
  code: string;
  label: string;
  description?: string;
  icon?: string;
  balanceEffect?: BalanceEffect;
  commissionMode?: CommissionMode;
  commissionValue?: number;
  adminSharePercent?: number;
  distributorSharePercent?: number;
  active?: boolean;
  cancellable?: boolean;
  requiresPhone?: boolean;
  requiresAmount?: boolean;
}

export interface BalancePattern {
  id?: number;
  fieldType: 'PRINCIPAL' | 'BONUS_UV' | string;
  regexPattern: string;
  priority?: number;
  active?: boolean;
  description?: string;
}

export interface Operator {
  id: number;
  code: string;
  name: string;
  country?: string;
  active: boolean;
  logoUrl?: string | null;
}

export interface OperatorRequest {
  code: string;
  name: string;
  active?: boolean;
  logoUrl?: string | null;
}

export interface UssdStep {
  id?: number;
  stepOrder: number;
  /** COMPOSE | READ | REPLY | WAIT | CONTINUE | VALIDATE | EXTRACT */
  action: string;
  expression?: string | null;
  expectedPattern?: string | null;
  extractVar?: string | null;
  waitMillis?: number | null;
}

export interface UssdTemplate {
  id: number;
  operatorId?: number;
  operatorCode?: string;
  transactionType?: string;
  name: string;
  /** Résumé textuel des expressions (rétrocompat affichage). */
  template?: string;
  description?: string;
  active?: boolean;
  steps?: UssdStep[];
}

export interface RoleRequest {
  name: string;
  description?: string;
  permissions?: string[];
}

export interface AlertItem {
  id: number;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  resource: string;
  details?: string;
  ip?: string;
  createdAt: string;
}
