import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';

export interface CancellationReason {
  id: number;
  code: string;
  label: string;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CancellationReasonRequest {
  code: string;
  label: string;
  description?: string | null;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CancellationReasonService {
  private readonly http = inject(HttpClient);

  list(activeOnly = false): Observable<CancellationReason[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http
      .get<ApiResponse<CancellationReason[]>>(
        `${environment.apiUrl}/transactions/cancellation-reasons`,
        { params },
      )
      .pipe(map((res) => res?.data ?? []));
  }

  create(request: CancellationReasonRequest): Observable<CancellationReason> {
    return this.http
      .post<ApiResponse<CancellationReason>>(
        `${environment.apiUrl}/transactions/cancellation-reasons`,
        request,
      )
      .pipe(map((res) => res.data));
  }

  update(id: number, request: CancellationReasonRequest): Observable<CancellationReason> {
    return this.http
      .put<ApiResponse<CancellationReason>>(
        `${environment.apiUrl}/transactions/cancellation-reasons/${id}`,
        request,
      )
      .pipe(map((res) => res.data));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/transactions/cancellation-reasons/${id}`)
      .pipe(map(() => undefined));
  }
}
