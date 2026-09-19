import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { SmsBulkRequest, SmsMessage, SmsScheduleRequest, SmsSendRequest } from '../models/sms.models';

/** Forme renvoyée / attendue par sms-service. */
interface SmsApiPayload {
  id?: number;
  recipient?: string;
  content?: string;
  to?: string;
  body?: string;
  status?: SmsMessage['status'];
  gatewayId?: number;
  scheduledAt?: string;
  createdAt?: string;
  sentAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly http = inject(HttpClient);

  history(page = 0, size = 20): Observable<PageResponse<SmsMessage> | SmsMessage[]> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http
      .get<ApiResponse<PageResponse<SmsApiPayload> | SmsApiPayload[]>>(
        `${environment.apiUrl}/sms/history`,
        { params },
      )
      .pipe(
        map((res) => {
          const data = res.data;
          if (!data) {
            return { content: [], page, size, totalElements: 0, totalPages: 0, first: true, last: true };
          }
          if (Array.isArray(data)) {
            return data.map((m) => this.normalize(m));
          }
          return {
            ...data,
            content: (data.content ?? []).map((m) => this.normalize(m)),
          };
        }),
      );
  }

  send(request: SmsSendRequest): Observable<SmsMessage> {
    return this.http
      .post<ApiResponse<SmsApiPayload>>(`${environment.apiUrl}/sms/send`, {
        recipient: request.to,
        content: request.body,
        gatewayId: request.gatewayId,
      })
      .pipe(map((res) => this.normalize(res.data ?? {})));
  }

  bulk(request: SmsBulkRequest): Observable<{ queued: number }> {
    return this.http
      .post<ApiResponse<SmsApiPayload[]>>(`${environment.apiUrl}/sms/bulk`, {
        recipients: request.recipients,
        content: request.body,
      })
      .pipe(
        map((res) => ({
          queued: Array.isArray(res.data) ? res.data.length : request.recipients.length,
        })),
      );
  }

  schedule(request: SmsScheduleRequest): Observable<SmsMessage> {
    return this.http
      .post<ApiResponse<SmsApiPayload>>(`${environment.apiUrl}/sms/schedule`, {
        recipient: request.to,
        content: request.body,
        scheduledAt: request.scheduledAt,
      })
      .pipe(map((res) => this.normalize(res.data ?? {})));
  }

  private normalize(m: SmsApiPayload): SmsMessage {
    return {
      id: m.id ?? 0,
      to: m.recipient ?? m.to ?? '',
      body: m.content ?? m.body ?? '',
      status: (m.status as SmsMessage['status']) ?? 'QUEUED',
      gatewayId: m.gatewayId,
      scheduledAt: m.scheduledAt,
      createdAt: m.createdAt ?? m.sentAt ?? new Date().toISOString(),
    };
  }
}
