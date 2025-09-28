import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';
import { Invoice, Payment } from '../../models/data.models';

declare var lucide: any;

type StatusInfo = { text: string; textClass: string; dotClass: string; };

@Component({
  selector: 'app-financial-dues',
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-dues.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialDuesComponent {
  dataService = inject(DataService);
  modalService = inject(ModalService);

  // Filters
  centerFilter = signal('الكل');
  currencyFilter = signal('all');
  searchQuery = signal('');

  // Static data for filters
  centers = ['الكل', 'الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'];
  currencies = { 'all': 'الكل', 'EGP': 'جنيه مصري', 'USD': 'دولار أمريكي' };

  filteredInvoices = computed(() => {
    const allInvoices = this.dataService.invoices();
    const customers = this.dataService.customers();
    const today = new Date(this.dataService.today());
    today.setHours(0, 0, 0, 0); // Normalize today's date to the start of the day

    const query = this.searchQuery().toLowerCase();
    
    return allInvoices.filter(invoice => {
      // Exclude paid, reviewed, or archived invoices
      if (invoice.status === 'paid' || invoice.status === 'reviewed') {
          return false;
      }
      
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0); // Normalize due date

      // Date Filter: Excludes overdue invoices. Shows everything from today onwards.
      if (dueDate < today) {
        return false;
      }

      // Customer-based filters
      const customer = customers.find(c => c.id === invoice.customerId);
      if (!customer) return false;
      const centerMatch = this.centerFilter() === 'الكل' || customer.center === this.centerFilter();
      const currencyMatch = this.currencyFilter() === 'all' || invoice.currency === this.currencyFilter();

      // Search filter
      const searchMatch = query === '' || 
                          customer.name.toLowerCase().includes(query) || 
                          invoice.id.toLowerCase().includes(query) ||
                          invoice.description.toLowerCase().includes(query);

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

  getInvoiceStatus(invoice: Invoice): 'متأخر' | 'مستحق' | 'مدفوع جزئيًا' | 'مدفوع' | 'قيد المراجعة' {
    if (invoice.status === 'paid') return 'مدفوع';
    if (invoice.status === 'awaiting_confirmation') return 'قيد المراجعة';

    const paidAmount = this.dataService.getPaidAmountForInvoice(invoice.id);
    if (paidAmount >= invoice.originalAmount) return 'مدفوع';

    if (new Date(invoice.dueDate) < this.dataService.today()) {
      return 'متأخر';
    }
    
    if (paidAmount > 0) return 'مدفوع جزئيًا';

    return 'مستحق';
  }

  getStatusInfo(invoice: Invoice): StatusInfo {
    const status = this.getInvoiceStatus(invoice);
    switch (status) {
      case 'متأخر': return { text: 'متأخر', textClass: 'text-red-600', dotClass: 'bg-red-500' };
      case 'مستحق': return { text: 'مستحق', textClass: 'text-green-600', dotClass: 'bg-green-500' };
      case 'مدفوع جزئيًا': return { text: 'مدفوع جزئيًا', textClass: 'text-yellow-600', dotClass: 'bg-yellow-500' };
      case 'مدفوع': return { text: 'مدفوع', textClass: 'text-gray-600', dotClass: 'bg-gray-500' };
      case 'قيد المراجعة': return { text: 'قيد المراجعة', textClass: 'text-purple-600', dotClass: 'bg-purple-500' };
      default: return { text: 'غير معروف', textClass: 'text-gray-600', dotClass: 'bg-gray-500' };
    }
  }

  getLatestPaymentForInvoice(invoiceId: string): Payment | undefined {
    return this.dataService.payments()
      .filter(p => p.invoiceId === invoiceId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];
  }

  // --- Modal Triggers ---
  openPaymentModal(invoice: Invoice) {
    this.modalService.open('financialPayment', invoice);
  }

  openInvestorDetailsModal(invoice: Invoice) {
    this.modalService.open('investorDetails', invoice);
  }
  
  openReceiptModal(payment: Payment) {
    this.modalService.open('paymentReceipt', payment);
  }
}
