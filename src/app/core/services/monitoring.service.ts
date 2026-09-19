import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { DashboardStats } from '../models/gateway.models';
import { AuthService } from './auth.service';

const EMPTY_DASHBOARD: DashboardStats = {
  gatewaysTotal: 0,
  gatewaysOnline: 0,
  gatewaysOffline: 0,
  gatewaysActive: 0,
  lowBattery: 0,
  poorNetwork: 0,
  txPerMin: 0,
  smsPerMin: 0,
  distributorBalance: 0,
  alerts24h: 0,
  gatewaysByStatus: [],
  series: [],
};

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getDashboard(): Observable<DashboardStats> {
    if (!this.auth.getToken()) {
      return of({ ...EMPTY_DASHBOARD });
    }
    return this.http
      .get<ApiResponse<Record<string, unknown>>>(`${environment.apiUrl}/monitoring/dashboard`)
      .pipe(map((res) => this.normalize(res.data ?? {})));
  }

  getGatewayHealth(): Observable<unknown[]> {
    return this.http
      .get<ApiResponse<unknown[]>>(`${environment.apiUrl}/monitoring/gateways/health`)
      .pipe(map((res) => res.data ?? []));
  }

  private normalize(data: Record<string, unknown>): DashboardStats {
    const byStatus = (data['gatewaysByStatus'] as Array<{ status: string; count: number }>) ?? [];
    const online = Number(data['gatewaysOnline'] ?? 0);
    const offline = Number(byStatus.find((s) => s.status === 'OFFLINE')?.count ?? 0);
    return {
      ...EMPTY_DASHBOARD,
      gatewaysOnline: online,
      gatewaysOffline: offline,
      gatewaysTotal: byStatus.reduce((a, b) => a + Number(b.count), 0),
      gatewaysActive: online,
      txPerMin: Number(data['txPerMin'] ?? 0),
      smsPerMin: Number(data['smsPerMin'] ?? 0),
      alerts24h: Number(data['alerts24h'] ?? 0),
      gatewaysByStatus: byStatus,
    };
  }
}
