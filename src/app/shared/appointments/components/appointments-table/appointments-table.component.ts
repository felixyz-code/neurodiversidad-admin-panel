import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  BadgeComponent,
  ButtonDirective,
  FormCheckInputDirective,
  PaginationModule,
  TableDirective,
  TooltipDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { EmptyStateComponent } from '../../../components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../components/loading-state/loading-state.component';
import { DateLabelPipe } from '../../../pipes/date-label.pipe';
import { HourRangePipe } from '../../../pipes/hour-range.pipe';
import { AppointmentEstadoLabel, AppointmentListItem } from '../../appointments.view-models';

@Component({
  selector: 'app-appointments-table',
  standalone: true,
  imports: [
    CommonModule,
    TableDirective,
    PaginationModule,
    BadgeComponent,
    ButtonDirective,
    FormCheckInputDirective,
    TooltipDirective,
    IconDirective,
    EmptyStateComponent,
    LoadingStateComponent,
    DateLabelPipe,
    HourRangePipe
  ],
  styleUrls: ['./appointments-table.component.scss'],
  template: `
    @if (isLoading) {
      <app-loading-state label="Cargando citas..." ariaLabel="Cargando citas"></app-loading-state>
    } @else {
      <table
        cTable
        class="mb-0"
        [hover]="true"
        [responsive]="true"
        [striped]="true"
        align="middle"
      >
        <thead class="bg-body-tertiary text-body-secondary small text-uppercase">
          <tr>
            <th class="ps-4">
              <input
                cFormCheckInput
                type="checkbox"
                [checked]="isAllSelected"
                (click)="$event.stopPropagation()"
                (change)="toggleSelectAll.emit($event)"
                aria-label="Seleccionar todas las citas"
              >
            </th>
            <th class="ps-4">
              <button type="button" class="sort-button" (click)="toggleSort.emit('paciente')">
                Paciente
                @if (sortKey === 'paciente') {
                  <svg cIcon [name]="sortDir === 'asc' ? 'cilArrowTop' : 'cilArrowBottom'" size="sm" class="sort-icon"></svg>
                }
              </button>
            </th>
            <th>
              <button type="button" class="sort-button" (click)="toggleSort.emit('fecha')">
                Fecha
                @if (sortKey === 'fecha') {
                  <svg cIcon [name]="sortDir === 'asc' ? 'cilArrowTop' : 'cilArrowBottom'" size="sm" class="sort-icon"></svg>
                }
              </button>
            </th>
            <th>
              <button type="button" class="sort-button" (click)="toggleSort.emit('hora')">
                Horario
                @if (sortKey === 'hora') {
                  <svg cIcon [name]="sortDir === 'asc' ? 'cilArrowTop' : 'cilArrowBottom'" size="sm" class="sort-icon"></svg>
                }
              </button>
            </th>
            <th>
              <button type="button" class="sort-button" (click)="toggleSort.emit('especialista')">
                Especialista
                @if (sortKey === 'especialista') {
                  <svg cIcon [name]="sortDir === 'asc' ? 'cilArrowTop' : 'cilArrowBottom'" size="sm" class="sort-icon"></svg>
                }
              </button>
            </th>
            <th>
              <span class="fw-semibold">Creado por</span>
            </th>
            <th class="text-center pe-4">
              <button type="button" class="sort-button" (click)="toggleSort.emit('estado')">
                Estado
                @if (sortKey === 'estado') {
                  <svg cIcon [name]="sortDir === 'asc' ? 'cilArrowTop' : 'cilArrowBottom'" size="sm" class="sort-icon"></svg>
                }
              </button>
            </th>
            <th class="text-end pe-4">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @if (isEmpty) {
            <tr>
              <td colspan="8" class="py-5 text-center text-body-secondary">
                <app-empty-state
                  [title]="emptyStateTitle"
                  [message]="emptyStateMessage"
                  icon="cilCalendar"
                ></app-empty-state>
              </td>
            </tr>
          } @else {
            @for (cita of items; track cita.fecha + cita.hora + cita.paciente) {
              <tr (click)="openView.emit(cita)" role="button" [cTooltip]="cita.notes || ''">
                <td class="ps-4">
                  <input
                    cFormCheckInput
                    type="checkbox"
                    [checked]="isSelected(cita)"
                    (click)="$event.stopPropagation()"
                    (change)="toggleSelection.emit({ cita, event: $event })"
                    aria-label="Seleccionar cita"
                  >
                </td>
                <td class="ps-4 fw-semibold">{{ cita.paciente }}</td>
                <td>{{ cita.fecha | dateLabel }}</td>
                <td>{{ cita.hora | hourRange:cita.horaFin }}</td>
                <td>{{ cita.especialista }}</td>
                <td>{{ getAuditLabel(cita.createdBy) }}</td>
                <td class="text-center pe-4">
                  @if (hasConflict(cita)) {
                    <svg
                      cIcon
                      name="cilWarning"
                      class="me-1 text-danger"
                      cTooltip="Conflicto de horario"
                      aria-label="Conflicto de horario"
                    ></svg>
                  }
                  <c-badge [color]="getEstadoColor(cita.estado)" shape="rounded-pill">
                    {{ cita.estado }}
                  </c-badge>
                </td>
                <td class="text-end pe-4">
                  @if (cita.estado === 'Cancelada') {
                    <button
                      cButton
                      color="secondary"
                      size="sm"
                      variant="ghost"
                      class="me-1 action-icon-button"
                      cTooltip="Restaurar"
                      aria-label="Restaurar cita"
                      (click)="$event.stopPropagation(); confirmRestore.emit(cita)"
                    >
                      <svg cIcon name="cilActionUndo" size="sm" class="citas-restore-icon"></svg>
                    </button>
                  } @else {
                    <button
                      cButton
                      color="danger"
                      size="sm"
                      variant="ghost"
                      class="me-1 action-icon-button"
                      cTooltip="Cancelar"
                      aria-label="Cancelar cita"
                      (click)="$event.stopPropagation(); confirmCancel.emit(cita)"
                    >
                      <svg cIcon name="cilReportSlash" size="sm"></svg>
                    </button>
                    <button
                      cButton
                      color="secondary"
                      size="sm"
                      variant="ghost"
                      class="action-icon-button"
                      cTooltip="Editar"
                      aria-label="Editar cita"
                      (click)="$event.stopPropagation(); openEdit.emit(cita)"
                    >
                      <svg cIcon name="cilPencil" size="sm"></svg>
                    </button>
                  }
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
      <div class="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center p-3">
        <div class="d-flex flex-column flex-sm-row align-items-sm-center gap-3 small">
          <span class="text-body-secondary">
            Mostrando {{ displayStart }} - {{ displayEnd }} de {{ totalElements }}
          </span>
          <span class="d-none d-sm-block vr"></span>
          <div class="d-flex align-items-center gap-2">
            <span class="text-body-secondary">Filas</span>
            <select cFormControl class="form-select form-select-sm" aria-label="Filas por pagina" (change)="setPageSize.emit($event)">
              @for (size of pageSizeOptions; track size) {
                <option [value]="size" [selected]="size === pageSize">{{ size }}</option>
              }
            </select>
          </div>
        </div>
        <c-pagination aria-label="Paginacion de citas" size="sm" class="mb-0">
          <c-page-item [disabled]="page === 1">
            <a cPageLink (click)="setPage.emit(page - 1)">Anterior</a>
          </c-page-item>
          @for (numero of pages; track numero) {
            <c-page-item [active]="page === numero">
              <a cPageLink (click)="setPage.emit(numero)">{{ numero }}</a>
            </c-page-item>
          }
          <c-page-item [disabled]="page === totalPages">
            <a cPageLink (click)="setPage.emit(page + 1)">Siguiente</a>
          </c-page-item>
        </c-pagination>
      </div>
    }
  `
})
export class AppointmentsTableComponent {
  @Input() items: AppointmentListItem[] = [];
  @Input() isLoading = false;
  @Input() isEmpty = false;
  @Input() emptyStateTitle = 'Sin resultados';
  @Input() emptyStateMessage = 'No hay datos para mostrar.';
  @Input() isAllSelected = false;
  @Input() sortKey: 'paciente' | 'fecha' | 'hora' | 'especialista' | 'estado' | null = null;
  @Input() sortDir: 'asc' | 'desc' = 'asc';
  @Input() displayStart = 0;
  @Input() displayEnd = 0;
  @Input() totalElements = 0;
  @Input() pageSizeOptions: number[] = [];
  @Input() pageSize = 10;
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() pages: number[] = [];
  @Input() getEstadoColor: (estado: AppointmentEstadoLabel) => string = () => 'secondary';
  @Input() getAuditLabel: (userId?: string | null) => string = () => '';
  @Input() isSelected: (cita: AppointmentListItem) => boolean = () => false;
  @Input() hasConflict: (cita: AppointmentListItem) => boolean = () => false;

  @Output() toggleSelectAll = new EventEmitter<Event>();
  @Output() toggleSelection = new EventEmitter<{ cita: AppointmentListItem; event: Event }>();
  @Output() toggleSort = new EventEmitter<'paciente' | 'fecha' | 'hora' | 'especialista' | 'estado'>();
  @Output() openView = new EventEmitter<AppointmentListItem>();
  @Output() openEdit = new EventEmitter<AppointmentListItem>();
  @Output() confirmCancel = new EventEmitter<AppointmentListItem>();
  @Output() confirmRestore = new EventEmitter<AppointmentListItem>();
  @Output() setPage = new EventEmitter<number>();
  @Output() setPageSize = new EventEmitter<Event>();
}
