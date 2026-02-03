import { Component, Input } from '@angular/core';
import { SpinnerComponent } from '@coreui/angular';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [SpinnerComponent],
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center py-5 gap-3">
      <c-spinner [color]="color" [variant]="variant" [attr.aria-label]="ariaLabel"></c-spinner>
      <span class="text-body-secondary small">{{ label }}</span>
    </div>
  `
})
export class LoadingStateComponent {
  @Input() label = 'Cargando...';
  @Input() ariaLabel = 'Cargando';
  @Input() color: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' = 'primary';
  @Input() variant: 'border' | 'grow' = 'grow';
}
