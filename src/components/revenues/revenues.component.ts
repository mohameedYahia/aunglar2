import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { Payment } from '../../models/data.models';

declare var lucide: any;

@Component({
  selector: 'app-revenues',
  templateUrl: './revenues.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class RevenuesComponent {
  dataService = inject(DataService);
  modalService = inject(ModalService);

  // --- Filters ---
  monthFilter = signal('all');
  currencyFilter = signal('all');
  centerFilter = signal('all');
  mechanismFilter = signal('all');
  paymentMethodFilter = signal('all');

  // --- Filter Options ---
  currencies = { 'all': 'الكل', 'EGP': 'جنيه مصري', 'USD': 'دولار' };
  centers = ['all', 'الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'];
  mechanisms = ['all', 'مزاد علني', 'أمر مباشر', 'مبادرة'];
  paymentMethods = { 'all': 'الكل', 'تحويل بنكي': 'تحويل بنكي', 'شيك': 'شيك', 'نقدي': 'نقدي' };
  
  // --- State for Top Center Calculation ---
  topCenterResult = signal<{ center: string; amount: number; currency: string; } | string | null>(null);

  availableMonths = computed(() => {
    const payments = this.dataService.getConfirmedPayments();
    const monthSet = new Set<string>();
    payments().forEach(p => {
      monthSet.add(p.paymentDate.substring(0, 7)); // YYYY-MM
    });
    return Array.from(monthSet).sort().reverse().map(month => {
        const [year, m] = month.split('-');
        const date = new Date(Number(year), Number(m) - 1);
        const label = date.toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
        return { value: month, label };
    });
  });

  filteredPayments = computed(() => {
    const payments = this.dataService.getConfirmedPayments();
    const customers = this.dataService.customers();

    const month = this.monthFilter();
    const currency = this.currencyFilter();
    const center = this.centerFilter();
    const mechanism = this.mechanismFilter();
    const method = this.paymentMethodFilter();

    return payments().map(p => {
        const customer = customers.find(c => c.id === p.customerId);
        return { ...p, customer };
      }).filter(p => {
        if (!p.customer) return false;
        const monthMatch = month === 'all' || p.paymentDate.startsWith(month);
        const currencyMatch = currency === 'all' || p.currency === currency;
        const centerMatch = center === 'all' || p.customer.center === center;
        const mechanismMatch = mechanism === 'all' || p.customer.mechanism === mechanism;
        const methodMatch = method === 'all' || p.method === method;
        return monthMatch && currencyMatch && centerMatch && mechanismMatch && methodMatch;
      });
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

  getPaymentMethodBadgeClass(method: string): string {
    const styles: { [key: string]: string } = {
        'تحويل بنكي': 'bg-green-100 text-green-700',
        'شيك': 'bg-blue-100 text-blue-700',
        'نقدي': 'bg-yellow-100 text-yellow-700'
    };
    return styles[method] || 'bg-gray-100 text-gray-800';
  }
  
  calculateTopCenter() {
      const month = this.monthFilter();
      if (month === 'all') {
          this.topCenterResult.set('الرجاء تحديد شهر أولاً');
          return;
      }

      const paymentsInMonth = this.dataService.getConfirmedPayments()().filter(p => p.paymentDate.startsWith(month));
      if (paymentsInMonth.length === 0) {
          this.topCenterResult.set('لا توجد بيانات لهذا الشهر');
          return;
      }
      
      const revenueByCenter: { [center: string]: { egp: number, usd: number } } = {};

      paymentsInMonth.forEach(p => {
          const customer = this.dataService.customers().find(c => c.id === p.customerId);
          if (customer) {
              if (!revenueByCenter[customer.center]) {
                  revenueByCenter[customer.center] = { egp: 0, usd: 0 };
              }
              if (p.currency === 'EGP') {
                  revenueByCenter[customer.center].egp += p.amount;
              } else {
                  revenueByCenter[customer.center].usd += p.amount;
              }
          }
      });

      let topEGP = { center: '', amount: 0 };
      let topUSD = { center: '', amount: 0 };

      for (const center in revenueByCenter) {
          if (revenueByCenter[center].egp > topEGP.amount) {
              topEGP = { center, amount: revenueByCenter[center].egp };
          }
           if (revenueByCenter[center].usd > topUSD.amount) {
              topUSD = { center, amount: revenueByCenter[center].usd };
          }
      }
      
      // For simplicity, we'll just show the top in EGP if available, otherwise USD. A more complex UI could show both.
      if (topEGP.amount > 0) {
        this.topCenterResult.set({ center: topEGP.center, amount: topEGP.amount, currency: 'EGP'});
      } else if (topUSD.amount > 0) {
        this.topCenterResult.set({ center: topUSD.center, amount: topUSD.amount, currency: 'USD'});
      } else {
        this.topCenterResult.set('لا توجد بيانات لهذا الشهر');
      }
  }

  // --- Modal Triggers ---
  openPaymentDetailsModal(payment: Payment) {
    this.modalService.open('paymentRevenueDetails', payment);
  }

  openInvestorDetailsModal(payment: Payment) {
    this.modalService.open('investorFinancialSummary', payment);
  }
}
