import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../services/data.service';
import { Customer, Invoice, Land, Payment } from '../../../models/data.models';
import { ModalService } from '../../../services/modal.service';

interface Installment {
  period: string;
  originalAmount: number;
  dueDate: string;
  status: 'قادم' | 'مدفوع مقدماً' | 'مدفوع جزئياً مقدماً' | 'متأخر' | 'متأخر (جزئي)';
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

  invoiceAndAdvancePayments = computed(() => {
    const currentLand = this.land();
    if (!currentLand) return [];
    return this.dataService.payments().filter(p => 
        p.landId === currentLand.landId && 
        !p.tempInsuranceStatus
    );
  });

  tempInsurancePayments = computed(() => {
    const currentLand = this.land();
    if (!currentLand) return [];
    return this.dataService.payments().filter(p => 
        p.landId === currentLand.landId && 
        !!p.tempInsuranceStatus
    );
  });
  
  dueLandInvoices = computed(() => {
    const currentYear = this.dataService.today().getFullYear();
    const allInvoicesForLand = this.landInvoices();

    return allInvoicesForLand.filter(inv => {
        const effectiveStatus = this.getEffectiveStatus(inv);
        if (effectiveStatus === 'مدفوع' || effectiveStatus === 'مدفوع مقدماً' || effectiveStatus === 'مؤرشف') {
            return false;
        }

        const invoiceYear = new Date(inv.dueDate).getFullYear();
        return invoiceYear <= currentYear;
    });
  });

  totalDueOnLand = computed(() => {
    return this.landInvoices().reduce((sum, inv) => sum + inv.originalAmount, 0);
  });

  totalPaidOnLand = computed(() => {
    const currentLand = this.land();
    if (!currentLand) return 0;
    return this.dataService.payments()
        .filter(p => 
            p.landId === currentLand.landId && 
            p.status === 'confirmed' && 
            p.tempInsuranceStatus !== 'returned'
        )
        .reduce((sum, p) => sum + p.amount, 0);
  });

  totalRemainingOnLand = computed(() => {
      const totalDue = this.landInvoices().reduce((sum, inv) => {
        const status = this.getEffectiveStatus(inv);
        if (status !== 'مدفوع' && status !== 'مدفوع مقدماً' && status !== 'مؤرشف') {
          return sum + this.getEffectiveRemainingAmount(inv);
        }
        return sum;
      }, 0);
      return totalDue;
  });

  customerHasOverdueInvoices = computed(() => {
    return this.dataService.getOverdueInvoices()().some(inv => inv.customerId === this.customer().id);
  });

