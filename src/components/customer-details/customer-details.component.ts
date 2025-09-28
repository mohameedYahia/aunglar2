import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { CustomerInfoHeaderComponent } from './customer-info-header/customer-info-header.component';
import { InvestorDetailsComponent } from './investor-details/investor-details.component';
import { LandDetailsComponent } from './land-details/land-details.component';

declare var lucide: any;

@Component({
  selector: 'app-customer-details',
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    CustomerInfoHeaderComponent,
    InvestorDetailsComponent,
    LandDetailsComponent
  ],
  templateUrl: './customer-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailsComponent {
  route: ActivatedRoute = inject(ActivatedRoute);
  dataService = inject(DataService);

  private customerId = signal(0);
  
  data = computed(() => {
    const id = this.customerId();
    if (!id) return null;

    const customer = this.dataService.customers().find(c => c.id === id);
    const details = this.dataService.customerDetails()[id];

    if (!customer || !details) return null;
    return { customer, details };
  });
  
  selectedLandId = signal<string | null>(null);

  selectedLand = computed(() => {
    const landId = this.selectedLandId();
    const details = this.data()?.details;
    if (!landId || !details) return null;
    return details.lands.find(l => l.landId === landId) ?? null;
  });

  customerNotes = signal('');

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.customerId.set(id);
    });

    effect(() => {
      const currentData = this.data();
      if (currentData) {
        this.customerNotes.set(currentData.details.notes);
        if (currentData.details.lands.length > 0 && this.selectedLandId() === null) {
          this.selectedLandId.set(currentData.details.lands[0].landId);
        }
      }
    }, { allowSignalWrites: true });

    effect(() => {
        this.data(); // Depend on data
        setTimeout(() => lucide.createIcons(), 0);
    });
  }

  selectLand(landId: string) {
    this.selectedLandId.set(landId);
  }

  saveNotes() {
    if(this.data()){
        this.dataService.updateCustomerNotes(this.data()!.customer.id, this.customerNotes());
        alert('تم حفظ الملاحظات بنجاح!');
    }
  }
}
