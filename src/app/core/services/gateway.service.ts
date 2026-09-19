import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { Gateway, GatewayRegisterRequest, GatewayUpdateRequest } from '../models/gateway.models';

@Injectable({ providedIn: 'root' })
export class GatewayService {
  private readonly http = inject(HttpClient);

  list(operator?: string, status?: string): Observable<Gateway[]> {
    let params = new HttpParams();
    if (operator) params = params.set('operator', operator);
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<Gateway[]>>(`${environment.apiUrl}/gateways`, { params })
      .pipe(map((res) => res?.data ?? []));
  }

  get(id: number): Observable<Gateway | undefined> {
    return this.http
      .get<ApiResponse<Gateway>>(`${environment.apiUrl}/gateways/${id}`)
      .pipe(map((res) => res.data));
  }

  create(request: GatewayRegisterRequest): Observable<Gateway> {
    return this.http
      .post<ApiResponse<Gateway>>(`${environment.apiUrl}/gateways`, request)
      .pipe(map((res) => res.data));
  }

  update(id: number, request: GatewayUpdateRequest): Observable<Gateway> {
    return this.http
      .put<ApiResponse<Gateway>>(`${environment.apiUrl}/gateways/${id}`, request)
      .pipe(map((res) => res.data));
  }

  deactivate(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiUrl}/gateways/${id}/deactivate`, {})
      .pipe(map(() => undefined));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/gateways/${id}`)
      .pipe(map(() => undefined));
  }
}
