import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { OperationType, OperationTypeRequest } from '../models/user.models';

/** Icônes proposées pour les types d’opérations Mobile Money. */
export const OPERATION_ICON_CHOICES: Array<{ label: string; value: string }> = [
  { label: 'Dépôt (↓)', value: 'pi pi-arrow-down' },
  { label: 'Retrait (↑)', value: 'pi pi-arrow-up' },
  { label: 'Transfert', value: 'pi pi-arrows-h' },
  { label: 'Portefeuille', value: 'pi pi-wallet' },
  { label: 'Mobile', value: 'pi pi-mobile' },
  { label: 'Boutique', value: 'pi pi-shop' },
  { label: 'Plus', value: 'pi pi-plus-circle' },
  { label: 'Moins', value: 'pi pi-minus-circle' },
  { label: 'Carte', value: 'pi pi-credit-card' },
  { label: 'Argent', value: 'pi pi-money-bill' },
  { label: 'Échange', value: 'pi pi-sync' },
  { label: 'Envoi', value: 'pi pi-send' },
  { label: 'Réception', value: 'pi pi-inbox' },
  { label: 'QR code', value: 'pi pi-qrcode' },
  { label: 'Utilisateur', value: 'pi pi-user' },
  { label: 'Éclair', value: 'pi pi-bolt' },
  { label: 'Check', value: 'pi pi-check-circle' },
  { label: 'Horloge', value: 'pi pi-clock' },
  { label: 'Banque', value: 'pi pi-building' },
  { label: 'Tag', value: 'pi pi-tag' },
];

@Injectable({ providedIn: 'root' })
export class OperationTypeService {
  private readonly http = inject(HttpClient);

  list(activeOnly = false): Observable<OperationType[]> {
    let params = new HttpParams();
    if (activeOnly) params = params.set('active', 'true');
    return this.http
      .get<ApiResponse<OperationType[]>>(`${environment.apiUrl}/operation-types`, { params })
      .pipe(map((res) => (res.data ?? []).filter((t) => (activeOnly ? t.active : true))));
  }

  create(request: OperationTypeRequest): Observable<OperationType> {
    return this.http
      .post<ApiResponse<OperationType>>(`${environment.apiUrl}/operation-types`, request)
      .pipe(map((res) => res.data));
  }

  update(id: number, request: OperationTypeRequest): Observable<OperationType> {
    return this.http
      .put<ApiResponse<OperationType>>(`${environment.apiUrl}/operation-types/${id}`, request)
      .pipe(map((res) => res.data));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/operation-types/${id}`)
      .pipe(map(() => undefined));
  }
}
