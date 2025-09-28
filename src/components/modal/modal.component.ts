import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { DataService } from '../../services/data.service';
import { Invoice, Payment, HistoryLogEntry, Customer, Land } from '../../models/data.models';

declare var lucide: any;

type PaymentDetailTab = 'collection' | 'details' | 'notes';
type PaymentMethod = 'تحويل بنكي' | 'شيك' | 'نقدي';

@Component({
  selector: 'app-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  modalService = inject(ModalService);
  dataService = inject(DataService);

  modalState = this.modalService.modalState$;
  
  // For payment details modal
  activeTab = signal<PaymentDetailTab>('collection');

  // For Arrears payment modal
  paymentAmount = signal<number | null>(null);
  paymentMethod = signal<PaymentMethod>('نقدي');
  paymentCashRecipient = signal('');
  paymentCashTreasury = signal('');
  paymentBankDepositId = signal('');
  paymentBankDate = signal('');
  paymentChequeNumber = signal('');
  paymentChequeDate = signal('');
  paymentNotes = signal('');
  paymentDescription = signal('');
  lateFee = signal(false);
  paymentError = signal<string | null>(null);
  paymentDate = signal('');
  lateFeeOriginalAmount = signal<number | null>(null);
  rejectionReason = signal('');

  lateFeeDelayDays = computed(() => {
    const modalData = this.modalState();
    if (modalData.type !== 'payment' || !modalData.data || !this.paymentDate()) {
        return 0;
    }
    const invoice = modalData.data as Invoice;
    const delay = this.dataService.calculateDelayDays(invoice.dueDate, new Date(this.paymentDate()));
    return delay > 0 ? delay : 0;
  });

  calculatedLateFee = computed(() => {
    const amount = this.lateFeeOriginalAmount() || 0;
    const days = this.lateFeeDelayDays() || 0;
    if (amount <= 0 || days <= 0) {
        return 0;
    }
    // Formula: (Amount * 21.75% * Days) / 365
    return (amount * 0.2175 * days) / 365;
  });

  invoiceRemainingAmount = computed(() => {
    if (this.modalState().type !== 'payment') return 0;
    const invoice = this.modalState().data as Invoice;
    if (!invoice) return 0;
    return invoice.originalAmount - this.dataService.getPaidAmountForInvoice(invoice.id);
  });
  
  totalAmountDueWithFee = computed(() => {
    return this.invoiceRemainingAmount() + (this.lateFee() ? this.calculatedLateFee() : 0);
  });

  remainingAfterPayment = computed(() => {
    return this.totalAmountDueWithFee() - (this.paymentAmount() || 0);
  });
  
  // For warning modal
  warningDeadline = signal('');
  warningDeliveryMethods = signal({
      email: true,
      platform: false,
      registeredMail: true,
  });

  warningData = computed(() => {
    if (this.modalState().type !== 'warning') return null;
    const invoice = this.modalState().data as Invoice;
    if (!invoice) return null;
    
    const customer = this.dataService.customers().find(c => c.id === invoice.customerId);
    const customerDetails = this.dataService.customerDetails()[invoice.customerId];
    const land = customerDetails?.lands.find(l => l.landId === invoice.landId);
    const remainingAmount = invoice.originalAmount - this.dataService.getPaidAmountForInvoice(invoice.id);
    
    return { invoice, customer, customerDetails, land, remainingAmount };
  });

  warningPreview = computed(() => {
      const data = this.warningData();
      if (!data) return '';
      let template = this.dataService.warningTemplate().content;
      
      template = template.replace(/\[clientName\]/g, data.customer?.name || 'غير محدد');
      template = template.replace(/\[clientAddress\]/g, data.customerDetails?.address || 'غير محدد');
      template = template.replace(/\[amountOverdue\]/g, this.dataService.formatCurrency(data.remainingAmount, data.invoice.currency));
      template = template.replace(/\[area\]/g, String(data.land?.auctionInfo.landArea || 'غير محدد'));
      template = template.replace(/\[center\]/g, data.customer?.center || 'غير محدد');
      template = template.replace(/\[deadline\]/g, this.warningDeadline() || '_________');

      return template;
  });

  invoiceDetailsData = computed(() => {
    if (this.modalState().type !== 'invoiceDetails') return null;
    const invoice = this.modalState().data as Invoice;
    if (!invoice) return null;

    const customer = this.dataService.customers().find(c => c.id === invoice.customerId);
    const customerDetails = this.dataService.customerDetails()[invoice.customerId];
    const land = customerDetails?.lands.find(l => l.landId === invoice.landId);
    
    const paidAmount = this.dataService.getPaidAmountForInvoice(invoice.id);
    const remainingAmount = invoice.originalAmount - paidAmount;
    const delayDays = this.dataService.calculateDelayDays(invoice.dueDate, new Date());
    const status = this.dataService.getInvoiceDisplayStatus(invoice);
    const statusClass = this.getStatusBadgeClass(status);

    return {
      invoice,
      customerName: customer?.name || 'غير معروف',
      land: land,
      paidAmount,
      remainingAmount,
      delayDays: delayDays > 0 ? delayDays : 0,
      status,
      statusClass
    };
  });

  warningDetailsData = computed(() => {
    if (this.modalState().type !== 'warningDetails') return null;
    const warning = this.modalState().data as HistoryLogEntry;
    if (!warning) return null;

    const invoice = this.dataService.invoices().find(inv => inv.id === warning.invoiceId);
    const customer = invoice ? this.dataService.customers().find(c => c.id === invoice.customerId) : null;

    return {
      warning,
      customerName: customer?.name || 'غير معروف'
    };
  });

  investorDetailsData = computed(() => {
      if (this.modalState().type !== 'investorDetails') return null;
      const invoice = this.modalState().data as Invoice;
      if (!invoice) return null;

      const customer = this.dataService.customers().find(c => c.id === invoice.customerId);
      const customerDetails = this.dataService.customerDetails()[invoice.customerId];
      const land = customerDetails?.lands.find(l => l.landId === invoice.landId);

      const allInvoices = this.dataService.getInvoicesByCustomerId(invoice.customerId)();
      const allPayments = this.dataService.getPaymentsByCustomerId(invoice.customerId)();

      const totalDue = allInvoices.reduce((sum, inv) => sum + inv.originalAmount, 0);
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalOverdue = allInvoices
        .filter(inv => new Date(inv.dueDate) < this.dataService.today() && inv.status !== 'paid')
        .reduce((sum, inv) => sum + (inv.originalAmount - this.dataService.getPaidAmountForInvoice(inv.id)), 0);

      return { invoice, customer, customerDetails, land, totalDue, totalPaid, totalOverdue };
  });
  
  paymentRevenueDetailsData = computed(() => {
    if (this.modalState().type !== 'paymentRevenueDetails') return null;
    const payment = this.modalState().data as Payment;
    if (!payment) return null;

    const invoice = payment.invoiceId ? this.dataService.invoices().find(i => i.id === payment.invoiceId) : null;
    
    let status = { text: 'مدفوع', class: 'bg-green-500' };
    let remainingAmount = 0;
    
    if (invoice) {
        const paidAmount = this.dataService.getPaidAmountForInvoice(invoice.id);
        remainingAmount = invoice.originalAmount - paidAmount;
        const invoiceStatus = this.dataService.getInvoiceDisplayStatus(invoice);
        if (invoiceStatus.includes('متأخر')) {
            status = { text: 'متأخر', class: 'bg-red-500' };
        } else if (remainingAmount > 0) {
            status = { text: 'مسدد جزئياً', class: 'bg-yellow-500' };
        }
    }

    const customerName = this.dataService.customers().find(c => c.id === payment.customerId)?.name || 'غير معروف';

    return { payment, invoice, status, remainingAmount, customerName };
  });
  
  investorFinancialSummaryData = computed(() => {
    if (this.modalState().type !== 'investorFinancialSummary') return null;
    const payment = this.modalState().data as Payment;
    if (!payment) return null;

    const customer = this.dataService.customers().find(c => c.id === payment.customerId);
    const customerDetails = this.dataService.customerDetails()[payment.customerId];
    const land = customerDetails?.lands.find(l => l.landId === payment.landId);

    const allInvoices = this.dataService.getInvoicesByCustomerId(payment.customerId)();
    const allPayments = this.dataService.getPaymentsByCustomerId(payment.customerId)();

    const totalDue = allInvoices.reduce((sum, inv) => sum + inv.originalAmount, 0);
    const totalPaid = allPayments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0);
    
    // FIX: Call the `getOverdueInvoices` signal to get its array value before calling `.filter()` on it.
    const totalOverdue = this.dataService.getOverdueInvoices()()
        .filter(inv => inv.customerId === payment.customerId)
        .reduce((sum, inv) => sum + (inv.originalAmount - this.dataService.getPaidAmountForInvoice(inv.id)), 0);

    return { customer, customerDetails, land, totalDue, totalPaid, totalOverdue };
  });

  paymentReceiptData = computed(() => {
    if (this.modalState().type !== 'paymentReceipt') return null;
    const payment = this.modalState().data as Payment;
    if (!payment) return null;

    const customer = this.dataService.customers().find(c => c.id === payment.customerId);
    const invoice = payment.invoiceId ? this.dataService.invoices().find(i => i.id === payment.invoiceId) : null;
    const remainingOnInvoice = invoice ? (invoice.originalAmount - this.dataService.getPaidAmountForInvoice(invoice.id)) : 0;
    
    return { payment, customer, invoice, remainingOnInvoice };
  });
  
  tempInsuranceDetailsData = computed(() => {
    if (this.modalState().type !== 'tempInsuranceDetails') return null;
    const payment = this.modalState().data as Payment;
    if (!payment) return null;

    const customer = this.dataService.customers().find(c => c.id === payment.customerId);
    return {
        payment,
        customerName: customer?.name || 'غير معروف'
    };
  });

  constructor() {
    effect(() => {
        const state = this.modalState();
        if(state.type) {
            this.resetPaymentForm(); // Reset form when any modal opens
            if (state.type === 'payment' || state.type === 'financialPayment') {
              const invoice = state.data as Invoice;
              if (invoice) {
                  const remainingPrincipal = invoice.originalAmount - this.dataService.getPaidAmountForInvoice(invoice.id);
                  this.lateFeeOriginalAmount.set(remainingPrincipal);
                  this.paymentDate.set(new Date().toISOString().split('T')[0]);
              }
            } else if (state.type === 'paymentEdit') {
                const payment = state.data as Payment;
                if(payment) {
                    this.populatePaymentForm(payment);
                }
            }
            setTimeout(() => lucide.createIcons(), 0);
        }
    }, { allowSignalWrites: true });
  }

  close() {
    this.modalService.close();
  }

  confirmReminder() {
    const invoice = this.modalState().data as Invoice;
    if(invoice) {
        this.dataService.addReminder(invoice.id);
    }
    this.close();
  }

  setActiveTab(tab: PaymentDetailTab) {
    this.activeTab.set(tab);
  }

  getPaymentDetails() {
      const payment = this.modalState().data as Payment;
      if (!payment) return null;

      const invoice = payment.invoiceId ? this.dataService.invoices().find(inv => inv.id === payment.invoiceId) : null;
      const paidAmountForInvoice = this.dataService.getPaidAmountForInvoice(invoice?.id ?? null);
      const remainingAmount = invoice ? invoice.originalAmount - paidAmountForInvoice : 0;

      return { payment, invoice, paidAmountForInvoice, remainingAmount };
  }

  getStatusBadgeClass(status: string): string {
    if (status.includes('متأخر')) return 'bg-red-100 text-red-700';
    if (status.includes('جزئي')) return 'bg-yellow-100 text-yellow-700';
    if (status.includes('مدفوع')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  }
  
  // Method for Arrears Payment Modal
  savePayment() {
    this.paymentError.set(null);
    const invoice = this.modalState().data as Invoice;
    const amount = this.paymentAmount();
    
    if (!invoice || !amount || amount <= 0) {
      this.paymentError.set('الرجاء إدخال مبلغ سداد صحيح أكبر من صفر.');
      return;
    }
    
    const fee = this.lateFee() ? (this.calculatedLateFee() || 0) : 0;
    const totalAmount = amount + fee;

    let details = {};
    switch(this.paymentMethod()) {
        case 'نقدي': details = { recipient: this.paymentCashRecipient(), treasury: this.paymentCashTreasury() }; break;
        case 'تحويل بنكي': details = { transferId: this.paymentBankDepositId(), depositDate: this.paymentBankDate() }; break;
        case 'شيك': details = { chequeNumber: this.paymentChequeNumber(), dueDate: this.paymentChequeDate() }; break;
    }

    this.dataService.addPayment({
      invoiceId: invoice.id,
      amount: totalAmount,
      method: this.paymentMethod(),
      details: details,
      notes: this.paymentNotes(),
      paymentDate: this.paymentDate(),
    });
    
    this.close();
  }

  saveAdvancePayment() {
    this.paymentError.set(null);
    const modalData = this.modalState().data as { land: Land, customer: Customer };
    const amount = this.paymentAmount();
    
    if (!modalData || !amount || amount <= 0) {
      this.paymentError.set('الرجاء إدخال مبلغ سداد صحيح أكبر من صفر.');
      return;
    }

    if (!this.paymentDescription()) {
      this.paymentError.set('الرجاء إدخال بند الدفع.');
      return;
    }
    
    if (!this.paymentDate()) {
      this.paymentError.set('الرجاء إدخال تاريخ الدفع.');
      return;
    }

    let details = {};
    switch(this.paymentMethod()) {
        case 'نقدي': details = { recipient: this.paymentCashRecipient(), treasury: this.paymentCashTreasury() }; break;
        case 'تحويل بنكي': details = { transferId: this.paymentBankDepositId(), depositDate: this.paymentBankDate() }; break;
        case 'شيك': details = { chequeNumber: this.paymentChequeNumber(), dueDate: this.paymentChequeDate() }; break;
    }
    
    this.dataService.addAdvancePayment({
        customerId: modalData.customer.id,
        landId: modalData.land.landId,
        amount: amount,
        method: this.paymentMethod(),
        details: details,
        notes: this.paymentNotes(),
        paymentDate: this.paymentDate(),
        description: this.paymentDescription(),
        currency: modalData.land.currency,
    });

    this.close();
  }
  
  saveFinancialPayment() {
    this.paymentError.set(null);
    const invoice = this.modalState().data as Invoice;
    const amount = this.paymentAmount();

    if (!invoice || !amount || amount <= 0) {
        this.paymentError.set("الرجاء إدخال مبلغ صحيح.");
        return;
    }
    
    const fee = this.lateFee() ? this.calculatedLateFee() : 0;
    const totalToPay = amount; // Fee is handled separately or included in amount by user
    
    this.dataService.addPayment({
        invoiceId: invoice.id,
        amount: totalToPay,
        method: this.paymentMethod(),
        details: {}, // Simplified for this example
        notes: this.paymentNotes(),
        paymentDate: this.paymentDate()
    });
    alert('✅ تم إرسال السداد للمراجعة!');
    this.close();
  }

  confirmPaymentAction() {
    const payment = this.modalState().data as Payment;
    if (payment) {
        this.dataService.confirmPayment(payment.paymentId);
    }
    this.close();
  }

  rejectPaymentAction() {
    const payment = this.modalState().data as Payment;
    if (payment && this.rejectionReason()) {
        this.dataService.rejectPayment(payment.paymentId, this.rejectionReason());
    }
    this.close();
  }

  updatePaymentAction() {
    this.paymentError.set(null);
    const originalPayment = this.modalState().data as Payment;
    const amount = this.paymentAmount();

    if (!originalPayment || !amount || amount <= 0) {
        this.paymentError.set('الرجاء إدخال مبلغ سداد صحيح أكبر من صفر.');
        return;
    }

    let details = {};
    switch(this.paymentMethod()) {
        case 'نقدي': details = { recipient: this.paymentCashRecipient(), treasury: this.paymentCashTreasury() }; break;
        case 'تحويل بنكي': details = { transferId: this.paymentBankDepositId(), depositDate: this.paymentBankDate() }; break;
        case 'شيك': details = { chequeNumber: this.paymentChequeNumber(), dueDate: this.paymentChequeDate() }; break;
    }
    
    this.dataService.updatePayment({
        paymentId: originalPayment.paymentId,
        amount,
        method: this.paymentMethod(),
        details,
        notes: this.paymentNotes(),
        paymentDate: this.paymentDate(),
        description: this.paymentDescription(),
    });
    this.close();
  }

  sendWarning() {
      const data = this.warningData();
      if (!data) return;

      if (!this.warningDeadline()) {
          alert('الرجاء تحديد الموعد النهائي للسداد.');
          return;
      }
      
      const methods = Object.entries(this.warningDeliveryMethods())
          .filter(([_, value]) => value)
          .map(([key, _]) => key);

      if (methods.length === 0) {
          alert('الرجاء اختيار طريقة إرسال واحدة على الأقل.');
          return;
      }

      this.dataService.addWarning(data.invoice.id, methods, this.warningDeadline(), this.warningPreview());
      alert('تم تسجيل الإنذار بنجاح.');
      this.close();
  }

  populatePaymentForm(payment: Payment) {
    this.paymentAmount.set(payment.amount);
    this.paymentMethod.set(payment.method);
    this.paymentNotes.set(payment.notes);
    this.paymentDate.set(payment.paymentDate);
    this.paymentDescription.set(payment.description);
    
    if (payment.method === 'نقدي') {
        this.paymentCashRecipient.set(payment.details?.recipient || '');
        this.paymentCashTreasury.set(payment.details?.treasury || '');
    } else if (payment.method === 'تحويل بنكي') {
        this.paymentBankDepositId.set(payment.details?.transferId || '');
        this.paymentBankDate.set(payment.details?.depositDate || '');
    } else if (payment.method === 'شيك') {
        this.paymentChequeNumber.set(payment.details?.chequeNumber || '');
        this.paymentChequeDate.set(payment.details?.dueDate || '');
    }
  }

  resetPaymentForm() {
    this.paymentAmount.set(null);
    this.paymentMethod.set('نقدي');
    this.paymentCashRecipient.set('');
    this.paymentCashTreasury.set('');
    this.paymentBankDepositId.set('');
    this.paymentBankDate.set('');
    this.paymentChequeNumber.set('');
    this.paymentChequeDate.set('');
    this.paymentNotes.set('');
    this.paymentDescription.set('');
    this.lateFee.set(false);
    this.paymentDate.set('');
    this.lateFeeOriginalAmount.set(null);
    this.warningDeadline.set('');
    this.warningDeliveryMethods.set({ email: true, platform: false, registeredMail: true });
    this.activeTab.set('collection');
    this.paymentError.set(null);
    this.rejectionReason.set('');
  }
  
  printGeneric(title: string, contentSelector: string) {
    const content = document.querySelector(contentSelector)?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html><head><title>${title}</title>
      <script src="https://cdn.tailwindcss.com"><\/script>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>body { font-family: 'Cairo', sans-serif; direction: rtl; }</style>
      </head><body class="p-8">${content}</body></html>`);
    printWindow?.document.close();
    setTimeout(() => printWindow?.print(), 250);
  }

  printWarning() {
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>طباعة إنذار</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style> body { font-family: 'Cairo', sans-serif; direction: rtl; } @media print { #print-button { display: none; } } </style>
        </head>
        <body class="p-8">
          <button id="print-button" onclick="window.print()" class="fixed top-4 right-4 bg-sky-600 text-white px-4 py-2 rounded shadow-lg">طباعة</button>
          <div id="printable-content">${this.warningPreview()}</div>
        </body>
      </html>`);
    printWindow?.document.close();
  }

  printReceipt() {
    const data = this.paymentRevenueDetailsData();
    if (!data) return;

    const receiptContent = document.getElementById('printable-receipt-content')?.innerHTML;
    if (!receiptContent) return;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
        <html>
            <head>
                <title>إيصال سداد - ${data.payment.paymentId}</title>
                <script src="https://cdn.tailwindcss.com"><\/script>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; direction: rtl; }
                    @media print { #print-button { display: none; } }
                </style>
            </head>
            <body class="p-8 bg-gray-100">
                <button id="print-button" onclick="window.print()" class="fixed top-4 right-4 bg-sky-600 text-white px-4 py-2 rounded shadow-lg z-50">طباعة</button>
                ${receiptContent}
            </body>
        </html>
    `);
    printWindow?.document.close();
  }
}