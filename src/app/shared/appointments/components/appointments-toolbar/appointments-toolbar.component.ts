import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonDirective, FormControlDirective } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { AppointmentStatus } from '../../../../models/appointments.models';
import { SpecialistDto } from '../../../../models/staff.models';

@Component({
  selector: 'app-appointments-toolbar',
  standalone: true,
  imports: [CommonModule, ButtonDirective, FormControlDirective, IconDirective],
  styleUrls: ['./appointments-toolbar.component.scss'],
  template: `
    <div class="citas-filter-bar">
      <div class="citas-filter-grid">
        <input
          cFormControl
          class="form-control citas-filter-input"
          type="text"
          placeholder="Buscar por paciente"
          [value]="filterText"
          (input)="filterTextChange.emit($any($event.target).value)"
          aria-label="Buscar por paciente"
        >
        <select
          cFormControl
          class="form-select form-select-sm"
          [value]="statusFilter"
          (change)="statusFilterChange.emit($any($event.target).value)"
          aria-label="Filtrar por estado"
        >
          <option value="PENDING">Pendientes</option>
          <option value="CONFIRMED">Confirmadas</option>
          <option value="COMPLETED">Finalizadas</option>
          <option value="CANCELED">Canceladas</option>
          <option value="ALL">Todas</option>
        </select>
        @if (showSpecialistFilter) {
          <select
            cFormControl
            class="form-select form-select-sm calendar-filter-select"
            [value]="selectedSpecialistId"
            [disabled]="isSpecialistFilterLocked"
            (change)="specialistFilterChange.emit($any($event.target).value)"
            aria-label="Filtrar por especialista"
          >
            <option value="">Todos los especialistas</option>
            @for (especialista of specialists; track especialista.id) {
              <option [value]="especialista.id">{{ especialista.userName }}</option>
            }
          </select>
        }
      </div>
      <div class="citas-filter-row">
        <div class="citas-date-group">
          <label class="small text-body-secondary mb-0" for="dateFrom">Desde</label>
          <input
            cFormControl
            class="form-control citas-date-input"
            type="date"
            id="dateFrom"
            [value]="dateFrom"
            [disabled]="viewMode === 'agenda'"
            (change)="dateFromChange.emit($any($event.target).value)"
            aria-label="Fecha desde"
          >
        </div>
        <div class="citas-date-group">
          <label class="small text-body-secondary mb-0" for="dateTo">Hasta</label>
          <input
            cFormControl
            class="form-control citas-date-input"
            type="date"
            id="dateTo"
            [value]="dateTo"
            [disabled]="viewMode === 'agenda'"
            (change)="dateToChange.emit($any($event.target).value)"
            aria-label="Fecha hasta"
          >
        </div>
        <div class="citas-actions">
          <button
            cButton
            color="primary"
            size="sm"
            aria-label="Nueva cita"
            (click)="create.emit()"
          >
            <svg cIcon name="cilPlus" size="sm" class="me-2"></svg>
            Nueva cita
          </button>
          <button
            cButton
            color="secondary"
            variant="ghost"
            (click)="exportExcel.emit()"
            [disabled]="isExportingData"
          >
            Excel
          </button>
          <button
            cButton
            color="secondary"
            variant="ghost"
            (click)="exportPdf.emit()"
            [disabled]="isExportingData"
          >
            PDF
          </button>
          <div class="btn-group btn-group-sm" role="group" aria-label="Cambiar vista">
            <button
              cButton
              color="secondary"
              [class.active]="viewMode === 'table'"
              (click)="viewModeChange.emit('table')"
            >
              Tabla
            </button>
            <button
              cButton
              color="secondary"
              [class.active]="viewMode === 'calendar'"
              (click)="viewModeChange.emit('calendar')"
            >
              Calendario
            </button>
            <button
              cButton
              color="secondary"
              [class.active]="viewMode === 'agenda'"
              (click)="viewModeChange.emit('agenda')"
            >
              Agenda
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AppointmentsToolbarComponent {
  @Input() filterText = '';
  @Input() statusFilter: AppointmentStatus | 'ALL' = 'PENDING';
  @Input() selectedSpecialistId = '';
  @Input() specialists: SpecialistDto[] = [];
  @Input() isSpecialistFilterLocked = false;
  @Input() showSpecialistFilter = true;
  @Input() dateFrom = '';
  @Input() dateTo = '';
  @Input() viewMode: 'table' | 'calendar' | 'agenda' = 'table';
  @Input() isExportingData = false;

  @Output() filterTextChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<AppointmentStatus | 'ALL'>();
  @Output() specialistFilterChange = new EventEmitter<string>();
  @Output() dateFromChange = new EventEmitter<string>();
  @Output() dateToChange = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() exportExcel = new EventEmitter<void>();
  @Output() exportPdf = new EventEmitter<void>();
  @Output() viewModeChange = new EventEmitter<'table' | 'calendar' | 'agenda'>();
}
