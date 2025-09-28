import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';
import { Payment } from '../../models/data.models';

declare var lucide: any;

@Component({
  selector: 'app-temp-insurance',
  // FIX: Removed `standalone: true` as it is the default in modern Angular versions and its explicit use is discouraged by best practices.
  imports: [CommonModule, FormsModule],
  templateUrl: './temp-insurance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TempInsuranceComponent {
  dataService = inject(DataService);
  modalService = inject(ModalService);

  // Filters
  yearFilter = signal('all');
  auctionIdFilter = signal('');
  statusFilter = signal<'all' | 'booked' | 'awarded' | 'returned'>('all');
  paymentMethodFilter = signal('all');

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(4);

  // Filter options
  auctionYears = computed(() => {
    const years = new Set(this.dataService.getTempInsurances()().map(p => new Date(p.paymentDate).getFullYear().toString()));
    return ['all', ...Array.from(years).sort().reverse()];
  });

  statusOptions: { key: 'all' | 'booked' | 'awarded' | 'returned'; value: string }[] = [
    { key: 'all', value: 'الكل' },
    { key: 'booked', value: 'محجوز' },
    { key: 'awarded', value: 'مرسى عليه' },
    { key: 'returned', value: 'مسترجع' },
  ];
  
  paymentMethods = ['all', 'نقدي', 'تحويل بنكي', 'شيك'];

  filteredInsurances = computed(() => {
    const insurances = this.dataService.getTempInsurances();
    
    return insurances().filter(p => {
      const yearMatch = this.yearFilter() === 'all' || new Date(p.paymentDate).getFullYear().toString() === this.yearFilter();
      const auctionIdMatch = this.auctionIdFilter() === '' || p.auctionId?.toLowerCase().includes(this.auctionIdFilter().toLowerCase());
      const statusMatch = this.statusFilter() === 'all' || p.tempInsuranceStatus === this.statusFilter();
      const paymentMethodMatch = this.paymentMethodFilter() === 'all' || p.method === this.paymentMethodFilter();

      return yearMatch && auctionIdMatch && statusMatch && paymentMethodMatch;
    });
  });

  totalPages = computed(() => Math.ceil(this.filteredInsurances().length / this.itemsPerPage()));

  paginatedInsurances = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const startIndex = (page - 1) * perPage;
    return this.filteredInsurances().slice(startIndex, startIndex + perPage);
  });

  paginationInfo = computed(() => {
    const total = this.filteredInsurances().length;
    const perPage = this.itemsPerPage();
    const page = this.currentPage();
    const start = total > 0 ? (page - 1) * perPage + 1 : 0;
    const end = Math.min(page * perPage, total);
    return `عرض ${start}–${end} من ${total} نتيجة`;
  });

  constructor() {
    effect(() => {
      this.paginatedInsurances();
      setTimeout(() => lucide.createIcons(), 0);
    });
    effect(() => {
      // Reset to first page if filters change
      this.filteredInsurances();
      this.currentPage.set(1);
    }, { allowSignalWrites: true });
  }

  getCustomerName(customerId: number): string {
    return this.dataService.customers().find(c => c.id === customerId)?.name || 'غير معروف';
  }

  getStatusBadgeClass(status: 'booked' | 'awarded' | 'returned' | undefined): string {
    const styles = {
      booked: 'bg-blue-100 text-blue-800',
      awarded: 'bg-green-100 text-green-800',
      returned: 'bg-red-100 text-red-800',
    };
    return status ? styles[status] : 'bg-gray-100 text-gray-800';
  }
  
  getStatusValue(statusKey: 'booked' | 'awarded' | 'returned' | undefined): string {
    if (!statusKey) return 'N/A';
    return this.statusOptions.find(s => s.key === statusKey)?.value || 'N/A';
  }

  applyFilters() {
    this.currentPage.set(1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  // --- Actions ---
  openDetailsModal(payment: Payment) {
    this.modalService.open('tempInsuranceDetails', payment);
  }

  returnInsurance(paymentId: string) {
    this.dataService.returnInsurance(paymentId);
  }
  
  awardInsurance(paymentId: string) {
    this.dataService.awardInsurance(paymentId);
  }
}