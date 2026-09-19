import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { AlertService } from '../../core/services/alert.service';
import { AlertItem } from '../../core/models/user.models';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    PageHeaderComponent,
    RelativeTimePipe,
  ],
  templateUrl: './alerts.html',
})
export class AlertsPage implements OnInit {
  private readonly api = inject(AlertService);
  readonly rows = signal<AlertItem[]>([]);
  search = '';

  filteredRows(): AlertItem[] {
    return this.rows().filter((a) =>
      matchesSearch(this.search, a.severity, a.title, a.message, a.source),
    );
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.list().subscribe((list) => this.rows.set(list));
  }

  ack(alert: AlertItem): void {
    this.api.acknowledge(alert.id).subscribe((updated) => {
      this.rows.update((list) =>
        list.map((a) => (a.id === alert.id ? { ...a, ...updated, acknowledged: true } : a)),
      );
    });
  }
}
