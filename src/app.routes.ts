import { Routes } from '@angular/router';
import { CustomerAccountsComponent } from './components/customer-accounts/customer-accounts.component';
import { CustomerDetailsComponent } from './components/customer-details/customer-details.component';
import { ArrearsComponent } from './components/arrears/arrears.component';
import { SentWarningsComponent } from './components/sent-warnings/sent-warnings.component';
import { WarningTemplatesComponent } from './components/warning-templates/warning-templates.component';
import { PlaceholderComponent } from './components/placeholder/placeholder.component';
import { FinancialDuesComponent } from './components/financial-dues/financial-dues.component';
import { PaymentConfirmationsComponent } from './components/payment-confirmations/payment-confirmations.component';
import { RevenuesComponent } from './components/revenues/revenues.component';
import { TempInsuranceComponent } from './components/temp-insurance/temp-insurance.component';

export const APP_ROUTES: Routes = [
  { path: 'customer-accounts', component: CustomerAccountsComponent },
  { path: 'customer-details/:id', component: CustomerDetailsComponent },
  { path: 'arrears', component: ArrearsComponent },
  { path: 'sent-warnings', component: SentWarningsComponent },
  { path: 'financial-dues', component: FinancialDuesComponent, data: { title: 'المستحقات المالية' } },
  { path: 'payment-confirmations', component: PaymentConfirmationsComponent, data: { title: 'تأكيد المدفوعات' } },
  { path: 'ownership', component: PlaceholderComponent, data: { title: 'تمليك' } },
  { path: 'temp-insurance', component: TempInsuranceComponent, data: { title: 'تامين مؤقت' } },
  { path: 'revenues', component: RevenuesComponent, data: { title: 'الايرادات' } },
  { path: 'warning-templates', component: WarningTemplatesComponent },
  { path: '', redirectTo: 'customer-accounts', pathMatch: 'full' },
  { path: '**', redirectTo: 'customer-accounts' },
];