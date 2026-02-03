import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

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
  PaginationModule,
  RowComponent,
  SpinnerComponent,
  TableDirective,
  TooltipDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { NgSelectModule } from '@ng-select/ng-select';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { DateLabelPipe } from '../../shared/pipes/date-label.pipe';
import { HourRangePipe } from '../../shared/pipes/hour-range.pipe';
import { AppointmentsToolbarComponent } from '../../shared/appointments/components/appointments-toolbar/appointments-toolbar.component';
import { AppointmentsTableComponent } from '../../shared/appointments/components/appointments-table/appointments-table.component';
import { AppointmentsFacade } from '../../shared/appointments/appointments.facade';
import {
  AppointmentDto,
  AppointmentPage,
  AppointmentQueryParams,
  AppointmentStatus,
  UpdateAppointmentRequest
} from '../../models/appointments.models';
import { PatientDto } from '../../models/patients.models';
import { SpecialistDto } from '../../models/staff.models';
import { AuthService, AuthUser } from '../../services/auth.service';
import { ResolvedUserRef } from '../../models/users.models';
import { forkJoin } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';
import {
  AppointmentEstadoLabel,
  AppointmentListItem
} from '../../shared/appointments/appointments.view-models';
import { buildSortParams, isServerSortable, SortKeyMap } from '../../shared/utils/sort-params';

type EstadoCita = AppointmentEstadoLabel;
type Cita = AppointmentListItem;

interface PatientOption extends PatientDto {
  isNew?: boolean;
}

interface CalendarDay {
  date: string;
  label: string;
  isToday: boolean;
}

interface CalendarItem {
  cita: Cita;
  top: number;
  height: number;
  label: string;
  timeLabel: string;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columns: number;
  left: string;
  width: string;
}

interface AgendaWeekGroup {
  date: string;
  label: string;
  items: Cita[];
}

interface AgendaMonthDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  total: number;
  statusCounts: Record<AppointmentStatus, number>;
}

