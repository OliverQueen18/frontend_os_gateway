import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { AlertItem } from '../models/user.models';

interface BackendNotification {
  id: number;
  type?: string;
  title: string;
  message: string;
  severity?: string;
  readFlag?: boolean;
  createdAt?: string;
  gatewayId?: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http = inject(HttpClient);

  list(): Observable<AlertItem[]> {
    return this.http
      .get<ApiResponse<PageResponse<BackendNotification>>>(`${environment.apiUrl}/notifications`)
      .pipe(
        map((res) => {
          const content = res.data?.content;
          if (!Array.isArray(content)) {
            return [];
          }
          return content.map((n) => this.toAlert(n));
        }),
      );
  }

  acknowledge(id: number): Observable<AlertItem> {
    return this.http
      .patch<ApiResponse<BackendNotification>>(`${environment.apiUrl}/notifications/${id}/read`, {})
      .pipe(map((res) => this.toAlert(res.data)));
  }

  private toAlert(n: BackendNotification): AlertItem {
    const severity = (n.severity ?? 'INFO').toUpperCase();
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      severity:
        severity === 'WARNING' || severity === 'CRITICAL' || severity === 'INFO'
          ? severity
          : 'INFO',
      source: n.type ?? (n.gatewayId != null ? `gateway:${n.gatewayId}` : 'notification'),
      acknowledged: Boolean(n.readFlag),
      createdAt: n.createdAt ?? new Date().toISOString(),
    };
  }
}
