import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

import { ApiResponse, PageResponse } from '../models/api.models';

import {

  Transaction,

  TransactionCreateRequest,

  TransactionFilters,

  TransactionHistoryEvent,

} from '../models/transaction.models';



@Injectable({ providedIn: 'root' })

export class TransactionService {

  private readonly http = inject(HttpClient);



  list(filters: TransactionFilters = {}): Observable<PageResponse<Transaction>> {

    let params = new HttpParams()

      .set('page', String(filters.page ?? 0))

      .set('size', String(filters.size ?? 20));

    if (filters.status) params = params.set('status', filters.status);

    if (filters.operator) params = params.set('operator', filters.operator);

    if (filters.type) params = params.set('type', filters.type);

    if (filters.distributorId != null) {
      params = params.set('distributorId', String(filters.distributorId));
    }

    if (filters.from) params = params.set('from', filters.from);

    if (filters.to) params = params.set('to', filters.to);



    return this.http

      .get<ApiResponse<PageResponse<Transaction>>>(`${environment.apiUrl}/transactions`, { params })

      .pipe(

        map((res) => {

          const page = res?.data;

          const content = Array.isArray(page)

            ? page

            : ((page as PageResponse<Transaction> | undefined)?.content ?? []);

          const totalElements = Array.isArray(page)

            ? page.length

            : ((page as PageResponse<Transaction> | undefined)?.totalElements ?? content.length);

          return {

            content: content.map((t) => this.normalize(t)),

            page: (page as PageResponse<Transaction> | undefined)?.page ?? filters.page ?? 0,

            size: (page as PageResponse<Transaction> | undefined)?.size ?? filters.size ?? 20,

            totalElements,

            totalPages:

              (page as PageResponse<Transaction> | undefined)?.totalPages ??

              Math.max(1, Math.ceil(totalElements / (filters.size ?? 20))),

            first: (page as PageResponse<Transaction> | undefined)?.first ?? (filters.page ?? 0) === 0,

            last: (page as PageResponse<Transaction> | undefined)?.last ?? true,

          } as PageResponse<Transaction>;

        }),

      );

  }



  create(request: TransactionCreateRequest): Observable<Transaction> {

    return this.http

      .post<ApiResponse<Transaction>>(`${environment.apiUrl}/transactions`, request)

      .pipe(map((res) => this.normalize(res.data)));

  }



  updateStatus(id: number, status: string, note?: string): Observable<Transaction> {

    return this.http

      .patch<ApiResponse<Transaction>>(`${environment.apiUrl}/transactions/${id}/status`, {

        status,

        note,

      })

      .pipe(map((res) => this.normalize(res.data)));

  }

  cancel(
    id: number,
    cancellationReasonId: number,
    note?: string | null,
  ): Observable<Transaction> {
    return this.http
      .post<ApiResponse<Transaction>>(`${environment.apiUrl}/transactions/${id}/cancel`, {
        cancellationReasonId,
        note: note ?? null,
      })
      .pipe(map((res) => this.normalize(res.data)));
  }



  private normalize(t: Transaction): Transaction {

    return {

      ...t,

      phoneNumber: t.phoneNumber ?? t.beneficiaryPhone ?? '',

      currency: t.currency ?? 'XOF',

    };

  }



  get(id: number): Observable<Transaction | undefined> {

    return this.http

      .get<ApiResponse<Transaction>>(`${environment.apiUrl}/transactions/${id}`)

      .pipe(map((res) => res.data));

  }



  timeline(id: number): Observable<TransactionHistoryEvent[]> {

    return this.http

      .get<ApiResponse<TransactionHistoryEvent[]>>(`${environment.apiUrl}/transactions/${id}/timeline`)

      .pipe(
        map((res) =>
          (res.data ?? []).map((e) => ({
            ...e,
            status: (e.status ?? e.toStatus ?? e.fromStatus ?? 'PENDING') as TransactionHistoryEvent['status'],
          })),
        ),
      );

  }

}

