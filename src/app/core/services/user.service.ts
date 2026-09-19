import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import {
  Permission,
  PermissionRequest,
  Role,
  RoleRequest,
  SettingItem,
  User,
  UserRequest,
} from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  list(q?: string, page = 0, size = 20): Observable<PageResponse<User>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (q) params = params.set('q', q);
    return this.http
      .get<ApiResponse<PageResponse<User>>>(`${environment.apiUrl}/users`, { params })
      .pipe(map((res) => res.data));
  }

  create(request: UserRequest): Observable<User> {
    return this.http
      .post<ApiResponse<User>>(`${environment.apiUrl}/users`, request)
      .pipe(map((res) => res.data));
  }

  update(id: number, request: UserRequest): Observable<User> {
    return this.http
      .put<ApiResponse<User>>(`${environment.apiUrl}/users/${id}`, request)
      .pipe(map((res) => res.data));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/users/${id}`)
      .pipe(map(() => undefined));
  }

  roles(): Observable<Role[]> {
    return this.http
      .get<ApiResponse<Role[]>>(`${environment.apiUrl}/roles`)
      .pipe(map((res) => res.data ?? []));
  }

  createRole(request: RoleRequest): Observable<Role> {
    return this.http
      .post<ApiResponse<Role>>(`${environment.apiUrl}/roles`, request)
      .pipe(map((res) => res.data));
  }

  updateRole(id: number, request: RoleRequest): Observable<Role> {
    return this.http
      .put<ApiResponse<Role>>(`${environment.apiUrl}/roles/${id}`, request)
      .pipe(map((res) => res.data));
  }

  deleteRole(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/roles/${id}`)
      .pipe(map(() => undefined));
  }

  permissions(): Observable<Permission[]> {
    return this.http
      .get<ApiResponse<Permission[]>>(`${environment.apiUrl}/permissions`)
      .pipe(map((res) => res.data ?? []));
  }

  createPermission(request: PermissionRequest): Observable<Permission> {
    return this.http
      .post<ApiResponse<Permission>>(`${environment.apiUrl}/permissions`, request)
      .pipe(map((res) => res.data));
  }

  updatePermission(id: number, request: PermissionRequest): Observable<Permission> {
    return this.http
      .put<ApiResponse<Permission>>(`${environment.apiUrl}/permissions/${id}`, request)
      .pipe(map((res) => res.data));
  }

  deletePermission(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.apiUrl}/permissions/${id}`)
      .pipe(map(() => undefined));
  }

  listSettings(): Observable<SettingItem[]> {
    return this.http
      .get<ApiResponse<SettingItem[]>>(`${environment.apiUrl}/settings`)
      .pipe(map((res) => res.data ?? []));
  }

  saveSettings(settings: SettingItem[]): Observable<SettingItem[]> {
    return this.http
      .put<ApiResponse<SettingItem[]>>(`${environment.apiUrl}/settings`, { settings })
      .pipe(map((res) => res.data));
  }
}
