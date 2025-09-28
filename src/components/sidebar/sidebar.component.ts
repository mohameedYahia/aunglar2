import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

declare var lucide: any;

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class SidebarComponent {
  menuItems = [
    { path: '/customer-accounts', label: 'حسابات العملاء', icon: 'users' },
    { path: '/arrears', label: 'المتأخرات', icon: 'clock' },
    { path: '/payment-confirmations', label: 'تأكيد المدفوعات', icon: 'check-circle' },
    { path: '/sent-warnings', label: 'الانذارات المرسلة', icon: 'shield-alert' },
    { path: '/financial-dues', label: 'المستحقات المالية', icon: 'calendar' },
    { path: '/ownership', label: 'تمليك', icon: 'home' },
    { path: '/temp-insurance', label: 'تامين مؤقت', icon: 'shield' },
    { path: '/revenues', label: 'الايرادات', icon: 'trending-up' },
    { path: '/warning-templates', label: 'صيغة الانذارات', icon: 'file-text' }
  ];

  constructor() {
    effect(() => {
        setTimeout(() => lucide.createIcons(), 0);
    });
  }
}
