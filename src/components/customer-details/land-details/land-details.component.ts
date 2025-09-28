import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../services/data.service';
import { Customer, Invoice, Land, Payment } from '../../../models/data.models';
import { ModalService } from '../../../services/modal.service';

interface Installment {
  period: string;
  originalAmount: number;
  dueDate: string;
  status: 'مستحق السداد' | 'قادم' | 'مدفوع مقدماً' | 'مدفوع جزئياً مقدماً';
  paidAmount: number;
  remainingAmount: number;
  appliedPayments: { paymentId: string; paymentDate: string; amountApplied: number }[];
}

@Component({
  selector: 'app-land-details',
  imports: [CommonModule],
  templateUrl: './land-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandDetailsComponent {
  dataService = inject(DataService);
  modalService = inject(ModalService);
  land = input.required<Land | null>();
  customer = input.required<Customer>();

  // --- Computed signals for template ---
  landInvoices = computed(() => {
    const currentLand = this.land();
    if (!currentLand) return [];
    return this.dataService.invoices().filter(inv => inv.landId === currentLand.landId);
  });

  landPayments = computed(() => {
    const currentLand = this.land();
    if (!currentLand) return [];
    return this.dataService.payments().filter(p => p.landId === currentLand.landId);
  });

  dueLandInvoices = computed(() => {
    return this.landInvoices().filter(inv => inv.status !== 'paid' && inv.status !== 'reviewed');
  });

  totalDueOnLand = computed(() => {
    // Note: This calculates based on existing invoices, not the future schedule.
    return this.landInvoices().reduce((sum, inv) => sum + inv.originalAmount, 0);
  });

  totalPaidOnLand = computed(() => {
    return this.landPayments().reduce((sum, p) => sum + p.amount, 0);
  });

  totalRemainingOnLand = computed(() => {
      const totalDue = this.landInvoices().reduce((sum, inv) => {
        if (inv.status !== 'paid' && inv.status !== 'reviewed') {
          return sum + (inv.originalAmount - this.dataService.getPaidAmountForInvoice(inv.id));
        }
        return sum;
      }, 0);
      return totalDue;
  });

  futureInstallments = computed<Installment[]>(() => {
    const currentLand = this.land();
    if (!currentLand) return [];

    const rawInstallments: {period: string; amount: number; dueDate: string; status: 'مستحق السداد' | 'قادم'}[] = [];
    const receiveDate = new Date(currentLand.basicInfo.receiveDate);
    const baseAmount = currentLand.baseRent;
    const today = this.dataService.today();

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (currentLand.mechanism === 'مزاد علني') {
        const graceEndDate = new Date(receiveDate);
        graceEndDate.setFullYear(graceEndDate.getFullYear() + 2);
        graceEndDate.setMonth(graceEndDate.getMonth() + 3);

        let annualAmount = baseAmount;
        let lastDueDate = new Date(graceEndDate);

        // Year 1 after grace
        rawInstallments.push({ period: 'السنة الأولى - دفعة 1', amount: annualAmount * 0.20, dueDate: formatDate(lastDueDate), status: lastDueDate < today ? 'مستحق السداد' : 'قادم'});
        lastDueDate.setMonth(lastDueDate.getMonth() + 6);
        rawInstallments.push({ period: 'السنة الأولى - دفعة 2', amount: annualAmount * 0.40, dueDate: formatDate(lastDueDate), status: lastDueDate < today ? 'مستحق السداد' : 'قادم'});
        lastDueDate.setMonth(lastDueDate.getMonth() + 6);
        rawInstallments.push({ period: 'السنة الأولى - دفعة 3', amount: annualAmount * 0.40, dueDate: formatDate(lastDueDate), status: lastDueDate < today ? 'مستحق السداد' : 'قادم'});
        
        // Subsequent 24 years
        for(let i = 2; i <= 25; i++) {
            annualAmount *= 1.02; // 2% increase
            lastDueDate.setMonth(lastDueDate.getMonth() + 6);
            rawInstallments.push({ period: `السنة ${i} - دفعة 1`, amount: annualAmount * 0.50, dueDate: formatDate(lastDueDate), status: lastDueDate < today ? 'مستحق السداد' : 'قادم'});
            lastDueDate.setMonth(lastDueDate.getMonth() + 6);
            rawInstallments.push({ period: `السنة ${i} - دفعة 2`, amount: annualAmount * 0.50, dueDate: formatDate(lastDueDate), status: lastDueDate < today ? 'مستحق السداد' : 'قادم'});
        }

    } else { // 'أمر مباشر' or 'مبادرة'
        const graceEndDate = new Date(receiveDate);
        graceEndDate.setFullYear(graceEndDate.getFullYear() + 2);

        let annualAmount = baseAmount;
        for (let i = 1; i <= 25; i++) {
            if (i > 1) {
                annualAmount *= 1.02; // 2% increase from year 2
            }
            const dueDate = new Date(graceEndDate);
            dueDate.setFullYear(graceEndDate.getFullYear() + i -1);
            rawInstallments.push({
                period: `قسط سنوي - سنة ${i}`,
                amount: annualAmount,
                dueDate: formatDate(dueDate),
                status: dueDate < today ? 'مستحق السداد' : 'قادم'
            });
        }
    }
    
    // Get advance payments and calculate remaining credit for each
    const advancePayments = this.dataService.payments()
        .filter(p => 
            p.customerId === this.customer().id &&
            p.landId === currentLand.landId &&
            p.invoiceId === null &&
            p.status === 'confirmed'
        )
        .map(p => ({ ...p, remainingAmount: p.amount }));

    const processedInstallments: Installment[] = [];

    for (const inst of rawInstallments) {
        let paidAmount = 0;
        let remainingAmount = inst.amount;
        let newStatus: 'مستحق السداد' | 'قادم' | 'مدفوع مقدماً' | 'مدفوع جزئياً مقدماً' = inst.status;
        const appliedPayments: { paymentId: string; paymentDate: string; amountApplied: number }[] = [];

        if (newStatus === 'قادم') {
            for (const payment of advancePayments) {
                if (payment.remainingAmount > 0 && remainingAmount > 0) {
                    const amountToApply = Math.min(payment.remainingAmount, remainingAmount);
                    
                    paidAmount += amountToApply;
                    remainingAmount -= amountToApply;
                    payment.remainingAmount -= amountToApply;

                    appliedPayments.push({
                        paymentId: payment.paymentId,
                        paymentDate: payment.paymentDate,
                        amountApplied: amountToApply
                    });

                    if (remainingAmount <= 0) break; // Installment is fully paid
                }
            }

            if(paidAmount > 0) {
                newStatus = remainingAmount <= 0 ? 'مدفوع مقدماً' : 'مدفوع جزئياً مقدماً';
            }
        }
        
        processedInstallments.push({
            period: inst.period,
            originalAmount: inst.amount,
            dueDate: inst.dueDate,
            status: newStatus,
            paidAmount,
            remainingAmount,
            appliedPayments
        });
    }
    
    return processedInstallments;
  });


  getDelayDaysForInvoice(invoice: Invoice): number {
    return this.dataService.calculateDelayDays(invoice.dueDate, this.dataService.today());
  }

  getRemainingAmountForInvoice(invoice: Invoice): number {
    return invoice.originalAmount - this.dataService.getPaidAmountForInvoice(invoice.id);
  }

  getStatusBadgeClass(status: string): string {
    const styles: { [key: string]: string } = {
        'متأخر': 'bg-red-100 text-red-800', 
        'متأخر (جزئي)': 'bg-orange-100 text-orange-800', 
        'مدفوع': 'bg-green-100 text-green-800', 
        'قادم': 'bg-indigo-100 text-indigo-800', 
        'جزئي': 'bg-purple-100 text-purple-800',
        'فات الميعاد': 'bg-gray-200 text-gray-800',
        'قيد المراجعة': 'bg-blue-100 text-blue-800',
        'مستحق السداد': 'bg-yellow-100 text-yellow-800',
        'مدفوع مقدماً': 'bg-teal-100 text-teal-800',
        'مدفوع جزئياً مقدماً': 'bg-cyan-100 text-cyan-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }

  // --- Modal Triggers ---
  openReminderConfirmModal(invoice: Invoice) {
    this.modalService.open('reminderConfirm', invoice);
  }

  openReminderLogModal(invoice: Invoice) {
    this.modalService.open('reminderLog', invoice);
  }

  openPaymentDetailsModal(payment: Payment) {
    this.modalService.open('paymentDetails', payment);
  }

  openAdvancePaymentModal() {
    const currentLand = this.land();
    if (currentLand) {
        this.modalService.open('advancePayment', { land: currentLand, customer: this.customer() });
    }
  }

  openPaymentModal(invoice: Invoice) {
    this.modalService.open('payment', invoice);
  }

  openInvoiceDetailsModal(invoice: Invoice) {
    this.modalService.open('invoiceDetails', invoice);
  }
}
