import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { MonitoringService } from '../../core/services/monitoring.service';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, ChartModule, PageHeaderComponent],
  templateUrl: './statistics.html',
})
export class StatisticsPage implements OnInit {
  private readonly monitoring = inject(MonitoringService);

  volumeData: unknown;
  statusData: unknown;
  options = {
    maintainAspectRatio: false,
    plugins: { legend: { labels: { usePointStyle: true, color: '#475569' } } },
  };

  ngOnInit(): void {
    this.monitoring.getDashboard().subscribe((s) => {
      this.volumeData = {
        labels: (s.series ?? []).map((p) => p.t),
        datasets: [
          {
            type: 'bar',
            label: 'Transactions',
            backgroundColor: '#0F766E',
            data: (s.series ?? []).map((p) => p.tx),
            borderRadius: 6,
          },
          {
            type: 'bar',
            label: 'SMS',
            backgroundColor: '#0284c7',
            data: (s.series ?? []).map((p) => p.sms),
            borderRadius: 6,
          },
        ],
      };
      this.statusData = {
        labels: ['Online', 'Offline', 'Low battery', 'Poor network'],
        datasets: [
          {
            data: [s.gatewaysOnline, s.gatewaysOffline, s.lowBattery, s.poorNetwork],
            backgroundColor: ['#0F766E', '#e11d48', '#f59e0b', '#0284c7'],
          },
        ],
      };
    });
  }
}
