import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { AuditEntry } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  list(page = 0, size = 50): Observable<AuditEntry[]> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http
      .get<ApiResponse<AuditEntry[]>>(`${environment.apiUrl}/audit`, { params })
      .pipe(map((res) => res.data ?? []));
  }
}
