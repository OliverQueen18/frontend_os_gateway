import { Injectable, OnDestroy, inject } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  filter,
  interval,
  map,
  of,
  shareReplay,
  switchMap,
  takeUntil,
  startWith,
} from 'rxjs';
import { MonitoringService } from './monitoring.service';
import { GatewayService } from './gateway.service';
import { AuthService } from './auth.service';
import { DashboardStats, Gateway } from '../models/gateway.models';

/**
 * Realtime feed via light HTTP polling.
 * Native WS to /ws is not used: backend exposes STOMP endpoints (/ws/gateways, /ws/notifications).
 */
@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly monitoring = inject(MonitoringService);
  private readonly gateways = inject(GatewayService);
  private readonly auth = inject(AuthService);

  /** Skip polling with mock/missing tokens to avoid 401 console spam. */
  private canPoll(): boolean {
    const token = this.auth.getToken();
    return !!token && !token.startsWith('mock-');
  }

  readonly dashboardTicks$: Observable<DashboardStats> = interval(60000).pipe(
    startWith(0),
    filter(() => this.canPoll()),
    switchMap(() => this.monitoring.getDashboard().pipe(catchError(() => of({} as DashboardStats)))),
    takeUntil(this.destroy$),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly gatewayTicks$: Observable<Gateway[]> = interval(60000).pipe(
    startWith(0),
    filter(() => this.canPoll()),
    switchMap(() =>
      this.gateways.list().pipe(
        map((list) => (Array.isArray(list) ? list : [])),
        catchError(() => of([] as Gateway[])),
      ),
    ),
    takeUntil(this.destroy$),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Reserved for future STOMP client; no-op to avoid console WS errors. */
  connect(): void {
    /* intentionally empty */
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