@Component({
  templateUrl: './citas.component.html',
  styleUrls: ['./citas.component.scss'],
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
export class CitasComponent implements OnInit {
  private fb = new FormBuilder();
  @ViewChild('calendarScroll') calendarScroll?: ElementRef<HTMLDivElement>;

  pageTitle = 'Citas';
  specialtyFilter: string | null = null;

  citas: Cita[] = [];

  especialistas: SpecialistDto[] = [];
  pacientes: PatientOption[] = [];
  isSpecialistsLoading = false;
  isPatientsLoading = false;
  isLoading = false;
  auditUserMap: Record<string, ResolvedUserRef> = {};
  specialtyMap: Record<string, string> = {};
  viewModalVisible = false;
  viewingCita: Cita | null = null;
  editModalVisible = false;
  editingCita: Cita | null = null;
  isEditSaving = false;
  editValidationError = '';
  cancelModalVisible = false;
  cancelingCita: Cita | null = null;
  isCancelSaving = false;
  cancelConfirmChecked = false;
  cancelReasonType: 'cancel' | 'no-show' = 'cancel';
  cancelReasonText = '';
  cancelValidationError = '';
  restoreModalVisible = false;
  restoringCita: Cita | null = null;
  isRestoreSaving = false;
  restoreConfirmChecked = false;
  private editInitialValue: {
    fecha: string;
    hora: string;
    especialistaId: string | null;
    durationMinutes: number;
    status: AppointmentStatus;
    notes: string;
  } | null = null;
  statusFilter: AppointmentStatus | 'ALL' = 'PENDING';
  dateFrom = '';
  dateTo = '';
  filterText = '';
  sortKey: 'paciente' | 'fecha' | 'hora' | 'especialista' | 'estado' | null = 'fecha';
  sortDir: 'asc' | 'desc' = 'asc';
  private readonly sortFieldMap: SortKeyMap = {
    fecha: 'startAt',
    hora: 'startAt',
    estado: 'status'
  };

  modalVisible = false;
  isSaving = false;
  createValidationError = '';
  createTimeAdjusted = false;
  editTimeAdjusted = false;
  selectedCitaIds = new Set<string>();
  bulkModalVisible = false;
  bulkSaving = false;
  bulkValidationError = '';
  bulkTimeAdjusted = false;
  conflictModalVisible = false;
  conflictConfirmChecked = false;
  calendarDragError = '';
  calendarDropDate: string | null = null;
  private draggingCita: Cita | null = null;
  pendingCreateContext: { formValue: any; isNewPatient: boolean } | null = null;
  pendingEditContext: { id: string; payload: UpdateAppointmentRequest } | null = null;
  viewMode: 'table' | 'calendar' | 'agenda' = 'table';
  calendarMode: 'week' | 'day' = 'week';
  calendarDate = '';
  calendarDays: CalendarDay[] = [];
  calendarSelectedDays = new Set<number>([1, 2, 3, 4, 5, 6, 0]);
  calendarHours: number[] = [];
  calendarRangeLabel = '';
  calendarStartMinutes = 7 * 60;
  calendarEndMinutes = 20 * 60;
  calendarMinuteHeight = 1;
  calendarPageSize = 200;
  conflictCitaIds = new Set<string>();
  selectedSpecialistId = '';
  allowedSpecialistIds: string[] | null = null;
  isSpecialistFilterLocked = false;
  showSpecialistFilter = true;
  hideSpecialistSelect = false;
  private currentUser: AuthUser | null = null;
  agendaMode: 'day' | 'week' | 'month' = 'day';
  agendaDate = '';
  agendaRangeLabel = '';
  monthDayModalVisible = false;
  monthDayDate = '';
  isExportingPdf = false;
  isExportingData = false;

  citaForm: FormGroup = this.fb.group({
    pacienteId: [null, [Validators.required]],
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]],
    especialistaId: [null, [Validators.required]],
    durationMinutes: [60, [Validators.required, Validators.min(15), Validators.max(240)]],
    notes: [''],
    status: ['PENDING', [Validators.required]]
  });

  editForm: FormGroup = this.fb.group({
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]],
    especialistaId: [null, [Validators.required]],
    durationMinutes: [60, [Validators.required, Validators.min(15), Validators.max(240)]],
    status: ['PENDING', [Validators.required]],
    notes: ['']
  });
  bulkForm: FormGroup = this.fb.group({
    fecha: [''],
    hora: [''],
    status: ['']
  });

  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50, 100];
  page = 1;
  totalElements = 0;
  totalPages = 1;

  constructor(
    private appointmentsFacade: AppointmentsFacade,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    const now = new Date();
    const todayString = this.formatDate(now);
    this.applyDefaultMonthRange(now);
    this.calendarDate = todayString;
    this.agendaDate = todayString;
    const nextSlot = this.getNextSlotTime(now);
    this.citaForm.patchValue({
      fecha: todayString,
      hora: nextSlot
    });
  }

  ngOnInit(): void {
    this.initializeUserScope();
    this.loadSpecialists();
    this.loadPatients('');
    if (!this.specialtyFilter) {
      this.applyDefaultMonthRange();
      this.loadAppointments(1);
    }
    if (this.viewMode === 'calendar') {
      this.updateCalendarRange();
    }
    if (this.viewMode === 'agenda') {
      this.updateAgendaRange();
    }
  }

  get pages(): number[] {
    return Array.from({ length: Math.max(1, this.totalPages) }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.totalElements ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalElements);
  }

  get statusLabel(): string {
    if (this.statusFilter === 'PENDING') {
      return 'pendientes';
    }
    if (this.statusFilter === 'CONFIRMED') {
      return 'confirmadas';
    }
    if (this.statusFilter === 'COMPLETED') {
      return 'finalizadas';
    }
    if (this.statusFilter === 'CANCELED') {
      return 'canceladas';
    }
    return 'todas';
  }

  get emptyStateTitle(): string {
    return 'Sin resultados';
  }

  get emptyStateMessage(): string {
    if (this.filterText.trim()) {
      return 'No hay resultados para el filtro actual.';
    }
    if (this.statusFilter === 'ALL') {
      return 'No hay citas para mostrar.';
    }
    return `No hay citas ${this.statusLabel} para mostrar.`;
  }

  get sortedCitas(): Cita[] {
    const items = [...this.citas];
    if (!this.sortKey || isServerSortable(this.sortKey, this.sortFieldMap)) {
      return items;
    }
    return items.sort((a, b) => this.compareCitas(a, b, this.sortKey!, this.sortDir));
  }

  get tableCitas(): Cita[] {
    if (this.viewMode !== 'table') {
      return this.sortedCitas;
    }
    return this.sortedCitas.slice(0, this.pageSize);
  }

  get agendaItems(): Cita[] {
    return [...this.citas].sort((a, b) => a.hora.localeCompare(b.hora, 'es', { numeric: true }));
  }

  get agendaWeekGroups(): AgendaWeekGroup[] {
    if (this.agendaMode !== 'week') {
      return [];
    }
    return this.buildAgendaWeekGroups();
  }

  get agendaMonthDays(): AgendaMonthDay[] {
    if (this.agendaMode !== 'month') {
      return [];
    }
    return this.buildAgendaMonthDays();
  }

  get monthDayItems(): Cita[] {
    if (!this.monthDayDate) {
      return [];
    }
    return this.citas
      .filter((cita) => cita.fecha === this.monthDayDate)
      .sort((a, b) => a.hora.localeCompare(b.hora, 'es', { numeric: true }));
  }

  get selectedCount(): number {
    return this.selectedCitaIds.size;
  }

  get isAllSelected(): boolean {
    if (!this.citas.length) {
      return false;
    }
    return this.citas.every((cita) => !!cita.id && this.selectedCitaIds.has(cita.id));
  }

  setPage(page: number): void {
    if (page < 1 || page > Math.max(1, this.totalPages)) {
      return;
    }
    this.loadAppointments(page);
  }

  setStatusFilter(status: AppointmentStatus | 'ALL'): void {
    if (this.statusFilter === status) {
      return;
    }
    this.statusFilter = status;
    this.cdr.detectChanges();
    this.loadAppointments(1);
  }

  setViewMode(mode: 'table' | 'calendar' | 'agenda'): void {
    if (this.viewMode === mode) {
      return;
    }
    this.viewMode = mode;
    this.statusFilter = mode === 'table' ? 'PENDING' : 'ALL';
    if (mode === 'table') {
      this.applyDefaultMonthRange();
    }
    if (mode === 'calendar') {
      this.updateCalendarRange();
    }
    if (mode === 'agenda') {
      this.agendaMode = 'day';
      this.agendaDate = this.formatDate(new Date());
      this.updateAgendaRange();
    }
    this.cdr.detectChanges();
    this.loadAppointments(1);
  }

  setCalendarMode(mode: 'week' | 'day'): void {
    if (this.calendarMode === mode) {
      return;
    }
    this.calendarMode = mode;
    if (mode === 'day') {
      this.calendarSelectedDays = new Set<number>([this.getWeekdayNumber(this.parseDate(this.calendarDate) ?? new Date())]);
    }
    this.updateCalendarRange();
    this.loadAppointments(1);
  }

  setAgendaMode(mode: 'day' | 'week' | 'month'): void {
    if (this.agendaMode === mode) {
      return;
    }
    this.agendaMode = mode;
    this.updateAgendaRange();
    this.loadAppointments(1);
  }

  goToAgendaToday(): void {
    this.agendaDate = this.formatDate(new Date());
    this.updateAgendaRange();
    this.loadAppointments(1);
  }

  shiftAgenda(direction: number): void {
    const current = this.parseDate(this.agendaDate);
    if (!current) {
      return;
    }
    const delta = this.agendaMode === 'month' ? current.getDate() : 1;
    if (this.agendaMode === 'week') {
      current.setDate(current.getDate() + 7 * direction);
    } else if (this.agendaMode === 'month') {
      current.setMonth(current.getMonth() + direction);
      current.setDate(1);
    } else {
      current.setDate(current.getDate() + delta * direction);
    }
    this.agendaDate = this.formatDate(current);
    this.updateAgendaRange();
    this.loadAppointments(1);
  }

  onMonthDayClick(day: AgendaMonthDay, event?: Event): void {
    event?.stopPropagation();
    this.monthDayDate = day.date;
    this.monthDayModalVisible = true;
  }

  onMonthDayDblClick(day: AgendaMonthDay, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
  }

  async exportAgendaPdf(): Promise<void> {
    if (this.isExportingPdf) {
      return;
    }
    this.isExportingPdf = true;
    try {
      const orientation = this.agendaMode === 'day' ? 'p' : 'l';
      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: 'letter'
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      pdf.setDrawColor(220, 220, 220);
      pdf.rect(margin - 8, margin - 8, contentWidth + 16, pageHeight - margin * 2 + 16, 'S');

      const title = this.getAgendaExportTitle();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(title, margin, margin);

      const metaLine = this.getAgendaExportMeta();
      if (metaLine) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(90, 98, 110);
        pdf.text(metaLine, margin, margin + 16);
      }

      const tableStartY = margin + 32;
      const { head, body } = this.buildAgendaTable();

      autoTable(pdf, {
        head: [head],
        body,
        startY: tableStartY,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 4
        },
        headStyles: {
          fillColor: [31, 41, 55],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        columnStyles: this.getAgendaColumnStyles()
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(120, 124, 132);
      pdf.text(`Generado ${this.formatDateTime(new Date().toISOString())}`, margin, pageHeight - margin + 12);
      pdf.save(this.getAgendaPdfFileName());
    } catch (error) {
      console.error('Error exporting agenda PDF', error);
    } finally {
      this.isExportingPdf = false;
    }
  }

  async exportCitas(format: 'excel'): Promise<void> {
    if (this.isExportingData) {
      return;
    }
    this.isExportingData = true;
    try {
      const { headers, rows } = this.buildCitasExportRows();
      const exceljs = await import('exceljs');
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Citas');
      const widths = this.getCitasExcelColumnWidths(headers, rows);
      worksheet.columns = headers.map((header, index) => ({
        header,
        key: `col${index}`,
        width: widths[index] ?? Math.min(45, Math.max(12, header.length + 4))
      }));
      worksheet.getRow(1).font = { bold: true };
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
      };
      rows.forEach((row) => worksheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      this.downloadBlob(blob, this.buildCitasExportFileName('xlsx'));
    } catch (error) {
      console.error('Error exporting citas', error);
    } finally {
      this.isExportingData = false;
      this.cdr.detectChanges();
    }
  }

  async exportCitasPdf(): Promise<void> {
    if (this.isExportingData) {
      return;
    }
    this.isExportingData = true;
    try {
      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'pt',
        format: 'letter'
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      pdf.setDrawColor(220, 220, 220);
      pdf.rect(margin - 8, margin - 8, contentWidth + 16, pageHeight - margin * 2 + 16, 'S');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Listado de citas', margin, margin);

      const metaLine = this.getAgendaExportMeta();
      const range = this.dateFrom && this.dateTo ? `${this.dateFrom} - ${this.dateTo}` : '';
      const subtitleParts = [metaLine, range ? `Rango: ${range}` : ''].filter(Boolean);
      if (subtitleParts.length) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(90, 98, 110);
        pdf.text(subtitleParts.join(' | '), margin, margin + 16);
      }

      const { headers, rows } = this.buildCitasExportRows();
      autoTable(pdf, {
        head: [headers],
        body: rows,
        startY: margin + 32,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 4
        },
        headStyles: {
          fillColor: [31, 41, 55],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        }
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(120, 124, 132);
      pdf.text(`Generado ${this.formatDateTime(new Date().toISOString())}`, margin, pageHeight - margin + 12);

      pdf.save(this.buildCitasExportFileName('pdf'));
    } catch (error) {
      console.error('Error exporting citas PDF', error);
    } finally {
      this.isExportingData = false;
      this.cdr.detectChanges();
    }
  }

  toggleMonthDayModal(value: boolean): void {
    this.monthDayModalVisible = value;
    if (!value) {
      this.monthDayDate = '';
    }
  }

  goToToday(): void {
    this.calendarDate = this.formatDate(new Date());
    if (this.calendarMode === 'day') {
      this.calendarSelectedDays = new Set<number>([this.getWeekdayNumber(new Date())]);
    }
    this.updateCalendarRange();
    this.loadAppointments(1);
  }

  shiftCalendar(direction: number): void {
    const current = this.parseDate(this.calendarDate);
    if (!current) {
      return;
    }
    const delta = this.calendarMode === 'week' ? 7 : 1;
    current.setDate(current.getDate() + delta * direction);
    this.calendarDate = this.formatDate(current);
    if (this.calendarMode === 'day') {
      this.calendarSelectedDays = new Set<number>([this.getWeekdayNumber(current)]);
    }
    this.updateCalendarRange();
    this.loadAppointments(1);
  }

  toggleCalendarDay(day: number): void {
    if (this.calendarMode !== 'week') {
      return;
    }
    if (this.calendarSelectedDays.has(day)) {
      if (this.calendarSelectedDays.size === 1) {
        return;
      }
      this.calendarSelectedDays.delete(day);
    } else {
      this.calendarSelectedDays.add(day);
    }
    this.updateCalendarRange();
    this.loadAppointments(1);
  }

  isCalendarDaySelected(day: number): boolean {
    return this.calendarSelectedDays.has(day);
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AppointmentStatus | 'ALL';
    this.setStatusFilter(value);
  }

  onSpecialistFilterChange(event: Event): void {
    if (this.isSpecialistFilterLocked) {
      return;
    }
    this.selectedSpecialistId = (event.target as HTMLSelectElement).value;
    this.loadAppointments(1);
  }

  setPageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize = value;
    this.loadAppointments(1);
  }

  toggleSort(key: 'paciente' | 'fecha' | 'hora' | 'especialista' | 'estado'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.page = 1;
    if (isServerSortable(this.sortKey, this.sortFieldMap)) {
      this.loadAppointments(1);
    }
  }

  onDateChange(): void {
    if (this.viewMode === 'calendar') {
      this.calendarDate = this.dateFrom || this.formatDate(new Date());
      this.updateCalendarRange();
    }
    this.loadAppointments(1);
  }

  onFilterChange(event: Event): void {
    this.filterText = (event.target as HTMLInputElement).value;
    this.loadAppointments(1);
  }

  onFilterTextChange(value: string): void {
    this.filterText = value;
    this.loadAppointments(1);
  }

  onStatusFilterValueChange(value: AppointmentStatus | 'ALL'): void {
    this.setStatusFilter(value);
  }

  onSpecialistFilterValueChange(value: string): void {
    if (this.isSpecialistFilterLocked) {
      return;
    }
    this.selectedSpecialistId = value;
    this.loadAppointments(1);
  }

  onDateFromChange(value: string): void {
    this.dateFrom = value;
    this.onDateChange();
  }

  onDateToChange(value: string): void {
    this.dateTo = value;
    this.onDateChange();
  }

  toggleModal(value: boolean): void {
    this.modalVisible = value;
    const now = new Date();
    if (value) {
      this.citaForm.patchValue({
        fecha: this.formatDate(now),
        hora: this.getNextSlotTime(now),
        especialistaId: this.getDefaultCreateSpecialistId()
      });
      this.syncCreateSpecialistControl();
      this.createValidationError = '';
      this.createTimeAdjusted = false;
      return;
    }
    this.citaForm.reset({
      pacienteId: null,
      fecha: this.formatDate(now),
      hora: this.getNextSlotTime(now),
      especialistaId: this.getDefaultCreateSpecialistId(),
      durationMinutes: 60,
      notes: '',
      status: 'PENDING'
    });
    this.syncCreateSpecialistControl();
    this.createValidationError = '';
    this.createTimeAdjusted = false;
  }

  submit(): void {
    if (this.citaForm.invalid) {
      this.citaForm.markAllAsTouched();
      return;
    }

    if (this.isSaving) {
      return;
    }

    this.createValidationError = '';
    const formValue = this.citaForm.getRawValue();
    if (this.isStartAtInPast(formValue.fecha, formValue.hora)) {
      this.createValidationError = 'Selecciona una hora posterior a la actual.';
      return;
    }
    const patientId = formValue.pacienteId as string | null;
    const isNewPatient = !!patientId && patientId.startsWith('NEW:');

    if (this.hasConflictForSlot(
      formValue.especialistaId,
      formValue.fecha,
      formValue.hora,
      Number(formValue.durationMinutes)
    )) {
      this.pendingCreateContext = { formValue, isNewPatient };
      this.openConflictModal();
      return;
    }

    this.executeCreate(formValue, isNewPatient);
  }

  confirmCancel(cita: Cita): void {
    this.cancelingCita = cita;
    this.cancelConfirmChecked = false;
    this.cancelReasonType = 'cancel';
    this.cancelReasonText = '';
    this.cancelValidationError = '';
    this.cancelModalVisible = true;
  }

  toggleCancelModal(value: boolean): void {
    this.cancelModalVisible = value;
    if (!value) {
      this.cancelingCita = null;
      this.isCancelSaving = false;
      this.cancelConfirmChecked = false;
      this.cancelReasonType = 'cancel';
      this.cancelReasonText = '';
      this.cancelValidationError = '';
    }
  }

  submitCancel(): void {
    if (!this.cancelingCita?.id || this.isCancelSaving || !this.cancelConfirmChecked) {
      return;
    }
    const reasonText = this.cancelReasonText.trim();
    if (!reasonText) {
      this.cancelValidationError = 'Indica el motivo para continuar.';
      return;
    }
    this.isCancelSaving = true;
    const notes = this.buildCancelNotes(this.cancelingCita.notes, this.cancelReasonType, reasonText);
    this.appointmentsFacade.updateAppointment(this.cancelingCita.id, { status: 'CANCELED', notes }).subscribe({
      next: (updated) => {
        if (this.statusFilter === 'CANCELED') {
          this.citas = this.citas.map((cita) => (cita.id === updated.id ? this.mapCita(updated) : cita));
        } else {
          this.citas = this.citas.filter((cita) => cita.id !== updated.id);
          this.totalElements = Math.max(0, this.totalElements - 1);
          this.selectedCitaIds.delete(updated.id);
        }
        this.resolveAuditUsers([updated.updatedBy]);
        this.updateConflictMap();
        this.isCancelSaving = false;
        this.toggleCancelModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error canceling appointment', error);
        this.isCancelSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmRestore(cita: Cita): void {
    this.restoringCita = cita;
    this.restoreConfirmChecked = false;
    this.restoreModalVisible = true;
  }

  toggleRestoreModal(value: boolean): void {
    this.restoreModalVisible = value;
    if (!value) {
      this.restoringCita = null;
      this.isRestoreSaving = false;
      this.restoreConfirmChecked = false;
    }
  }

  submitRestore(): void {
    if (!this.restoringCita?.id || this.isRestoreSaving || !this.restoreConfirmChecked) {
      return;
    }
    this.isRestoreSaving = true;
    const cleanedNotes = this.stripCancelNotes(this.restoringCita.notes);
    this.appointmentsFacade.updateAppointment(this.restoringCita.id, { status: 'PENDING', notes: cleanedNotes }).subscribe({
      next: (updated) => {
        if (this.statusFilter === 'CANCELED') {
          this.citas = this.citas.filter((cita) => cita.id !== updated.id);
          this.totalElements = Math.max(0, this.totalElements - 1);
          this.selectedCitaIds.delete(updated.id);
        } else {
          const mapped = this.mapCita(updated);
          this.citas = this.citas.map((cita) => (cita.id === mapped.id ? mapped : cita));
        }
        this.resolveAuditUsers([updated.updatedBy]);
        this.updateConflictMap();
        this.isRestoreSaving = false;
        this.toggleRestoreModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error restoring appointment', error);
        this.isRestoreSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleConflictModal(value: boolean): void {
    this.conflictModalVisible = value;
    if (!value) {
      this.conflictConfirmChecked = false;
      this.pendingCreateContext = null;
      this.pendingEditContext = null;
    }
  }

  openConflictModal(): void {
    this.conflictConfirmChecked = false;
    this.conflictModalVisible = true;
  }

  confirmConflict(): void {
    if (!this.conflictConfirmChecked) {
      return;
    }
    const pendingCreate = this.pendingCreateContext;
    const pendingEdit = this.pendingEditContext;
    this.toggleConflictModal(false);

    if (pendingCreate) {
      this.executeCreate(pendingCreate.formValue, pendingCreate.isNewPatient);
      return;
    }
    if (pendingEdit) {
      this.executeEdit(pendingEdit.id, pendingEdit.payload);
    }
  }

  openEditModal(cita: Cita): void {
    this.editingCita = cita;
    this.editValidationError = '';
    this.editTimeAdjusted = false;
    this.editInitialValue = {
      fecha: cita.fecha,
      hora: cita.hora,
      especialistaId: cita.especialistaId ?? null,
      durationMinutes: cita.duracion ?? 60,
      status: cita.status ?? 'PENDING',
      notes: cita.notes ?? ''
    };
    this.editForm.reset({
      fecha: cita.fecha,
      hora: cita.hora,
      especialistaId: cita.especialistaId ?? null,
      durationMinutes: cita.duracion ?? 60,
      status: cita.status ?? 'PENDING',
      notes: cita.notes ?? ''
    });
    this.syncEditSpecialistControl();
    this.editModalVisible = true;
  }

  toggleEditModal(value: boolean): void {
    this.editModalVisible = value;
    if (!value) {
      this.editingCita = null;
      this.isEditSaving = false;
      this.editInitialValue = null;
      this.editValidationError = '';
      this.editTimeAdjusted = false;
    }
  }

  toggleBulkModal(value: boolean): void {
    this.bulkModalVisible = value;
    if (!value) {
      this.bulkSaving = false;
      this.bulkValidationError = '';
      this.bulkTimeAdjusted = false;
      this.bulkForm.reset({ fecha: '', hora: '', status: '' });
    }
  }

  openBulkModal(): void {
    if (!this.selectedCount) {
      return;
    }
    this.bulkValidationError = '';
    this.bulkTimeAdjusted = false;
    this.bulkForm.reset({ fecha: '', hora: '', status: '' });
    this.bulkModalVisible = true;
  }

  clearSelection(): void {
    this.selectedCitaIds.clear();
  }

  toggleSelectAll(event: Event): void {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.citas.forEach((cita) => {
        if (cita.id) {
          this.selectedCitaIds.add(cita.id);
        }
      });
    } else {
      this.citas.forEach((cita) => {
        if (cita.id) {
          this.selectedCitaIds.delete(cita.id);
        }
      });
    }
  }

  toggleSelection(cita: Cita, event: Event): void {
    event.stopPropagation();
    if (!cita.id) {
      return;
    }
    if (this.selectedCitaIds.has(cita.id)) {
      this.selectedCitaIds.delete(cita.id);
    } else {
      this.selectedCitaIds.add(cita.id);
    }
  }

  isSelected(cita: Cita): boolean {
    return !!cita.id && this.selectedCitaIds.has(cita.id);
  }

  submitBulkUpdate(): void {
    if (this.bulkSaving || !this.selectedCount) {
      return;
    }
    const { fecha, hora, status } = this.bulkForm.value;
    const hasDate = !!fecha;
    const hasTime = !!hora;
    const hasStatus = !!status;

    if (!hasStatus && !hasDate && !hasTime) {
      this.bulkValidationError = 'Selecciona un horario, un estado o ambos.';
      return;
    }
    if ((hasDate && !hasTime) || (!hasDate && hasTime)) {
      this.bulkValidationError = 'Selecciona fecha y hora para reprogramar.';
      return;
    }
    if (hasDate && hasTime && this.isStartAtInPast(fecha, hora)) {
      this.bulkValidationError = 'Selecciona una hora posterior a la actual.';
      return;
    }

    const payload: UpdateAppointmentRequest = {};
    if (hasStatus) {
      payload.status = status;
    }
    if (hasDate && hasTime) {
      payload.startAt = this.buildStartAt(fecha, hora);
    }

    const ids = Array.from(this.selectedCitaIds);
    this.bulkSaving = true;
    this.bulkValidationError = '';
    forkJoin(ids.map((id) => this.appointmentsFacade.updateAppointment(id, payload))).subscribe({
      next: (updatedList) => {
        const updatedMap = new Map(updatedList.map((updated) => [updated.id, this.mapCita(updated)]));
        this.citas = this.citas
          .map((cita) => updatedMap.get(cita.id ?? '') ?? cita)
          .filter((cita) => this.isStatusVisible(cita));
        this.updateConflictMap();
        this.clearSelection();
        this.bulkSaving = false;
        this.toggleBulkModal(false);
        this.cdr.detectChanges();
        this.loadAppointments(this.page);
      },
      error: (error) => {
        console.error('Error updating appointments in bulk', error);
        this.bulkSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  isBulkActionDisabled(): boolean {
    if (this.bulkSaving) {
      return true;
    }
    const { fecha, hora, status } = this.bulkForm.value;
    const hasDate = !!fecha;
    const hasTime = !!hora;
    const hasStatus = !!status;
    if (!hasStatus && !hasDate && !hasTime) {
      return true;
    }
    if ((hasDate && !hasTime) || (!hasDate && hasTime)) {
      return true;
    }
    if (hasDate && hasTime && this.isStartAtInPast(fecha, hora)) {
      return true;
    }
    return false;
  }

  submitEdit(): void {
    if (this.editForm.invalid || this.isEditSaving || !this.editingCita?.id) {
      this.editForm.markAllAsTouched();
      return;
    }

    if (!this.hasEditChanges()) {
      return;
    }

    const formValue = this.editForm.getRawValue();
    this.editValidationError = '';
    const startAtChanged = this.hasStartAtChanged();
    if (startAtChanged && this.isStartAtInPast(formValue.fecha, formValue.hora)) {
      this.editValidationError = 'Selecciona una hora posterior a la actual.';
      return;
    }

    const payload: UpdateAppointmentRequest = {
      specialistId: formValue.especialistaId,
      durationMinutes: Number(formValue.durationMinutes),
      status: formValue.status,
      notes: formValue.notes?.trim() || undefined
    };
    if (startAtChanged) {
      payload.startAt = this.buildStartAt(formValue.fecha, formValue.hora);
    }

    if (startAtChanged || this.hasSpecialistChanged()) {
      if (this.hasConflictForSlot(
        formValue.especialistaId,
        formValue.fecha,
        formValue.hora,
        Number(formValue.durationMinutes),
        this.editingCita.id
      )) {
        this.pendingEditContext = { id: this.editingCita.id, payload };
        this.openConflictModal();
        return;
      }
    }

    this.executeEdit(this.editingCita.id, payload);
  }

  private executeCreate(formValue: any, isNewPatient: boolean): void {
    const patientId = formValue.pacienteId as string | null;
    this.isSaving = true;
    if (isNewPatient) {
      const fullName = patientId?.replace(/^NEW:/, '').trim() ?? '';
      this.appointmentsFacade.createPatient({ fullName }).pipe(
        switchMap((createdPatient) => {
          this.pacientes = [createdPatient, ...this.pacientes];
          this.citaForm.patchValue({ pacienteId: createdPatient.id });
          const payload = this.buildAppointmentPayload({ ...formValue, pacienteId: createdPatient.id });
          return this.appointmentsFacade.createAppointment(payload);
        })
      ).subscribe({
        next: (created) => {
          this.citas = [...this.citas, this.mapCita(created)];
          this.updateConflictMap();
          this.isSaving = false;
          this.toggleModal(false);
        },
        error: (error) => {
          console.error('Error creating appointment with new patient', error);
          this.isSaving = false;
        }
      });
      return;
    }

    const payload = this.buildAppointmentPayload(formValue);
    this.appointmentsFacade.createAppointment(payload).subscribe({
      next: (created) => {
        this.citas = [...this.citas, this.mapCita(created)];
        this.totalElements += 1;
        this.resolveAuditUsers([created.createdBy, created.updatedBy]);
        this.updateConflictMap();
        this.isSaving = false;
        this.toggleModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating appointment', error);
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  private executeEdit(id: string, payload: UpdateAppointmentRequest): void {
    this.isEditSaving = true;
    this.appointmentsFacade.updateAppointment(id, payload).subscribe({
      next: (updated) => {
        const mapped = this.mapCita(updated);
        this.citas = this.citas.map((cita) => (cita.id === mapped.id ? mapped : cita));
        this.resolveAuditUsers([updated.updatedBy]);
        this.isEditSaving = false;
        this.toggleEditModal(false);
        this.cdr.detectChanges();
        this.loadAppointments(this.page);
      },
      error: (error) => {
        console.error('Error updating appointment', error);
        this.isEditSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  hasEditChanges(): boolean {
    if (!this.editInitialValue) {
      return false;
    }
    const current = this.editForm.getRawValue();
    const notes = current.notes ?? '';
    return current.fecha !== this.editInitialValue.fecha ||
      current.hora !== this.editInitialValue.hora ||
      (current.especialistaId ?? null) !== this.editInitialValue.especialistaId ||
      Number(current.durationMinutes) !== this.editInitialValue.durationMinutes ||
      current.status !== this.editInitialValue.status ||
      notes !== this.editInitialValue.notes;
  }

  hasStartAtChanged(): boolean {
    if (!this.editInitialValue) {
      return false;
    }
    const current = this.editForm.getRawValue();
    return current.fecha !== this.editInitialValue.fecha || current.hora !== this.editInitialValue.hora;
  }

  hasSpecialistChanged(): boolean {
    if (!this.editInitialValue) {
      return false;
    }
    const current = this.editForm.getRawValue();
    return (current.especialistaId ?? null) !== this.editInitialValue.especialistaId;
  }

  isStartAtInPast(date: string, time: string): boolean {
    if (!date || !time) {
      return false;
    }
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const start = new Date(year, month - 1, day, hour, minute, 0);
    if (Number.isNaN(start.getTime())) {
      return false;
    }
    return start.getTime() < Date.now();
  }

  openViewModal(cita: Cita): void {
    this.viewingCita = cita;
    this.resolveAuditUsers([cita.createdBy, cita.updatedBy]);
    this.viewModalVisible = true;
  }

  toggleViewModal(value: boolean): void {
    this.viewModalVisible = value;
    if (!value) {
      this.viewingCita = null;
    }
  }

  getEstadoColor(estado: EstadoCita): string {
    if (estado === 'Finalizada') {
      return 'success';
    }
    if (estado === 'Cancelada') {
      return 'danger';
    }
    if (estado === 'Confirmada') {
      return 'info';
    }
    return 'warning';
  }

  searchEspecialista = (term: string, item: SpecialistDto): boolean => {
    const normalizedTerm = this.normalizeSearch(term);
    if (!normalizedTerm) {
      return true;
    }
    return this.normalizeSearch(item.userName).includes(normalizedTerm);
  };

  isCalendarDraggable(cita: Cita): boolean {
    return !!cita.id && cita.status !== 'CANCELED';
  }

  searchPaciente = (term: string, item: PatientOption): boolean => {
    const normalizedTerm = this.normalizeSearch(term);
    if (!normalizedTerm) {
      return true;
    }
    return this.normalizeSearch(item.fullName).includes(normalizedTerm);
  };

  addPaciente = (nombre: string): PatientOption | null => {
    const trimmed = nombre.trim();
    if (!trimmed) {
      return null;
    }
    return {
      id: `NEW:${trimmed}`,
      fullName: trimmed,
      isNew: true
    };
  };

  onPatientSearch(term: string): void {
    this.loadPatients(term ?? '');
  }

  onCreateDateChange(): void {
    const selectedDate = this.citaForm.value.fecha;
    if (!selectedDate || !this.isSelectedDateToday(selectedDate)) {
      this.createTimeAdjusted = false;
      return;
    }
    const minTime = this.getNextSlotTime(new Date());
    const currentTime = this.citaForm.value.hora;
    if (!currentTime || this.compareTimes(currentTime, minTime) < 0) {
      this.citaForm.patchValue({ hora: minTime });
      this.createTimeAdjusted = true;
      this.createValidationError = '';
      return;
    }
    this.createTimeAdjusted = false;
  }

  onCreateTimeChange(): void {
    const selectedDate = this.citaForm.value.fecha;
    const currentTime = this.citaForm.value.hora;
    if (!selectedDate || !currentTime) {
      return;
    }
    if (!this.isSelectedDateToday(selectedDate)) {
      this.createTimeAdjusted = false;
      return;
    }
    const minTime = this.getNextSlotTime(new Date());
    if (this.compareTimes(currentTime, minTime) >= 0) {
      this.createTimeAdjusted = false;
      this.createValidationError = '';
    }
  }

  onEditDateChange(): void {
    const selectedDate = this.editForm.value.fecha;
    if (!selectedDate || !this.isSelectedDateToday(selectedDate)) {
      this.editTimeAdjusted = false;
      return;
    }
    const minTime = this.getNextSlotTime(new Date());
    const currentTime = this.editForm.value.hora;
    if (!currentTime || this.compareTimes(currentTime, minTime) < 0) {
      this.editForm.patchValue({ hora: minTime });
      this.editTimeAdjusted = true;
      this.editValidationError = '';
      return;
    }
    this.editTimeAdjusted = false;
  }

  onEditTimeChange(): void {
    const selectedDate = this.editForm.value.fecha;
    const currentTime = this.editForm.value.hora;
    if (!selectedDate || !currentTime) {
      return;
    }
    if (!this.isSelectedDateToday(selectedDate)) {
      this.editTimeAdjusted = false;
      return;
    }
    const minTime = this.getNextSlotTime(new Date());
    if (this.compareTimes(currentTime, minTime) >= 0) {
      this.editTimeAdjusted = false;
      this.editValidationError = '';
    }
  }

  onBulkDateChange(): void {
    const selectedDate = this.bulkForm.value.fecha;
    if (!selectedDate || !this.isSelectedDateToday(selectedDate)) {
      this.bulkTimeAdjusted = false;
      return;
    }
    const minTime = this.getNextSlotTime(new Date());
    const currentTime = this.bulkForm.value.hora;
    if (!currentTime || this.compareTimes(currentTime, minTime) < 0) {
      this.bulkForm.patchValue({ hora: minTime });
      this.bulkTimeAdjusted = true;
      this.bulkValidationError = '';
      return;
    }
    this.bulkTimeAdjusted = false;
  }

  onBulkTimeChange(): void {
    const selectedDate = this.bulkForm.value.fecha;
    const currentTime = this.bulkForm.value.hora;
    if (!selectedDate || !currentTime) {
      return;
    }
    if (!this.isSelectedDateToday(selectedDate)) {
      this.bulkTimeAdjusted = false;
      return;
    }
    const minTime = this.getNextSlotTime(new Date());
    if (this.compareTimes(currentTime, minTime) >= 0) {
      this.bulkTimeAdjusted = false;
      this.bulkValidationError = '';
    }
  }

  getCalendarDayItems(date: string): CalendarItem[] {
    const items = this.citas
      .filter((cita) => cita.fecha === date)
      .map((cita) => {
        const startMinutes = this.timeToMinutes(cita.hora);
        const duration = cita.duracion ?? 60;
        const endMinutes = cita.horaFin ? this.timeToMinutes(cita.horaFin) : startMinutes + duration;
        const top = (startMinutes - this.calendarStartMinutes) * this.calendarMinuteHeight;
        const height = Math.max(24, (endMinutes - startMinutes) * this.calendarMinuteHeight);
        return {
          cita,
          top,
          height,
          label: cita.paciente,
          timeLabel: `${cita.hora} - ${cita.horaFin || '-'}`,
          startMinutes,
          endMinutes,
          column: 0,
          columns: 1,
          left: 'calc(0% + 4px)',
          width: 'calc(100% - 8px)'
        };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

    if (!items.length) {
      return items;
    }

    const active: Array<{ endMinutes: number; column: number; item: CalendarItem }> = [];
    let groupItems: CalendarItem[] = [];
    let groupMaxColumns = 1;

    const finalizeGroup = (): void => {
      if (!groupItems.length) {
        return;
      }
      const width = 100 / groupMaxColumns;
      groupItems.forEach((item) => {
        item.columns = groupMaxColumns;
        item.width = `calc(${width}% - 8px)`;
        item.left = `calc(${item.column * width}% + 4px)`;
      });
      groupItems = [];
      groupMaxColumns = 1;
    };

    items.forEach((item) => {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].endMinutes <= item.startMinutes) {
          active.splice(i, 1);
        }
      }

      if (!active.length) {
        finalizeGroup();
      }

      const used = new Set(active.map((entry) => entry.column));
      let column = 0;
      while (used.has(column)) {
        column += 1;
      }
      item.column = column;
      groupItems.push(item);
      active.push({ endMinutes: item.endMinutes, column, item });
      groupMaxColumns = Math.max(groupMaxColumns, active.length, column + 1);
    });

    finalizeGroup();
    return items.sort((a, b) => a.top - b.top);
  }

  formatHourLabel(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    return `${String(hour).padStart(2, '0')}:00`;
  }

  onCalendarDragStart(event: DragEvent, cita: Cita): void {
    if (!this.isCalendarDraggable(cita)) {
      event.preventDefault();
      return;
    }
    this.calendarDragError = '';
    this.draggingCita = cita;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', cita.id ?? '');
    }
  }

  onCalendarDragEnter(dayDate: string): void {
    if (!this.draggingCita) {
      return;
    }
    this.calendarDropDate = dayDate;
  }

  onCalendarDragLeave(dayDate: string): void {
    if (this.calendarDropDate === dayDate) {
      this.calendarDropDate = null;
    }
  }

  onCalendarDragOver(event: DragEvent): void {
    if (!this.draggingCita) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onCalendarDrop(event: DragEvent, dayDate: string): void {
    event.preventDefault();
    const cita = this.draggingCita;
    if (!cita?.id) {
      this.resetCalendarDrag();
      return;
    }

    const duration = cita.duracion ?? 60;
    const dropTime = this.getCalendarDropTime(event, duration);
    if (!dropTime) {
      this.resetCalendarDrag();
      return;
    }

    if (dayDate === cita.fecha && dropTime === cita.hora) {
      this.resetCalendarDrag();
      return;
    }

    if (this.isStartAtInPast(dayDate, dropTime)) {
      this.calendarDragError = 'Selecciona una hora posterior a la actual.';
      this.resetCalendarDrag();
      return;
    }

    if (this.hasConflictForSlot(cita.especialistaId, dayDate, dropTime, duration, cita.id)) {
      this.pendingEditContext = {
        id: cita.id,
        payload: { startAt: this.buildStartAt(dayDate, dropTime) }
      };
      this.openConflictModal();
      this.resetCalendarDrag();
      return;
    }

    this.executeEdit(cita.id, { startAt: this.buildStartAt(dayDate, dropTime) });
    this.resetCalendarDrag();
  }

  onCalendarDragEnd(): void {
    this.resetCalendarDrag();
  }

  onCancelReasonTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    this.cancelReasonType = target.value as 'cancel' | 'no-show';
    this.cancelValidationError = '';
  }

  onCancelReasonTextChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) {
      return;
    }
    this.cancelReasonText = target.value;
    this.cancelValidationError = '';
  }

  getCalendarEventClasses(cita: Cita): Record<string, boolean> {
      return {
        'calendar-event': true,
        'calendar-event--pending': cita.status === 'PENDING',
        'calendar-event--confirmed': cita.status === 'CONFIRMED',
        'calendar-event--completed': cita.status === 'COMPLETED',
        'calendar-event--canceled': cita.status === 'CANCELED',
        'calendar-event--conflict': this.hasConflict(cita),
        'calendar-event--dragging': this.draggingCita?.id === cita.id
      };
  }

  getCalendarTooltip(item: CalendarItem): string {
    const notes = item.cita.notes?.trim();
    const details = notes ? ` - ${notes}` : '';
    return `${item.timeLabel} | ${item.label}${details}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day, 0, 0, 0);
  }

  private updateCalendarRange(): void {
    const base = this.parseDate(this.calendarDate) ?? new Date();
    const today = this.formatDate(new Date());
    if (this.calendarMode === 'day') {
      const dateStr = this.formatDate(base);
      this.dateFrom = dateStr;
      this.dateTo = dateStr;
      this.calendarDays = [{
        date: dateStr,
        label: this.formatCalendarDayLabel(base, this.calendarMode),
        isToday: dateStr === today
      }];
      this.calendarRangeLabel = this.formatRangeLabel(base, base);
      return;
    }

    const start = this.getStartOfWeek(base);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    this.dateFrom = this.formatDate(start);
    this.dateTo = this.formatDate(end);
    const allDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dateStr = this.formatDate(day);
      return {
        date: dateStr,
        label: this.formatCalendarDayLabel(day, this.calendarMode),
        isToday: dateStr === today
      };
    });
    this.calendarDays = allDays.filter((_, index) => this.calendarSelectedDays.has(this.getWeekdayNumberByIndex(index)));
    this.calendarRangeLabel = this.formatRangeLabel(start, end);
  }

  private updateAgendaRange(): void {
    const base = this.parseDate(this.agendaDate) ?? new Date();
    if (this.agendaMode === 'day') {
      const dateStr = this.formatDate(base);
      this.dateFrom = dateStr;
      this.dateTo = dateStr;
      this.agendaRangeLabel = this.formatRangeLabel(base, base);
      return;
    }
    if (this.agendaMode === 'week') {
      const start = this.getStartOfWeek(base);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      this.dateFrom = this.formatDate(start);
      this.dateTo = this.formatDate(end);
      this.agendaRangeLabel = this.formatRangeLabel(start, end);
      return;
    }
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    this.dateFrom = this.formatDate(start);
    this.dateTo = this.formatDate(end);
    this.agendaRangeLabel = start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }

  private buildAgendaWeekGroups(): AgendaWeekGroup[] {
    const start = this.parseDate(this.dateFrom);
    if (!start) {
      return [];
    }
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dateStr = this.formatDate(day);
      const items = this.citas
        .filter((cita) => cita.fecha === dateStr)
        .sort((a, b) => a.hora.localeCompare(b.hora, 'es', { numeric: true }));
      return {
        date: dateStr,
        label: this.formatCalendarDayLabel(day, 'day'),
        items
      };
    });
  }

  private buildAgendaMonthDays(): AgendaMonthDay[] {
    const base = this.parseDate(this.agendaDate);
    if (!base) {
      return [];
    }
    const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    const lastOfMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const gridStart = this.getStartOfWeek(firstOfMonth);
    const gridEnd = new Date(this.getStartOfWeek(lastOfMonth));
    gridEnd.setDate(gridEnd.getDate() + 6);

    const days: AgendaMonthDay[] = [];
    const current = new Date(gridStart);
    while (current <= gridEnd) {
      const dateStr = this.formatDate(current);
      const items = this.citas.filter((cita) => cita.fecha === dateStr);
      const statusCounts: Record<AppointmentStatus, number> = {
        PENDING: 0,
        CONFIRMED: 0,
        COMPLETED: 0,
        CANCELED: 0
      };
      items.forEach((cita) => {
        if (cita.status) {
          statusCounts[cita.status] = (statusCounts[cita.status] ?? 0) + 1;
        }
      });
      days.push({
        date: dateStr,
        day: current.getDate(),
        isCurrentMonth: current.getMonth() === base.getMonth(),
        total: items.length,
        statusCounts
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  private updateCalendarHours(): void {
    let minMinutes = 7 * 60;
    let maxMinutes = 20 * 60;
    this.citas.forEach((cita) => {
      const start = this.timeToMinutes(cita.hora);
      const duration = cita.duracion ?? 60;
      const end = cita.horaFin ? this.timeToMinutes(cita.horaFin) : start + duration;
      minMinutes = Math.min(minMinutes, start);
      maxMinutes = Math.max(maxMinutes, end);
    });
    const minHour = Math.max(0, Math.floor(minMinutes / 60));
    const maxHour = Math.min(23, Math.ceil(maxMinutes / 60));
    this.calendarStartMinutes = minHour * 60;
    this.calendarEndMinutes = maxHour * 60;
    this.calendarHours = [];
    for (let minutes = this.calendarStartMinutes; minutes <= this.calendarEndMinutes; minutes += 60) {
      this.calendarHours.push(minutes);
    }
  }

  private scrollCalendarToNow(): void {
    if (this.viewMode !== 'calendar' || !this.calendarScroll?.nativeElement) {
      return;
    }
    const container = this.calendarScroll.nativeElement;
    if (!this.calendarDays.length) {
      container.scrollTop = 0;
      return;
    }
    const today = this.formatDate(new Date());
    const includesToday = this.calendarDays.some((day) => day.date === today);
    if (!includesToday) {
      container.scrollTop = 0;
      return;
    }
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const offsetMinutes = Math.max(0, minutesNow - this.calendarStartMinutes);
    const target = offsetMinutes * this.calendarMinuteHeight - this.calendarHourHeight;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTop = Math.min(Math.max(0, target), maxScroll);
  }

  private formatCalendarDayLabel(date: Date, mode: 'week' | 'day'): string {
    const options: Intl.DateTimeFormatOptions = mode === 'day'
      ? { weekday: 'long', day: '2-digit', month: 'short' }
      : { weekday: 'short', day: '2-digit', month: 'short' };
    return date.toLocaleDateString('es-MX', options);
  }

  private getWeekdayNumber(date: Date): number {
    return date.getDay();
  }

  private getWeekdayNumberByIndex(index: number): number {
    const map = [1, 2, 3, 4, 5, 6, 0];
    return map[index] ?? 1;
  }

  private formatRangeLabel(start: Date, end: Date): string {
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      const monthLabel = start.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
      return `${start.getDate()} - ${end.getDate()} ${monthLabel}`;
    }
    const startLabel = start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    const endLabel = end.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
  }

  private getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private isSelectedDateToday(date: string): boolean {
    return date === this.formatDate(new Date());
  }

  private compareTimes(a: string, b: string): number {
    return this.timeToMinutes(a) - this.timeToMinutes(b);
  }

  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  private normalizeSearch(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private compareCitas(
    a: Cita,
    b: Cita,
    key: 'paciente' | 'fecha' | 'hora' | 'especialista' | 'estado',
    dir: 'asc' | 'desc'
  ): number {
    let result = 0;
    if (key === 'fecha') {
      result = Date.parse(a.fecha) - Date.parse(b.fecha);
    } else if (key === 'hora') {
      result = a.hora.localeCompare(b.hora, 'es', { numeric: true });
    } else {
      const aVal = this.normalizeSearch(String(a[key]));
      const bVal = this.normalizeSearch(String(b[key]));
      result = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
    }
    return dir === 'asc' ? result : -result;
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateLabel(date: string): string {
    const parsed = this.parseDate(date);
    if (!parsed) {
      return date;
    }
    return parsed.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'short'
    });
  }

  private getAgendaPdfFileName(): string {
    const range = this.getAgendaRangeSlug();
    const stamp = this.getTimestampSlug();
    return `agenda-${this.agendaMode}-${range}-${stamp}.pdf`;
  }

  private getAgendaExportTitle(): string {
    if (this.agendaMode === 'month') {
      const parsed = this.parseDate(this.agendaDate) ?? new Date();
      const label = parsed.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      return `Agenda del mes de ${label}`;
    }
    if (this.agendaMode === 'week') {
      const start = this.parseDate(this.dateFrom) ?? new Date();
      const end = this.parseDate(this.dateTo) ?? start;
      const startLabel = start.toLocaleDateString('es-MX', { day: '2-digit', month: 'long' });
      const endLabel = end.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
      return `Agenda de la semana del ${startLabel} al ${endLabel}`;
    }
    const day = this.parseDate(this.dateFrom) ?? new Date();
    const label = day.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    return `Agenda del dia ${label}`;
  }

  private getAgendaExportMeta(): string {
    const specialistName = this.selectedSpecialistId
      ? this.especialistas.find((item) => item.id === this.selectedSpecialistId)?.userName
      : '';
    const statusLabel = this.statusFilter === 'ALL' ? 'Todos' : this.getEstadoLabel(this.statusFilter);
    const parts = [
      specialistName ? `Especialista: ${specialistName}` : '',
      `Estado: ${statusLabel}`
    ].filter(Boolean);
    return parts.join(' | ');
  }

  private buildAgendaTable(): { head: string[]; body: RowInput[] } {
    if (this.agendaMode === 'month') {
      const head = ['Fecha', 'Total', 'Pendientes', 'Confirmadas', 'Finalizadas', 'Canceladas'];
      const body = this.agendaMonthDays
        .filter((day) => day.isCurrentMonth)
        .map((day) => ([
          this.formatDateLabel(day.date),
          day.total.toString(),
          day.statusCounts.PENDING.toString(),
          day.statusCounts.CONFIRMED.toString(),
          day.statusCounts.COMPLETED.toString(),
          day.statusCounts.CANCELED.toString()
        ]));
      return { head, body };
    }

    const rows = this.agendaMode === 'week'
      ? this.agendaWeekGroups.flatMap((group) => group.items.map((item) => ({
        date: group.date,
        cita: item
      })))
      : this.agendaItems.map((item) => ({
        date: this.dateFrom,
        cita: item
      }));

    const head = this.agendaMode === 'week'
      ? ['Fecha', 'Hora', 'Paciente', 'Especialista', 'Estado', 'Notas']
      : ['Hora', 'Paciente', 'Especialista', 'Estado', 'Notas'];

    const body = rows.map((row) => {
      const notes = row.cita.notes?.trim() || '-';
      const safeNotes = notes.length > 60 ? `${notes.slice(0, 57)}...` : notes;
      const estado = row.cita.estado ?? this.getEstadoLabel(row.cita.status);
      if (this.agendaMode === 'week') {
        return [
          this.formatDateLabel(row.date),
          `${row.cita.hora} - ${row.cita.horaFin || '-'}`,
          row.cita.paciente,
          row.cita.especialista,
          estado,
          safeNotes
        ];
      }
      return [
        `${row.cita.hora} - ${row.cita.horaFin || '-'}`,
        row.cita.paciente,
        row.cita.especialista,
        estado,
        safeNotes
      ];
    });

    return { head, body };
  }

  private getAgendaColumnStyles(): Record<number, { cellWidth?: number }> {
    if (this.agendaMode === 'month') {
      return {
        0: { cellWidth: 140 },
        1: { cellWidth: 60 },
        2: { cellWidth: 70 },
        3: { cellWidth: 80 },
        4: { cellWidth: 70 },
        5: { cellWidth: 70 }
      };
    }
    if (this.agendaMode === 'week') {
      return {
        0: { cellWidth: 120 },
        1: { cellWidth: 90 },
        3: { cellWidth: 140 },
        4: { cellWidth: 90 }
      };
    }
    return {
      0: { cellWidth: 90 },
      2: { cellWidth: 140 },
      3: { cellWidth: 90 }
    };
  }

  private buildCitasExportRows(): { headers: string[]; rows: Array<Array<string | number>> } {
    if (this.viewMode === 'agenda') {
      if (this.agendaMode === 'month') {
        const headers = ['Fecha', 'Total', 'Pendientes', 'Confirmadas', 'Finalizadas', 'Canceladas'];
        const rows = this.agendaMonthDays
          .filter((day) => day.isCurrentMonth)
          .map((day) => ([
            this.formatDateLabel(day.date),
            day.total,
            day.statusCounts.PENDING,
            day.statusCounts.CONFIRMED,
            day.statusCounts.COMPLETED,
            day.statusCounts.CANCELED
          ]));
        return { headers, rows };
      }

      const includeDate = this.agendaMode === 'week';
      const headers = includeDate
        ? ['Fecha', 'Horario', 'Paciente', 'Especialista', 'Estado', 'Notas']
        : ['Horario', 'Paciente', 'Especialista', 'Estado', 'Notas'];

      const rows = this.agendaMode === 'week'
        ? this.agendaWeekGroups.flatMap((group) => group.items.map((item) => ([
          this.formatDateLabel(group.date),
          `${item.hora} - ${item.horaFin || '-'}`,
          item.paciente,
          item.especialista,
          item.estado ?? this.getEstadoLabel(item.status),
          item.notes?.trim() || '-'
        ])))
        : this.agendaItems.map((item) => ([
          `${item.hora} - ${item.horaFin || '-'}`,
          item.paciente,
          item.especialista,
          item.estado ?? this.getEstadoLabel(item.status),
          item.notes?.trim() || '-'
        ]));

      return { headers, rows };
    }

    const headers = ['Fecha', 'Horario', 'Paciente', 'Especialista', 'Estado', 'Notas'];
    const rows = this.sortedCitas.map((item) => ([
      item.fecha,
      `${item.hora} - ${item.horaFin || '-'}`,
      item.paciente,
      item.especialista,
      item.estado ?? this.getEstadoLabel(item.status),
      item.notes?.trim() || '-'
    ]));
    return { headers, rows };
  }

  private buildCitasExportFileName(extension: string): string {
    const mode = this.viewMode === 'agenda' ? `agenda-${this.agendaMode}` : this.viewMode;
    const range = this.viewMode === 'agenda' ? this.getAgendaRangeSlug() : `${this.dateFrom}_${this.dateTo}`;
    const stamp = this.getTimestampSlug();
    return `citas-${mode}-${range}-${stamp}.${extension}`;
  }

  private getCitasExcelColumnWidths(headers: string[], rows: Array<Array<string | number>>): number[] {
    const maxLengths = headers.map((header) => header.length);
    rows.forEach((row) => {
      row.forEach((value, index) => {
        const length = String(value ?? '').length;
        if (length > (maxLengths[index] ?? 0)) {
          maxLengths[index] = length;
        }
      });
    });

    return headers.map((header, index) => {
      const base = Math.max(12, (maxLengths[index] ?? 0) + 2);
      if (header.toLowerCase() === 'notas') {
        return Math.min(80, Math.max(30, base));
      }
      return Math.min(50, base);
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private getAgendaRangeSlug(): string {
    if (this.agendaMode === 'month') {
      const parsed = this.parseDate(this.agendaDate) ?? new Date();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${parsed.getFullYear()}-${month}`;
    }
    if (this.agendaMode === 'week') {
      return `${this.dateFrom}_${this.dateTo}`;
    }
    return this.dateFrom || this.formatDate(new Date());
  }

  private getTimestampSlug(): string {
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  }

  getAuditLabel(value?: string | null): string {
    if (!value) {
      return 'Sistema';
    }
    const resolved = this.auditUserMap[value];
    if (!resolved) {
      return value;
    }
    return resolved.name;
  }

  private loadSpecialists(): void {
    if (this.isSpecialistsLoading) {
      return;
    }
    this.isSpecialistsLoading = true;
      this.appointmentsFacade.listSpecialists().subscribe({
        next: (specialists) => {
          const filtered = this.applySpecialtyFilter(specialists);
          this.especialistas = this.applySpecialistRestrictions(filtered);
          this.specialtyMap = specialists.reduce<Record<string, string>>((acc, specialist) => {
            acc[specialist.id] = specialist.specialty;
            return acc;
          }, {});
          this.citas = this.citas.map((cita) => ({
            ...cita,
            especialidad: this.specialtyMap[cita.especialistaId ?? ''] ?? cita.especialidad ?? null
          }));
          this.isSpecialistsLoading = false;
          if (this.specialtyFilter) {
            this.loadAppointments(1);
          }
          this.cdr.detectChanges();
        },
      error: (error) => {
        console.error('Error loading specialists', error);
        this.isSpecialistsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private initializeUserScope(): void {
    const stored = this.authService.getStoredAuth();
    if (!stored?.user) {
      return;
    }
    this.currentUser = stored.user;
    const roles = stored.user.roles || [];
    if (roles.includes('ROLE_ESPECIALISTA')) {
      this.isSpecialistFilterLocked = true;
      this.showSpecialistFilter = false;
      this.hideSpecialistSelect = true;
      this.appointmentsFacade.getSpecialistByUserId(stored.user.id).subscribe({
        next: (specialist) => {
          this.allowedSpecialistIds = [specialist.id];
          this.selectedSpecialistId = specialist.id;
          this.especialistas = this.applySpecialistRestrictions(this.especialistas);
          this.syncCreateSpecialistControl();
          this.loadAppointments(1);
        },
        error: (error) => {
          console.error('Error loading specialist for user', error);
        }
      });
      return;
    }

    if (roles.includes('ROLE_ASISTENTE_ESPECIALISTA')) {
      this.showSpecialistFilter = false;
      this.hideSpecialistSelect = false;
      this.appointmentsFacade.getAssistantByUserId(stored.user.id).subscribe({
        next: (assistant) => {
          this.appointmentsFacade.listSpecialistsByAssistant(assistant.id).subscribe({
            next: (specialists) => {
              this.allowedSpecialistIds = specialists.map((item) => item.id);
              this.isSpecialistFilterLocked = specialists.length <= 1;
              if (specialists.length === 1) {
                this.selectedSpecialistId = specialists[0].id;
              }
              this.especialistas = this.applySpecialistRestrictions(this.especialistas);
              this.syncCreateSpecialistControl();
              this.loadAppointments(1);
            },
            error: (error) => {
              console.error('Error loading specialists for assistant', error);
            }
          });
        },
        error: (error) => {
          console.error('Error loading assistant for user', error);
        }
      });
    }
  }

  private applySpecialistRestrictions(list: SpecialistDto[]): SpecialistDto[] {
    if (!this.allowedSpecialistIds || !this.allowedSpecialistIds.length) {
      return list;
    }
    const allowed = new Set(this.allowedSpecialistIds);
    return list.filter((item) => allowed.has(item.id));
  }

  private applySpecialtyFilter(list: SpecialistDto[]): SpecialistDto[] {
    if (!this.specialtyFilter) {
      return list;
    }
    const target = this.specialtyFilter.toUpperCase();
    return list.filter((item) => item.specialty?.toUpperCase() === target);
  }

  private loadAppointments(page: number): void {
    const pageIndex = Math.max(0, page - 1);
    const size = this.viewMode === 'table' ? this.pageSize : this.calendarPageSize;
    const params = this.buildAppointmentsParams(pageIndex, size);
    this.isLoading = true;
    if (this.specialtyFilter && !this.selectedSpecialistId) {
      const specialistIds = this.especialistas.map((item) => item.id);
      if (specialistIds.length) {
        this.loadAppointmentsForSpecialists(specialistIds, params);
        return;
      }
    }

    this.appointmentsFacade.listAppointments(params).pipe(delay(200)).subscribe({
      next: (response: AppointmentPage) => {
        this.ngZone.run(() => {
          this.applyAppointmentsResponse(response);
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading appointments', error);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadAppointmentsForSpecialists(ids: string[], baseParams: AppointmentQueryParams): void {
    const size = this.calendarPageSize;
    const requests = ids.map((id) =>
      this.appointmentsFacade.listAppointments({
        ...baseParams,
        specialistId: id,
        page: 0,
        size
      })
    );

    forkJoin(requests).pipe(delay(200)).subscribe({
      next: (responses) => {
        this.ngZone.run(() => {
          const merged = responses.flatMap((response) => response.content);
          const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
          const sorted = this.sortMergedAppointments(unique);
          const mapped = sorted.map((item) => this.mapCita(item));
          this.citas = mapped;
          this.totalElements = mapped.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
          this.page = 1;
          this.clearSelection();
          this.resolveAuditUsers(unique.flatMap((item) => [item.createdBy, item.updatedBy]));
          this.resolveSpecialtyMap();
          if (this.viewMode === 'calendar') {
            this.updateCalendarHours();
          }
          this.updateConflictMap();
          this.isLoading = false;
          this.cdr.detectChanges();
          if (this.viewMode === 'calendar') {
            setTimeout(() => this.scrollCalendarToNow(), 0);
          }
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading appointments for specialty', error);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private applyAppointmentsResponse(response: AppointmentPage): void {
    this.citas = response.content.map((item) => this.mapCita(item));
    this.totalElements = response.totalElements;
    this.totalPages = response.totalPages || 1;
    this.pageSize = this.viewMode === 'calendar' ? this.pageSize : (response.size || this.pageSize);
    this.page = response.number + 1;
    this.clearSelection();
    this.resolveAuditUsers(response.content.flatMap((item) => [item.createdBy, item.updatedBy]));
    this.resolveSpecialtyMap();
    if (this.viewMode === 'calendar') {
      this.updateCalendarHours();
    }
    this.updateConflictMap();
    this.isLoading = false;
    this.cdr.detectChanges();
    if (this.viewMode === 'calendar') {
      setTimeout(() => this.scrollCalendarToNow(), 0);
    }
  }

  private loadPatients(term: string): void {
    if (this.isPatientsLoading) {
      return;
    }
    this.isPatientsLoading = true;
    this.appointmentsFacade.listPatients(term, 0, 20).subscribe({
      next: (page) => {
        this.pacientes = page.content.map((patient) => ({
          ...patient,
          isNew: false
        }));
        this.isPatientsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading patients', error);
        this.isPatientsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapCita(dto: AppointmentDto): Cita {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    return {
      id: dto.id,
      paciente: dto.patientName,
      pacienteId: dto.patientId,
      fecha: this.formatDate(start),
      hora: start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      horaFin: end.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duracion: dto.durationMinutes,
      especialista: dto.specialistName,
      especialistaId: dto.specialistId,
      especialidad: this.specialtyMap[dto.specialistId] ?? null,
      estado: this.getEstadoLabel(dto.status),
      status: dto.status,
      notes: dto.notes ?? null,
      createdBy: dto.createdBy ?? null,
      updatedAt: dto.updatedAt ?? null,
      updatedBy: dto.updatedBy ?? null
    };
  }

  private getEstadoLabel(status?: AppointmentStatus): EstadoCita {
    if (status === 'CONFIRMED') {
      return 'Confirmada';
    }
    if (status === 'COMPLETED') {
      return 'Finalizada';
    }
    if (status === 'CANCELED') {
      return 'Cancelada';
    }
    return 'Pendiente';
  }

  private buildCancelNotes(
    existing: string | null | undefined,
    reasonType: 'cancel' | 'no-show',
    reason: string
  ): string {
    const prefix = reasonType === 'no-show' ? 'No asistio:' : 'Motivo cancelacion:';
    const cleaned = reason.replace(/\s+/g, ' ').trim();
    const base = cleaned ? `${prefix} ${cleaned}` : prefix;
    const combined = existing?.trim() ? `${existing.trim()}\n${base}` : base;
    return combined.slice(0, 2000);
  }

  private stripCancelNotes(existing: string | null | undefined): string | undefined {
    if (!existing) {
      return undefined;
    }
    const lines = existing
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const filtered = lines.filter((line) => {
      const normalized = line.toLowerCase();
      return !normalized.startsWith('motivo cancelacion:') && !normalized.startsWith('no asistio:');
    });
    if (!filtered.length) {
      return undefined;
    }
    return filtered.join('\n').slice(0, 2000);
  }

  private isStatusVisible(cita: Cita): boolean {
    if (this.statusFilter === 'ALL') {
      return true;
    }
    return cita.status === this.statusFilter;
  }

  hasConflict(cita: Cita): boolean {
    return !!cita.id && this.conflictCitaIds.has(cita.id);
  }

  private hasConflictForSlot(
    specialistId: string | null | undefined,
    date: string,
    time: string,
    durationMinutes: number,
    excludeId?: string
  ): boolean {
    if (!specialistId || !date || !time) {
      return false;
    }
    const startMinutes = this.timeToMinutes(time);
    const endMinutes = startMinutes + (durationMinutes || 60);
    return this.citas.some((cita) => {
      if (!cita.id || cita.id === excludeId) {
        return false;
      }
      if (cita.especialistaId !== specialistId || cita.fecha !== date) {
        return false;
      }
      const otherStart = this.timeToMinutes(cita.hora);
      const otherEnd = cita.horaFin ? this.timeToMinutes(cita.horaFin) : otherStart + (cita.duracion ?? 60);
      return startMinutes < otherEnd && endMinutes > otherStart;
    });
  }

  private updateConflictMap(): void {
    const conflictIds = new Set<string>();
    const groups = new Map<string, Cita[]>();

    this.citas.forEach((cita) => {
      if (!cita.id || !cita.especialistaId || !cita.fecha) {
        return;
      }
      const key = `${cita.especialistaId}|${cita.fecha}`;
      const list = groups.get(key) ?? [];
      list.push(cita);
      groups.set(key, list);
    });

    groups.forEach((items) => {
      const normalized = items
        .map((cita) => {
          const startMinutes = this.timeToMinutes(cita.hora);
          const duration = cita.duracion ?? 60;
          const endMinutes = cita.horaFin ? this.timeToMinutes(cita.horaFin) : startMinutes + duration;
          return {
            cita,
            startMinutes,
            endMinutes
          };
        })
        .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

      const active: Array<{ endMinutes: number; cita: Cita }> = [];
      normalized.forEach((item) => {
        for (let i = active.length - 1; i >= 0; i -= 1) {
          if (active[i].endMinutes <= item.startMinutes) {
            active.splice(i, 1);
          }
        }
        if (active.length) {
          conflictIds.add(item.cita.id as string);
          active.forEach((activeItem) => {
            if (activeItem.cita.id) {
              conflictIds.add(activeItem.cita.id);
            }
          });
        }
        active.push({ endMinutes: item.endMinutes, cita: item.cita });
      });
    });

    this.conflictCitaIds = conflictIds;
  }

  private buildStartAt(date: string, time: string): string {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hour, minute, 0);
    const offsetMinutes = -localDate.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const pad = (value: number): string => String(Math.floor(Math.abs(value))).padStart(2, '0');
    const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
    const offsetMins = pad(Math.abs(offsetMinutes) % 60);
    const datePart = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}`;
    const timePart = `${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:00`;
    return `${datePart}T${timePart}${sign}${offsetHours}:${offsetMins}`;
  }

  private getCalendarDropTime(event: DragEvent, durationMinutes: number): string | null {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return null;
    }
    const rect = target.getBoundingClientRect();
    const offset = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const minutesFromTop = offset / this.calendarMinuteHeight;
    let startMinutes = this.calendarStartMinutes + minutesFromTop;

    startMinutes = Math.round(startMinutes / 30) * 30;
    const maxStart = Math.max(this.calendarStartMinutes, this.calendarEndMinutes - durationMinutes);
    startMinutes = Math.min(Math.max(startMinutes, this.calendarStartMinutes), maxStart);

    return this.formatTimeFromMinutes(startMinutes);
  }

  private formatTimeFromMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private resetCalendarDrag(): void {
    this.draggingCita = null;
    this.calendarDropDate = null;
  }

  get minCitaDate(): string {
    return this.formatDate(new Date());
  }

  get minCitaTime(): string {
    const now = new Date();
    const selectedDate = this.citaForm.value.fecha;
    const today = this.formatDate(now);
    if (selectedDate && selectedDate !== today) {
      return '00:00';
    }
    return this.getNextSlotTime(now);
  }

  get minEditTime(): string {
    const selectedDate = this.editForm.value.fecha;
    if (selectedDate && this.isSelectedDateToday(selectedDate)) {
      return this.getNextSlotTime(new Date());
    }
    return '00:00';
  }

  get minBulkTime(): string {
    const selectedDate = this.bulkForm.value.fecha;
    if (selectedDate && this.isSelectedDateToday(selectedDate)) {
      return this.getNextSlotTime(new Date());
    }
    return '00:00';
  }

  get calendarHourHeight(): number {
    return this.calendarMinuteHeight * 60;
  }

  get calendarTotalHeight(): number {
    const total = Math.max(60, this.calendarEndMinutes - this.calendarStartMinutes);
    return total * this.calendarMinuteHeight;
  }

  private getNextSlotTime(date: Date): string {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    const slot = new Date(date);
    if (roundedMinutes === 60) {
      slot.setHours(slot.getHours() + 1);
      slot.setMinutes(0, 0, 0);
    } else {
      slot.setMinutes(roundedMinutes, 0, 0);
    }
    return slot.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  private buildAppointmentPayload(formValue: any): {
    specialistId: string;
    patientId: string;
    startAt: string;
    durationMinutes: number;
    notes?: string;
    status: AppointmentStatus;
  } {
    return {
      specialistId: formValue.especialistaId,
      patientId: formValue.pacienteId,
      startAt: this.buildStartAt(formValue.fecha, formValue.hora),
      durationMinutes: Number(formValue.durationMinutes),
      notes: formValue.notes?.trim() || undefined,
      status: formValue.status
    };
  }

  private buildRangeDateTime(date: string, endOfDay: boolean): string {
    const [year, month, day] = date.split('-').map(Number);
    const hour = endOfDay ? 23 : 0;
    const minute = endOfDay ? 59 : 0;
    const second = endOfDay ? 59 : 0;
    const localDate = new Date(year, month - 1, day, hour, minute, second);
    const offsetMinutes = -localDate.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const pad = (value: number): string => String(Math.floor(Math.abs(value))).padStart(2, '0');
    const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
    const offsetMins = pad(Math.abs(offsetMinutes) % 60);
    const datePart = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}`;
    const timePart = `${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:${pad(localDate.getSeconds())}`;
    return `${datePart}T${timePart}${sign}${offsetHours}:${offsetMins}`;
  }

  private buildAppointmentsParams(page: number, sizeOverride?: number): {
    from?: string;
    to?: string;
    search?: string;
    specialistId?: string;
    status?: AppointmentStatus;
    sort?: string[];
    page: number;
    size: number;
  } {
    const params: {
      from?: string;
      to?: string;
      search?: string;
      specialistId?: string;
      status?: AppointmentStatus;
      sort?: string[];
      page: number;
      size: number;
    } = {
      page,
      size: sizeOverride ?? this.pageSize
    };
    if (this.dateFrom) {
      params.from = this.buildRangeDateTime(this.dateFrom, false);
    }
    if (this.dateTo) {
      params.to = this.buildRangeDateTime(this.dateTo, true);
    }
    const query = this.filterText.trim();
    if (query) {
      params.search = query;
    }
    if (this.statusFilter !== 'ALL') {
      params.status = this.statusFilter;
    }
    if (this.selectedSpecialistId) {
      params.specialistId = this.selectedSpecialistId;
    }
    params.sort = buildSortParams(this.sortKey, this.sortDir, this.sortFieldMap);
    return params;
  }

  private sortMergedAppointments(items: AppointmentDto[]): AppointmentDto[] {
    if (!this.sortKey || !isServerSortable(this.sortKey, this.sortFieldMap)) {
      return items;
    }
    const field = this.sortFieldMap[this.sortKey];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    if (field === 'startAt') {
      return [...items].sort((a, b) => (Date.parse(a.startAt) - Date.parse(b.startAt)) * dir);
    }
    if (field === 'status') {
      return [...items].sort((a, b) => a.status.localeCompare(b.status, 'es', { sensitivity: 'base' }) * dir);
    }
    return items;
  }

  private applyDefaultMonthRange(baseDate = new Date()): void {
    const todayString = this.formatDate(baseDate);
    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    this.dateFrom = this.formatDate(startOfMonth);
    this.dateTo = todayString;
  }

  private resolveSpecialtyMap(): void {
    if (!this.especialistas.length || !this.citas.length) {
      return;
    }
    if (!Object.keys(this.specialtyMap).length) {
      this.specialtyMap = this.especialistas.reduce<Record<string, string>>((acc, specialist) => {
        acc[specialist.id] = specialist.specialty;
        return acc;
      }, {});
    }
    this.citas = this.citas.map((cita) => ({
      ...cita,
      especialidad: this.specialtyMap[cita.especialistaId ?? ''] ?? cita.especialidad ?? null
    }));
  }

  private resolveAuditUsers(ids: Array<string | null | undefined>): void {
    const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)))
      .filter((id) => !this.auditUserMap[id]);
    if (!uniqueIds.length) {
      return;
    }
    this.appointmentsFacade.resolveUsers(uniqueIds).subscribe({
      next: (resolved) => {
        resolved.forEach((item) => {
          this.auditUserMap[item.id] = item;
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error resolving audit users for appointments', error);
      }
    });
  }

  private getDefaultCreateSpecialistId(): string | null {
    if (this.hideSpecialistSelect && this.selectedSpecialistId) {
      return this.selectedSpecialistId;
    }
    if (this.allowedSpecialistIds?.length === 1) {
      return this.allowedSpecialistIds[0];
    }
    return null;
  }

  private syncCreateSpecialistControl(): void {
    const control = this.citaForm.get('especialistaId');
    if (!control) {
      return;
    }
    if (this.hideSpecialistSelect) {
      control.setValue(this.selectedSpecialistId || null, { emitEvent: false });
      control.disable({ emitEvent: false });
      return;
    }
    control.enable({ emitEvent: false });
    if (control.value === null && this.allowedSpecialistIds?.length === 1) {
      control.setValue(this.allowedSpecialistIds[0], { emitEvent: false });
    }
  }

  private syncEditSpecialistControl(): void {
    const control = this.editForm.get('especialistaId');
    if (!control) {
      return;
    }
    if (this.hideSpecialistSelect) {
      control.disable({ emitEvent: false });
      return;
    }
    control.enable({ emitEvent: false });
  }

  getSpecialistLabelById(id?: string | null): string {
    const targetId = id ?? this.selectedSpecialistId;
    if (targetId) {
      const found = this.especialistas.find((item) => item.id === targetId);
      if (found?.userName) {
        return found.userName;
      }
    }
    return this.currentUser?.name ?? 'Sin especialista';
  }
}
