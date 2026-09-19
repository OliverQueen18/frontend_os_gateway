export type SmsStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SCHEDULED';

export interface SmsMessage {
  id: number;
  to: string;
  body: string;
  status: SmsStatus;
  operator?: string;
  gatewayId?: number;
  scheduledAt?: string;
  createdAt: string;
}

export interface SmsSendRequest {
  to: string;
  body: string;
  operator?: string;
  gatewayId?: number;
}

export interface SmsBulkRequest {
  recipients: string[];
  body: string;
  operator?: string;
}

export interface SmsScheduleRequest {
  to: string;
  body: string;
  scheduledAt: string;
  operator?: string;
}
