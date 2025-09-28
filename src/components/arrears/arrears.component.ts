import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../models/data.models';
import { ModalService } from '../../services/modal.service';

declare var lucide: any;

@Component({
  selector: 'app-arrears',
  templateUrl: './arrears.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
})
export class ArrearsComponent {
    dataService = inject(DataService);
    modalService = inject(ModalService);

    centers = ['all', 'الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'];
    currencies = { 'all': 'الكل', 'EGP': 'جنيه مصري', 'USD': 'دولار' };

    centerFilter = signal('all');
    currencyFilter = signal('all');
    searchQuery = signal('');

    filteredInvoices = computed(() => {
        const invoices = this.dataService.getOverdueInvoices();
        const customers = this.dataService.customers();
        const center = this.centerFilter();
        const currency = this.currencyFilter();
        const query = this.searchQuery().toLowerCase();
        
        return invoices().filter(inv => {
            const customer = customers.find(c => c.id === inv.customerId);
            if (!customer) return false;

            const centerMatch = center === 'all' || customer.center === center;
            const currencyMatch = currency === 'all' || inv.currency === currency;
            const searchMatch = query === '' || customer.name.toLowerCase().includes(query) || inv.id.toLowerCase().includes(query);
            
            return centerMatch && currencyMatch && searchMatch;
        });
    });

    constructor() {
        effect(() => {
            this.filteredInvoices();
            setTimeout(() => lucide.createIcons(), 0);
        });
    }

    getCustomerName(customerId: number): string {
        return this.dataService.customers().find(c => c.id === customerId)?.name || 'غير معروف';
    }

    getRemainingAmount(invoice: Invoice): number {
        return invoice.originalAmount - this.dataService.getPaidAmountForInvoice(invoice.id);
    }

    getDelayDays(invoice: Invoice): number {
        if (invoice.status === 'paid' || invoice.status === 'reviewed') return 0;
        return this.dataService.calculateDelayDays(invoice.dueDate, new Date());
    }
    
    getStatusBadgeClass(status: string): string {
        const styles: { [key: string]: string } = {
            'متأخر': 'bg-red-100 text-red-700',
            'متأخر (جزئي)': 'bg-orange-100 text-orange-700',
            'جزئي': 'bg-yellow-100 text-yellow-700',
            'مدفوع': 'bg-green-100 text-green-700',
            'قيد المراجعة': 'bg-purple-100 text-purple-700'
        };
        return styles[status] || 'bg-gray-100 text-gray-800';
    }

    openReminderConfirmModal(invoice: Invoice) {
      this.modalService.open('reminderConfirm', invoice);
    }
  
    openReminderLogModal(invoice: Invoice) {
      this.modalService.open('reminderLog', invoice);
    }

    openPaymentModal(invoice: Invoice) {
        this.modalService.open('payment', invoice);
    }

    openWarningModal(invoice: Invoice) {
        this.modalService.open('warning', invoice);
    }

    openInvoiceDetailsModal(invoice: Invoice) {
      this.modalService.open('invoiceDetails', invoice);
    }
}
