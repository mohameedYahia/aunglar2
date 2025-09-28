import { Injectable, signal } from '@angular/core';

export type ModalType = 'reminderConfirm' | 'reminderLog' | 'paymentDetails' | 'payment' | 'warning' | 'invoiceDetails' | 'warningDetails' | 'financialPayment' | 'investorDetails' | 'paymentReceipt' | 'advancePayment' | 'paymentConfirmation' | 'paymentRejection' | 'paymentEdit' | 'paymentRevenueDetails' | 'investorFinancialSummary' | 'tempInsuranceDetails';

export interface ModalState {
  type: ModalType | null;
  data: any | null;
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalState = signal<ModalState>({ type: null, data: null });

  modalState$ = this.modalState.asReadonly();

  open(type: ModalType, data?: any) {
    this.modalState.set({ type, data });
  }

  close() {
    this.modalState.set({ type: null, data: null });
  }
}