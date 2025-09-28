import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';
import { HistoryLogEntry } from '../../models/data.models';

declare var lucide: any;

@Component({
  selector: 'app-sent-warnings',
  templateUrl: './sent-warnings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SentWarningsComponent {
  dataService = inject(DataService);
  modalService = inject(ModalService);

  sentWarnings = computed(() => {
    return this.dataService.historyLog().filter(entry => entry.type === 'warning');
  });

  constructor() {
    effect(() => {
        this.sentWarnings();
        setTimeout(() => lucide.createIcons(), 0);
    });
  }

  getCustomerName(invoiceId: string): string {
    const invoice = this.dataService.invoices().find(inv => inv.id === invoiceId);
    if (!invoice) return 'N/A';
    const customer = this.dataService.customers().find(c => c.id === invoice.customerId);
    return customer?.name || 'N/A';
  }

  openWarningDetailsModal(warning: HistoryLogEntry) {
    this.modalService.open('warningDetails', warning);
  }
}