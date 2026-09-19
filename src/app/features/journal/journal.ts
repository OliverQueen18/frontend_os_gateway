import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { PageHeaderComponent } from '../../shared/components/page-header';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { AuditService } from '../../core/services/audit.service';
import { AuditEntry } from '../../core/models/user.models';
import { matchesSearch } from '../../core/utils/text-search';

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, PageHeaderComponent, RelativeTimePipe],
  templateUrl: './journal.html',
})
export class JournalPage implements OnInit {
  private readonly api = inject(AuditService);
  readonly rows = signal<AuditEntry[]>([]);
  search = '';

  filteredRows(): AuditEntry[] {
    return this.rows().filter((e) =>
      matchesSearch(this.search, e.actor, e.action, e.resource, e.details, e.ip),
    );
  }

  ngOnInit(): void {
    this.api.list().subscribe((list) => this.rows.set(list));
  }
}
