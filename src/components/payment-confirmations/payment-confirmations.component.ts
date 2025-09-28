import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';
import { Payment } from '../../models/data.models';

declare var lucide: any;

@Component({
  selector: 'app-payment-confirmations',
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-confirmations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentConfirmationsComponent {
  dataService = inject(DataService);
  modalService = inject(ModalService);

  statusFilter = signal<'pending_review' | 'confirmed' | 'rejected' | 'all'>('pending_review');

  statusOptions = [
    { key: 'pending_review', value: 'قيد المراجعة' },
    { key: 'confirmed', value: 'مؤكد' },
    { key: 'rejected', value: 'مرفوض' },
    { key: 'all', value: 'الكل' },
  ];

  statusMap: { [key: string]: string } = {
    'pending_review': 'قيد المراجعة',
    'confirmed': 'مؤكد',
    'rejected': 'مرفوض',
  };

  filteredPayments = computed(() => {
    const allPayments = this.dataService.payments();
    const filter = this.statusFilter();

    if (filter === 'all') {
      return allPayments;
    }
    return allPayments.filter(p => p.status === filter);
  });

  constructor() {
    effect(() => {
        this.filteredPayments();
        setTimeout(() => lucide.createIcons(), 0);
    });
  }

  getCustomerName(customerId: number): string {
    return this.dataService.customers().find(c => c.id === customerId)?.name || 'غير معروف';
  }
  
  getStatusBadgeClass(status: string): string {
    const styles: {[key: string]: string} = {
      'pending_review': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }

  openConfirmModal(payment: Payment) {
    this.modalService.open('paymentConfirmation', payment);
  }

  openRejectModal(payment: Payment) {
    this.modalService.open('paymentRejection', payment);
  }

  openEditModal(payment: Payment) {
    this.modalService.open('paymentEdit', payment);
  }

  openInvoiceDetailsModal(invoiceId: string | null) {
    if (!invoiceId) return;
    const invoice = this.dataService.invoices().find(inv => inv.id === invoiceId);
    if (invoice) {
        this.modalService.open('invoiceDetails', invoice);
    }
  }
}
