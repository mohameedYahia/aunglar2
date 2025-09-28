import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

declare var lucide: any;

@Component({
  selector: 'app-customer-accounts',
  templateUrl: './customer-accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
})
export class CustomerAccountsComponent {
  dataService = inject(DataService);

  mechanisms = ['الكل', 'مزاد علني', 'أمر مباشر', 'مبادرة'];
  currencies = { 'الكل': 'الكل', 'EGP': 'جنيه مصري', 'USD': 'دولار' };
  centers = ['الكل', 'الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'];
  statuses = ['الكل', 'منتظم', 'متخلف جزئياً', 'متخلف كلياً'];
  
  // Filter signals
  mechanismFilter = signal('الكل');
  currencyFilter = signal('الكل');
  centerFilter = signal('الكل');
  searchQuery = signal('');
  investorStatusFilter = signal('الكل');

  filteredCustomers = computed(() => {
    const customers = this.dataService.customers();
    const mechanism = this.mechanismFilter();
    const currency = this.currencyFilter();
    const center = this.centerFilter();
    const query = this.searchQuery().toLowerCase();
    const status = this.investorStatusFilter();

    return customers.filter(c => {
      const mechanismMatch = mechanism === 'الكل' || c.mechanism === mechanism;
      const currencyMatch = currency === 'الكل' || c.currency === currency;
      const centerMatch = center === 'الكل' || c.center === center;
      const searchMatch = c.name.toLowerCase().includes(query);
      const statusMatch = status === 'الكل' || this.dataService.getCustomerOverallStatus(c.id) === status;
      return mechanismMatch && currencyMatch && centerMatch && searchMatch && statusMatch;
    });
  });

  constructor() {
    effect(() => {
        this.filteredCustomers(); // Depend on this signal
        setTimeout(() => lucide.createIcons(), 0);
    });
  }

  setMechanismFilter(value: string) {
    this.mechanismFilter.set(value);
  }

  setCurrencyFilter(value: string) {
    this.currencyFilter.set(value);
  }

  setInvestorStatusFilter(value: string) {
    this.investorStatusFilter.set(value);
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onCenterChange(event: Event) {
    this.centerFilter.set((event.target as HTMLSelectElement).value);
  }

  getStatusBadgeClass(status: string): string {
    const styles: { [key: string]: string } = { 
        'منتظم': 'bg-green-100 text-green-800', 
        'متخلف جزئياً': 'bg-yellow-100 text-yellow-800', 
        'متخلف كلياً': 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }
}
