import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerDetails } from '../../../models/data.models';

declare var lucide: any;

@Component({
  selector: 'app-investor-details',
  imports: [CommonModule],
  templateUrl: './investor-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestorDetailsComponent {
  details = input.required<CustomerDetails>();

  constructor() {
    effect(() => {
        this.details();
        setTimeout(() => lucide.createIcons(), 0);
    });
  }
}