  futureInstallments = computed<Installment[]>(() => {
    const currentLand = this.land();
    if (!currentLand) return [];

    const rawInstallments: {period: string; amount: number; dueDate: string;}[] = [];
    const receiveDate = new Date(currentLand.basicInfo.receiveDate);
    const baseAmount = currentLand.baseRent;
    const today = this.dataService.today();

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // --- Generate Raw Installment Schedule ---
    if (currentLand.mechanism === 'مزاد علني') {
        const graceEndDate = new Date(receiveDate);
        graceEndDate.setFullYear(graceEndDate.getFullYear() + 2);
        graceEndDate.setMonth(graceEndDate.getMonth() + 3);

        let annualAmount = baseAmount;
        let lastDueDate = new Date(graceEndDate);

        rawInstallments.push({ period: 'السنة الأولى - دفعة 1', amount: annualAmount * 0.20, dueDate: formatDate(lastDueDate)});
        lastDueDate.setMonth(lastDueDate.getMonth() + 6);
        rawInstallments.push({ period: 'السنة الأولى - دفعة 2', amount: annualAmount * 0.40, dueDate: formatDate(lastDueDate)});
        lastDueDate.setMonth(lastDueDate.getMonth() + 6);
        rawInstallments.push({ period: 'السنة الأولى - دفعة 3', amount: annualAmount * 0.40, dueDate: formatDate(lastDueDate)});
        
        for(let i = 2; i <= 25; i++) {
            annualAmount *= 1.02; 
            lastDueDate.setMonth(lastDueDate.getMonth() + 6);
            rawInstallments.push({ period: `السنة ${i} - دفعة 1`, amount: annualAmount * 0.50, dueDate: formatDate(lastDueDate)});
            lastDueDate.setMonth(lastDueDate.getMonth() + 6);
            rawInstallments.push({ period: `السنة ${i} - دفعة 2`, amount: annualAmount * 0.50, dueDate: formatDate(lastDueDate)});
        }
    } else { // 'أمر مباشر' or 'مبادرة'
        const graceEndDate = new Date(receiveDate);
        graceEndDate.setFullYear(graceEndDate.getFullYear() + 2);
        let annualAmount = baseAmount;
        for (let i = 1; i <= 25; i++) {
            if (i > 1) annualAmount *= 1.02;
            const dueDate = new Date(graceEndDate);
            dueDate.setFullYear(graceEndDate.getFullYear() + i -1);
            rawInstallments.push({ period: `قسط سنوي - سنة ${i}`, amount: annualAmount, dueDate: formatDate(dueDate) });
        }
    }
    
    // --- Process Installments with Payments ---
    const advancePayments = this.dataService.payments()
        .filter(p => p.customerId === this.customer().id && p.landId === currentLand.landId && p.status === 'confirmed' && p.invoiceId === null && (!p.tempInsuranceStatus || p.tempInsuranceStatus === 'awarded'))
        .map(p => ({ ...p, remainingAmount: p.amount }));

    const processedInstallments: Installment[] = [];
    for (const inst of rawInstallments) {
        const syntheticId = `AUTO-${currentLand.landId}-${inst.dueDate}`;
        const directPaidAmount = this.dataService.getPaidAmountForInvoice(syntheticId);
        
        let paidAmount = directPaidAmount;
        let remainingAmount = inst.amount - paidAmount;
        const appliedPayments: { paymentId: string; paymentDate: string; amountApplied: number }[] = [];
        
        if (remainingAmount > 0) {
            for (const payment of advancePayments) {
                if (payment.remainingAmount > 0) {
                    const amountToApply = Math.min(payment.remainingAmount, remainingAmount);
                    paidAmount += amountToApply;
                    remainingAmount -= amountToApply;
                    payment.remainingAmount -= amountToApply;
                    appliedPayments.push({ paymentId: payment.paymentId, paymentDate: payment.paymentDate, amountApplied: amountToApply });
                    if (remainingAmount <= 0) break;
                }
            }
        }

        let newStatus: Installment['status'];
        const isOverdue = new Date(inst.dueDate) < today;
        if (remainingAmount <= 0) {
            newStatus = 'مدفوع مقدماً';
        } else {
            if (isOverdue) {
                newStatus = paidAmount > 0 ? 'متأخر (جزئي)' : 'متأخر';
            } else {
                newStatus = paidAmount > 0 ? 'مدفوع جزئياً مقدماً' : 'قادم';
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

  processedInstallmentsMap = computed(() => {
    const map = new Map<string, Installment>();
    const landId = this.land()?.landId;
    if (landId) {
        this.futureInstallments().forEach(inst => {
            const syntheticId = `AUTO-${landId}-${inst.dueDate}`;
            map.set(syntheticId, inst);
        });
    }
    return map;
  });

  getEffectiveRemainingAmount(invoice: Invoice): number {
    const processedData = this.processedInstallmentsMap().get(invoice.id);
    if (processedData) {
        return processedData.remainingAmount;
    }
    return invoice.originalAmount - this.dataService.getPaidAmountForInvoice(invoice.id);
  }

  getEffectiveStatus(invoice: Invoice): string {
    const processedData = this.processedInstallmentsMap().get(invoice.id);
    if (processedData) {
        return processedData.status;
    }
    return this.dataService.getInvoiceDisplayStatus(invoice);
  }

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

  getTempInsuranceStatusBadgeClass(status: string | undefined): string {
    const styles: { [key: string]: string } = {
      'booked': 'bg-blue-100 text-blue-800',
      'awarded': 'bg-green-100 text-green-800',
      'returned': 'bg-red-100 text-red-800',
    };
    return status ? styles[status] : 'bg-gray-100 text-gray-800';
  }

  getTempInsuranceStatusText(status: string | undefined): string {
    const texts: { [key: string]: string } = {
      'booked': 'محجوز',
      'awarded': 'مرسى عليه',
      'returned': 'مسترجع',
    };
    return status ? texts[status] : 'N/A';
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
