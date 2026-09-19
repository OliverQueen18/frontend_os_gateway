import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { Subscription, merge } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { KpiCardComponent } from '../../shared/components/kpi-card';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { MeterBarComponent } from '../../shared/components/meter-bar';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { WebsocketService } from '../../core/services/websocket.service';
import { AlertService } from '../../core/services/alert.service';
import { DashboardStats, Gateway } from '../../core/models/gateway.models';
import { AlertItem } from '../../core/models/user.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ChartModule,
    TableModule,
    PageHeaderComponent,
    KpiCardComponent,
    StatusBadgeComponent,
    MeterBarComponent,
    RelativeTimePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly ws = inject(WebsocketService);
  private readonly alertsApi = inject(AlertService);
  private sub?: Subscription;

  readonly stats = signal<DashboardStats | null>(null);
  readonly gateways = signal<Gateway[]>([]);
  readonly alerts = signal<AlertItem[]>([]);
  chartData: unknown;
  chartOptions: unknown;

  ngOnInit(): void {
    this.ws.connect();
    this.alertsApi.list().subscribe((a) => {
      this.alerts.set(Array.isArray(a) ? a.slice(0, 5) : []);
    });

    this.sub = merge(this.ws.dashboardTicks$, this.ws.gatewayTicks$).subscribe((payload) => {
      if (Array.isArray(payload)) {
        this.gateways.set(payload as Gateway[]);
      } else {
        const s = payload as DashboardStats;
        this.stats.set(s);
        this.updateChart(s);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updateChart(s: DashboardStats): void {
    const series = s.series ?? [];
    this.chartData = {
      labels: series.map((p) => p.t),
      datasets: [
        {
          label: 'TX / 5 min',
          data: series.map((p) => p.tx),
          borderColor: '#0F766E',
          backgroundColor: 'rgba(15, 118, 110, 0.12)',
          fill: true,
          tension: 0.35,
        },
        {
          label: 'SMS / 5 min',
          data: series.map((p) => p.sms),
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
    this.chartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { usePointStyle: true, color: '#475569' } },
      },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.15)' } },
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.15)' } },
      },
    };
  }
}
