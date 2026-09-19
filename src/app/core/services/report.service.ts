import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';

export type ReportExportKind = 'transactions' | 'commissions' | 'commissions-me' | 'sms';

export interface ReportQuery {
  from: string;
  to: string;
  distributorId?: number | null;
  type?: string | null;
  gatewayId?: number | null;
}

export interface ReportPayload {
  from: string;
  to: string;
  rows: Array<Record<string, unknown>>;
  totals?: {
    totalCommission?: number;
    totalAdminCommission?: number;
    totalDistributorCommission?: number;
  };
  export?: { csv?: string; pdf?: string; excel?: string };
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  transactions(query: ReportQuery): Observable<ReportPayload> {
    const params = this.toParams(query);
    return this.http
      .get<ApiResponse<ReportPayload>>(`${environment.apiUrl}/reports/transactions`, { params })
      .pipe(map((res) => res.data));
  }

  commissions(query: ReportQuery, mine = false): Observable<ReportPayload> {
    const params = this.toParams(query, mine);
    const path = mine ? 'commissions/me' : 'commissions';
    return this.http
      .get<ApiResponse<ReportPayload>>(`${environment.apiUrl}/reports/${path}`, { params })
      .pipe(map((res) => res.data));
  }

  sms(from: string, to: string): Observable<ReportPayload> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http
      .get<ApiResponse<ReportPayload>>(`${environment.apiUrl}/reports/sms`, { params })
      .pipe(map((res) => res.data));
  }

  downloadCsv(
    report: ReportExportKind,
    query: ReportQuery,
    fallbackName?: string,
  ): Observable<void> {
    const params = this.toParams(query, report === 'commissions-me');
    return this.http
      .get(`${environment.apiUrl}/reports/export/${report}.csv`, {
        params,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        tap((res) => {
          const filename =
            this.filenameFromDisposition(res.headers.get('Content-Disposition')) ??
            fallbackName ??
            `${report}_${query.from}_${query.to}.csv`;
          this.triggerDownload(res.body ?? new Blob(), filename);
        }),
        map(() => void 0),
      );
  }

  /** @deprecated prefer downloadCsv (authenticated) */
  exportUrl(path: string, from?: string, to?: string): string {
    let url = path.startsWith('http')
      ? path
      : `${environment.apiUrl.replace('/api/v1', '')}${path}`;
    if (from && to) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    return url;
  }

  private toParams(query: ReportQuery, omitDistributor = false): HttpParams {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (!omitDistributor && query.distributorId != null && query.distributorId !== undefined) {
      params = params.set('distributorId', String(query.distributorId));
    }
    if (query.type) params = params.set('type', query.type);
    if (query.gatewayId != null && query.gatewayId !== undefined) {
      params = params.set('gatewayId', String(query.gatewayId));
    }
    return params;
  }

  private filenameFromDisposition(header: string | null): string | null {
    if (!header) return null;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf8?.[1]) {
      try {
        return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''));
      } catch {
        return utf8[1].trim().replace(/^"|"$/g, '');
      }
    }
    const plain = /filename="?([^";]+)"?/i.exec(header);
    return plain?.[1]?.trim() ?? null;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
