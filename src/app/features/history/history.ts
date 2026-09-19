import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { TransactionService } from '../../core/services/transaction.service';
import { Transaction } from '../../core/models/transaction.models';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputTextModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    RelativeTimePipe,
  ],
  templateUrl: './history.html',
})
export class HistoryPage implements OnInit {
  private readonly api = inject(TransactionService);
  readonly rows = signal<Transaction[]>([]);
  search = '';

  filteredRows(): Transaction[] {
    return this.rows().filter((tx) =>
      matchesSearch(this.search, tx.reference, tx.type, tx.operator, tx.status, tx.amount),
    );
  }

  ngOnInit(): void {
    this.api.list({ page: 0, size: 50 }).subscribe((page) => this.rows.set(page.content));
  }
}
