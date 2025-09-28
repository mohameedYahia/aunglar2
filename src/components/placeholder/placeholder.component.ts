import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  templateUrl: './placeholder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {
  // FIX: Explicitly type the injected ActivatedRoute to fix type inference errors.
  private route: ActivatedRoute = inject(ActivatedRoute);
  title = signal('صفحة غير موجودة');

  constructor() {
    this.title.set(this.route.snapshot.data['title'] || 'صفحة غير موجودة');
  }
}