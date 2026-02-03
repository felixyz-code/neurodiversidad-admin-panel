import { Component, Input } from '@angular/core';
import { IconDirective } from '@coreui/icons-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconDirective],
  template: `
    <div class="d-flex flex-column align-items-center gap-2 text-body-secondary">
      <svg cIcon [name]="icon" size="lg" aria-hidden="true"></svg>
      <div class="fw-semibold text-body">{{ title }}</div>
      <div class="small">{{ message }}</div>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() title = 'Sin resultados';
  @Input() message = 'No hay datos para mostrar.';
  @Input() icon = 'cilInbox';
}
