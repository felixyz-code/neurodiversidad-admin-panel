import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import {
  BadgeComponent,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckComponent,
  FormCheckInputDirective,
  FormCheckLabelDirective,
  FormControlDirective,
  FormFloatingDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective,
  RowComponent,
  SpinnerComponent,
  TooltipDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { NgSelectModule } from '@ng-select/ng-select';

import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { HourRangePipe } from '../../shared/pipes/hour-range.pipe';
import { AppointmentsToolbarComponent } from '../../shared/appointments/components/appointments-toolbar/appointments-toolbar.component';
import { AppointmentsTableComponent } from '../../shared/appointments/components/appointments-table/appointments-table.component';
import { AppointmentsFacade } from '../../shared/appointments/appointments.facade';
import { AuthService } from '../../services/auth.service';
import { CitasComponent } from '../citas/citas.component';

@Component({
  templateUrl: '../citas/citas.component.html',
  styleUrls: ['../citas/citas.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    BadgeComponent,
    ButtonDirective,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    FormControlDirective,
    FormFloatingDirective,
    IconDirective,
    NgSelectModule,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective,
    SpinnerComponent,
    LoadingStateComponent,
    DateLabelPipe,
    HourRangePipe,
    AppointmentsToolbarComponent,
    AppointmentsTableComponent,
    TooltipDirective
  ]
})
export class SesionesComponent extends CitasComponent {
  @ViewChild('calendarScroll') override calendarScroll?: ElementRef<HTMLDivElement>;
  override pageTitle = 'Sesiones';
  override specialtyFilter = 'FISIOTERAPIA';

  constructor(
    appointmentsFacade: AppointmentsFacade,
    authService: AuthService,
    cdr: ChangeDetectorRef,
    ngZone: NgZone
  ) {
    super(appointmentsFacade, authService, cdr, ngZone);
  }
}
