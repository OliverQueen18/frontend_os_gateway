import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import {
  Attachment,
  CommissionBalance,
  CommissionPayout,
  CommissionPayoutRequest,
  Distributor,
  DistributorRequest,
  RejectRequest,
  UvPurchase,
  UvPurchaseRequest,
} from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class DistributorService {
  private readonly http = inject(HttpClient);

  list(
    active?: boolean,
    page = 0,
    size = 20,
    registrationStatus?: string,
  ): Observable<PageResponse<Distributor>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (active !== undefined) params = params.set('active', String(active));
    if (registrationStatus) params = params.set('registrationStatus', registrationStatus);
    return this.http
      .get<ApiResponse<PageResponse<Distributor>>>(`${environment.apiUrl}/distributors`, { params })
      .pipe(
        map((res) => {
          if (!res?.data) {
            throw new Error('Réponse distributeurs invalide');
          }
          return res.data;
        }),
      );
  }

  approve(id: number): Observable<Distributor> {
    return this.http
      .post<ApiResponse<Distributor>>(`${environment.apiUrl}/distributors/${id}/approve`, {})
      .pipe(map((res) => this.requireData(res, 'Approbation impossible')));
  }

  reject(id: number, request: RejectRequest): Observable<Distributor> {
    return this.http
      .post<ApiResponse<Distributor>>(`${environment.apiUrl}/distributors/${id}/reject`, request)
      .pipe(map((res) => this.requireData(res, 'Rejet impossible')));
  }

  listAttachments(id: number): Observable<Attachment[]> {
    return this.http
      .get<ApiResponse<Attachment[]>>(`${environment.apiUrl}/distributors/${id}/attachments`)
      .pipe(
        map((res) => res.data ?? []),
      );
  }

  uploadAttachment(id: number, docType: string, file: File): Observable<Attachment> {
    const form = new FormData();
    form.append('file', file, file.name);
    const params = new HttpParams().set('docType', docType);
    return this.http
      .post<ApiResponse<Attachment>>(`${environment.apiUrl}/distributors/${id}/attachments`, form, {
        params,
      })
      .pipe(map((res) => this.requireData(res, 'Upload impossible')));
  }

  downloadAttachmentUrl(id: number, attachmentId: number): string {
    return `${environment.apiUrl}/distributors/${id}/attachments/${attachmentId}/download`;
  }

  /** Téléchargement authentifié (Bearer via interceptor). */
  downloadAttachment(id: number, attachmentId: number, fileName?: string): Observable<void> {
    return this.http
      .get(this.downloadAttachmentUrl(id, attachmentId), {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        tap((res) => {
          const blob = res.body ?? new Blob();
          const name =
            fileName ||
            this.filenameFromDisposition(res.headers.get('Content-Disposition')) ||
            `attachment-${attachmentId}`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }),
        map(() => undefined),
      );
  }

  registrationFee(): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(`${environment.apiUrl}/distributors/registration-fee`)
      .pipe(map((res) => Number(res.data ?? 0)));
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

  create(request: DistributorRequest): Observable<Distributor> {
    return this.http
      .post<ApiResponse<Distributor>>(`${environment.apiUrl}/distributors`, request)
      .pipe(map((res) => this.requireData(res, 'Création impossible')));
  }

  update(id: number, request: DistributorRequest): Observable<Distributor> {
    return this.http
      .put<ApiResponse<Distributor>>(`${environment.apiUrl}/distributors/${id}`, request)
      .pipe(map((res) => this.requireData(res, 'Mise à jour impossible')));
  }

  purchaseUv(id: number, request: UvPurchaseRequest): Observable<UvPurchase> {
    return this.http
      .post<ApiResponse<UvPurchase>>(`${environment.apiUrl}/distributors/${id}/uv-purchases`, request)
      .pipe(map((res) => this.requireData(res, 'Recharge UV impossible')));
  }

  listUvPurchases(id: number): Observable<UvPurchase[]> {
    return this.http
      .get<ApiResponse<UvPurchase[]>>(`${environment.apiUrl}/distributors/${id}/uv-purchases`)
      .pipe(
        map((res) => res?.data ?? []),
      );
  }

  commissionBalances(): Observable<CommissionBalance[]> {
    return this.http
      .get<ApiResponse<CommissionBalance[]>>(`${environment.apiUrl}/distributors/commission-balances`)
      .pipe(
        map((res) => res?.data ?? []),
      );
  }

  commissionBalance(id: number): Observable<CommissionBalance> {
    return this.http
      .get<ApiResponse<CommissionBalance>>(`${environment.apiUrl}/distributors/${id}/commission-balance`)
      .pipe(map((res) => this.requireData(res, 'Solde commission indisponible')));
  }

  payCommission(id: number, request: CommissionPayoutRequest): Observable<CommissionPayout> {
    return this.http
      .post<ApiResponse<CommissionPayout>>(
        `${environment.apiUrl}/distributors/${id}/commission-payouts`,
        request,
      )
      .pipe(map((res) => this.requireData(res, 'Paiement commission impossible')));
  }

  listCommissionPayouts(id: number): Observable<CommissionPayout[]> {
    return this.http
      .get<ApiResponse<CommissionPayout[]>>(
        `${environment.apiUrl}/distributors/${id}/commission-payouts`,
      )
      .pipe(
        map((res) => res?.data ?? []),
      );
  }

  deactivate(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiUrl}/distributors/${id}/deactivate`, {})
      .pipe(map(() => undefined));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/distributors/${id}`)
      .pipe(map(() => undefined));
  }

  private requireData<T>(res: ApiResponse<T> | null | undefined, fallback: string): T {
    if (res == null) {
      throw { status: 500, message: fallback, error: { message: fallback } };
    }
    if (res.success === false) {
      throw {
        status: 400,
        message: res.message || fallback,
        error: { message: res.message || fallback },
      };
    }
    if (res.data == null) {
      throw { status: 500, message: fallback, error: { message: fallback } };
    }
    return res.data;
  }
}
