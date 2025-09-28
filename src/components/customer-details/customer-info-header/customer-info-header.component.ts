import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Customer } from '../../../models/data.models';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-customer-info-header',
  imports: [CommonModule],
  templateUrl: './customer-info-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerInfoHeaderComponent {
  dataService = inject(DataService);
  customer = input.required<Customer>();

  getCustomerStatusBadgeClass(status: string): string {
    const styles: { [key: string]: string } = { 
        'منتظم': 'bg-green-100 text-green-800', 
        'متخلف جزئياً': 'bg-yellow-100 text-yellow-800', 
        'متخلف كلياً': 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }
}