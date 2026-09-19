import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { AuthResponse, AuthUser, LoginRequest } from '../models/auth.models';

const TOKEN_KEY = 'osg_access_token';
const REFRESH_KEY = 'osg_refresh_token';
const USER_KEY = 'osg_user';

const ALL_PERMISSIONS = [
  'USERS_READ',
  'USERS_WRITE',
  'ROLES_WRITE',
  'GATEWAYS_READ',
  'GATEWAYS_WRITE',
  'TX_READ',
  'TX_WRITE',
  'SMS_SEND',
  'REPORTS_READ',
  'AUDIT_READ',
  'USSD_WRITE',
  'DISTRIBUTORS_READ',
  'DISTRIBUTORS_WRITE',
  'SETTINGS_WRITE',
  'ALERTS_WRITE',
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  readonly user = this.userSignal.asReadonly();
  /** Both signals must be read (no short-circuit) so the computed invalidates after login. */
  readonly isAuthenticated = computed(() => {
    const token = this.tokenSignal();
    const user = this.userSignal();
    return !!token && !!user;
  });

  constructor() {
    // Ancienne session démo : le gateway rejette mock-jwt → les créations échouaient en silence.
    if (this.tokenSignal()?.startsWith('mock-')) {
      this.clearLocalSession();
    }
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        map((res) => {
          if (!res?.success || !res.data?.accessToken) {
            throw new Error(res?.message || 'Réponse de connexion invalide');
          }
          return res.data;
        }),
        tap((auth) => this.persist(auth)),
        catchError((err) => {
          const status = err?.status as number | undefined;
          const message =
            status === 429
              ? 'Trop de requêtes — réessayez dans une minute'
              : status === 0
                ? 'API injoignable — démarrez le backend puis reconnectez-vous'
                : err?.error?.message || err?.message || 'Identifiants invalides';
          return throwError(() => ({ error: { message }, status }));
        }),
      );
  }

  logout(): void {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (refresh && !refresh.startsWith('mock-')) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken: refresh }).subscribe({
        error: () => undefined,
      });
    }
    this.clearLocalSession();
    void this.router.navigate(['/login']);
  }

  private clearLocalSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  getToken(): string | null {
    return this.tokenSignal() ?? localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: string[]): boolean {
    const user = this.userSignal();
    if (!user?.roles?.length) return false;
    if (user.roles.includes('ADMIN')) return true;
    return roles.some((r) => user.roles.includes(r));
  }

  hasPermission(...codes: string[]): boolean {
    const user = this.userSignal();
    if (!user) return false;
    if (user.roles?.includes('ADMIN')) return true;
    const perms = user.permissions ?? [];
    if (perms.includes('*')) return true;
    return codes.some((c) => perms.includes(c));
  }

  private persist(auth: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    const user: AuthUser = {
      userId: auth.userId,
      username: auth.username,
      roles: auth.roles ?? [],
      permissions: auth.permissions ?? (auth.roles?.includes('ADMIN') ? [...ALL_PERMISSIONS] : []),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.tokenSignal.set(auth.accessToken);
    this.userSignal.set(user);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      return {
        ...parsed,
        permissions: parsed.permissions ?? [],
        roles: parsed.roles ?? [],
      };
    } catch {
      return null;
    }
  }
}
