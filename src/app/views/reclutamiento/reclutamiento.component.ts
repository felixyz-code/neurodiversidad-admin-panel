import { CommonModule } from '@angular/common';
import { ApplicationRef, ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
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
  FormCheckInputDirective,
  FormControlDirective,
  FormFloatingDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective,
  PaginationModule,
  RowComponent,
  TableDirective,
  TooltipDirective,
  SpinnerComponent
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { catchError, finalize, firstValueFrom, forkJoin, of } from 'rxjs';

import { RecruitmentService } from '../../services/recruitment.service';
import { UsersService } from '../../services/users.service';
import {
  CreateRecruitmentRequest,
  RecruitmentDto,
  RecruitmentEstatus,
  RecruitmentPage,
  RecruitmentQueryParams,
  RecruitmentStatusFilter,
  RecruitmentTipoServicio,
  UpdateRecruitmentRequest
} from '../../models/recruitment.models';
import { ResolvedUserRef } from '../../models/users.models';
import { buildSortParams, isServerSortable, SortKeyMap } from '../../shared/utils/sort-params';

@Component({
  templateUrl: './reclutamiento.component.html',
  styleUrls: ['./reclutamiento.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    TableDirective,
    PaginationModule,
    BadgeComponent,
    ButtonDirective,
    IconDirective,
    FormCheckInputDirective,
    FormControlDirective,
    FormFloatingDirective,
    TooltipDirective,
    SpinnerComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective
  ]
})
export class ReclutamientoComponent implements OnInit {
  private fb = new FormBuilder();

  reclutados: RecruitmentDto[] = [];
  totalElements = 0;
  totalPages = 1;
  page = 1;
  auditUserMap: Record<string, ResolvedUserRef> = {};

  form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    tipoServicio: ['SERVICIO_SOCIAL', [Validators.required]],
    fechaInicio: [this.formatDate(new Date()), [Validators.required]],
    fechaSalida: [''],
    estatus: ['ACTIVO', [Validators.required]]
  });

  editingId: string | null = null;
  deleteModalVisible = false;
  deletingReclutado: RecruitmentDto | null = null;
  toggleStatusModalVisible = false;
  togglingReclutado: RecruitmentDto | null = null;
  nextEstatus: RecruitmentEstatus = 'ACTIVO';
  modalVisible = false;
  viewModalVisible = false;
  viewingReclutado: RecruitmentDto | null = null;
  bulkModalVisible = false;
  bulkSaving = false;
  bulkValidationError = '';
  filterText = '';
  statusFilter: RecruitmentStatusFilter = 'active';
  tipoServicioFilter: RecruitmentTipoServicio | 'ALL' = 'ALL';
  estatusFilter: RecruitmentEstatus | 'ALL' = 'ALL';
  dateFrom = '';
  dateTo = '';
  isLoading = false;
  isSaving = false;
  isDeleteSaving = false;
  isRestoreSaving = false;
  isToggleSaving = false;
  isExportingData = false;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25, 50];
  selectedIds = new Set<string>();
  sortKey: 'nombre' | 'tipoServicio' | 'fechaInicio' | 'fechaSalida' | 'estatus' | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  private readonly sortFieldMap: SortKeyMap = {
    nombre: 'nombre',
    tipoServicio: 'tipoServicio',
    fechaInicio: 'fechaInicio',
    fechaSalida: 'fechaSalida',
    estatus: 'estatus'
  };

  bulkForm: FormGroup = this.fb.group({
    estatus: [''],
    fechaSalida: ['']
  });

  constructor(
    private recruitmentService: RecruitmentService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef
  ) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateFrom = this.formatDate(startOfMonth);
    this.dateTo = this.formatDate(now);
  }

  ngOnInit(): void {
    this.loadRecruitment();
  }

  get isEditing(): boolean {
    return this.editingId !== null;
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

  get sortedReclutados(): RecruitmentDto[] {
    if (!this.sortKey || isServerSortable(this.sortKey, this.sortFieldMap)) {
      return this.reclutados;
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...this.reclutados].sort((a, b) => {
      const valueA = this.getSortValue(a);
      const valueB = this.getSortValue(b);
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * dir;
      }
      return String(valueA).localeCompare(String(valueB), 'es', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get isAllSelected(): boolean {
    if (!this.reclutados.length) {
      return false;
    }
    return this.reclutados.every((reclutado) => this.selectedIds.has(reclutado.id));
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page = page;
    this.loadRecruitment();
  }

  setPageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize = value;
    this.page = 1;
    this.loadRecruitment();
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterText = input.value;
    this.page = 1;
    this.loadRecruitment();
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as RecruitmentStatusFilter;
    this.statusFilter = value;
    if (this.statusFilter === 'deleted') {
      this.estatusFilter = 'ALL';
      this.clearSelection();
    }
    this.page = 1;
    this.loadRecruitment();
  }

  onTipoServicioChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as RecruitmentTipoServicio | 'ALL';
    this.tipoServicioFilter = value;
    this.page = 1;
    this.loadRecruitment();
  }

  onEstatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as RecruitmentEstatus | 'ALL';
    this.estatusFilter = value;
    this.page = 1;
    this.loadRecruitment();
  }

  onDateChange(): void {
    this.page = 1;
    this.loadRecruitment();
  }

  toggleSort(key: 'nombre' | 'tipoServicio' | 'fechaInicio' | 'fechaSalida' | 'estatus'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    if (isServerSortable(this.sortKey, this.sortFieldMap)) {
      this.page = 1;
      this.loadRecruitment();
    }
  }

  isSelected(reclutado: RecruitmentDto): boolean {
    return this.selectedIds.has(reclutado.id);
  }

  toggleSelection(reclutado: RecruitmentDto, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.selectedIds.add(reclutado.id);
    } else {
      this.selectedIds.delete(reclutado.id);
    }
  }

  toggleSelectAll(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.reclutados.forEach((reclutado) => this.selectedIds.add(reclutado.id));
    } else {
      this.reclutados.forEach((reclutado) => this.selectedIds.delete(reclutado.id));
    }
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  openEdit(reclutado: RecruitmentDto): void {
    this.editingId = reclutado.id;
    this.form.setValue({
      nombre: reclutado.nombre,
      tipoServicio: reclutado.tipoServicio,
      fechaInicio: reclutado.fechaInicio,
      fechaSalida: reclutado.fechaSalida ?? '',
      estatus: reclutado.estatus
    });
    this.modalVisible = true;
  }

  openViewModal(reclutado: RecruitmentDto): void {
    this.viewingReclutado = reclutado;
    this.viewModalVisible = true;
  }

  toggleViewModal(value: boolean): void {
    this.viewModalVisible = value;
    if (!value) {
      this.viewingReclutado = null;
    }
  }

  openCreateModal(): void {
    this.resetForm();
    this.modalVisible = true;
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({
      nombre: '',
      tipoServicio: 'SERVICIO_SOCIAL',
      fechaInicio: this.formatDate(new Date()),
      fechaSalida: '',
      estatus: 'ACTIVO'
    });
  }

  toggleModal(value: boolean): void {
    this.modalVisible = value;
    if (!value) {
      this.resetForm();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    if (this.editingId) {
      const payload: UpdateRecruitmentRequest = {
        nombre: formValue.nombre,
        tipoServicio: formValue.tipoServicio,
        fechaInicio: formValue.fechaInicio,
        fechaSalida: formValue.fechaSalida ? formValue.fechaSalida : null,
        estatus: formValue.estatus
      };
      this.isSaving = true;
      this.recruitmentService
        .updateRecruitment(this.editingId, payload)
        .pipe(finalize(() => (this.isSaving = false)))
        .subscribe(() => {
          this.resetForm();
          this.modalVisible = false;
          this.loadRecruitment();
        });
      return;
    }

    const payload: CreateRecruitmentRequest = {
      nombre: formValue.nombre,
      tipoServicio: formValue.tipoServicio,
      fechaInicio: formValue.fechaInicio,
      fechaSalida: formValue.fechaSalida ? formValue.fechaSalida : null,
      estatus: formValue.estatus
    };
    this.isSaving = true;
    this.recruitmentService
      .createRecruitment(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe(() => {
        this.page = 1;
        this.resetForm();
        this.modalVisible = false;
        this.loadRecruitment();
      });
  }

  openDeleteModal(reclutado: RecruitmentDto): void {
    this.deletingReclutado = reclutado;
    this.deleteModalVisible = true;
  }

  toggleDeleteModal(value: boolean): void {
    this.deleteModalVisible = value;
    if (!value) {
      this.deletingReclutado = null;
    }
  }

  openToggleStatusModal(reclutado: RecruitmentDto): void {
    this.togglingReclutado = reclutado;
    this.nextEstatus = reclutado.estatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.toggleStatusModalVisible = true;
  }

  toggleStatusModal(value: boolean): void {
    this.toggleStatusModalVisible = value;
    if (!value) {
      this.togglingReclutado = null;
    }
  }

  openBulkModal(): void {
    if (!this.selectedCount) {
      return;
    }
    this.bulkValidationError = '';
    this.bulkForm.reset({
      estatus: '',
      fechaSalida: ''
    });
    this.bulkModalVisible = true;
  }

  toggleBulkModal(value: boolean): void {
    this.bulkModalVisible = value;
    if (!value) {
      this.bulkSaving = false;
      this.bulkValidationError = '';
      this.bulkForm.reset({
        estatus: '',
        fechaSalida: ''
      });
    }
  }

  isBulkActionDisabled(): boolean {
    const { estatus, fechaSalida } = this.bulkForm.value;
    return this.bulkSaving || !this.selectedCount || (!estatus && !fechaSalida);
  }

  submitBulkUpdate(): void {
    if (this.bulkSaving || !this.selectedCount) {
      return;
    }
    const { estatus, fechaSalida } = this.bulkForm.value;
    if (!estatus && !fechaSalida) {
      this.bulkValidationError = 'Selecciona un estatus o una fecha de salida.';
      return;
    }
    const payload: UpdateRecruitmentRequest = {};
    if (estatus) {
      payload.estatus = estatus;
    }
    if (fechaSalida) {
      payload.fechaSalida = fechaSalida;
    }
    const requests = Array.from(this.selectedIds).map((id) =>
      this.recruitmentService.updateRecruitment(id, payload)
    );
    this.bulkSaving = true;
    this.bulkValidationError = '';
    forkJoin(requests)
      .pipe(finalize(() => {
        this.ngZone.run(() => {
          this.bulkSaving = false;
          this.cdr.detectChanges();
          this.appRef.tick();
        });
      }))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toggleBulkModal(false);
            this.clearSelection();
            this.loadRecruitment();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.bulkValidationError = 'Ocurrió un error al actualizar los reclutados.';
          });
        }
      });
  }

  confirmToggleStatus(): void {
    if (!this.togglingReclutado) {
      return;
    }
    this.isToggleSaving = true;
    const payload: UpdateRecruitmentRequest = {
      estatus: this.nextEstatus
    };
    this.recruitmentService
      .updateRecruitment(this.togglingReclutado.id, payload)
      .pipe(finalize(() => {
        this.ngZone.run(() => {
          this.isToggleSaving = false;
          this.cdr.detectChanges();
          this.appRef.tick();
        });
      }))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toggleStatusModal(false);
            this.loadRecruitment();
            this.cdr.detectChanges();
            this.appRef.tick();
          });
        }
      });
  }

  confirmDelete(): void {
    if (!this.deletingReclutado) {
      return;
    }
    this.isDeleteSaving = true;
    this.recruitmentService
      .deleteRecruitment(this.deletingReclutado.id)
      .pipe(finalize(() => {
        this.ngZone.run(() => {
          this.isDeleteSaving = false;
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toggleDeleteModal(false);
            this.loadRecruitment();
          });
        }
      });
  }

  confirmRestore(): void {
    if (!this.deletingReclutado) {
      return;
    }
    this.isRestoreSaving = true;
    this.recruitmentService
      .restoreRecruitment(this.deletingReclutado.id)
      .pipe(finalize(() => {
        this.ngZone.run(() => {
          this.isRestoreSaving = false;
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.toggleDeleteModal(false);
            this.loadRecruitment();
          });
        }
      });
  }

  async exportRecruitmentExcel(): Promise<void> {
    if (this.isExportingData) {
      return;
    }
    this.isExportingData = true;
    try {
      const items = await this.fetchAllRecruitmentForExport();
      const { headers, rows } = this.buildRecruitmentExportRows(items);
      const exceljs = await import('exceljs');
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Reclutamiento');
      const widths = this.getRecruitmentExcelColumnWidths(headers, rows);
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
      this.downloadBlob(blob, this.buildRecruitmentExportFileName('xlsx'));
    } catch (error) {
      console.error('Error exporting recruitment', error);
    } finally {
      this.isExportingData = false;
      this.cdr.detectChanges();
    }
  }

  async exportRecruitmentPdf(): Promise<void> {
    if (this.isExportingData) {
      return;
    }
    this.isExportingData = true;
    try {
      const items = await this.fetchAllRecruitmentForExport();
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
      pdf.text('Listado de reclutamiento', margin, margin);

      const subtitleParts = this.getRecruitmentExportMeta();
      if (subtitleParts.length) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(90, 98, 110);
        pdf.text(subtitleParts.join(' | '), margin, margin + 16);
      }

      const { headers, rows } = this.buildRecruitmentExportRows(items);
      autoTable(pdf, {
        head: [headers],
        body: rows as RowInput[],
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

      pdf.save(this.buildRecruitmentExportFileName('pdf'));
    } catch (error) {
      console.error('Error exporting recruitment PDF', error);
    } finally {
      this.isExportingData = false;
      this.cdr.detectChanges();
    }
  }

  getEstatusColor(estatus: RecruitmentEstatus): string {
    return estatus === 'ACTIVO' ? 'success' : 'secondary';
  }

  getFechaSalidaLabel(fechaSalida: string | null | undefined): string {
    return fechaSalida ? fechaSalida : 'Indefinido';
  }

  getAuditLabel(value?: string | null, fallback = '-'): string {
    if (!value) {
      return fallback;
    }
    const resolved = this.auditUserMap[value];
    if (!resolved) {
      return value;
    }
    return resolved.name;
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  fieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getSortValue(item: RecruitmentDto): string | number {
    switch (this.sortKey) {
      case 'nombre':
        return item.nombre ?? '';
      case 'tipoServicio':
        return item.tipoServicio ?? '';
      case 'fechaInicio':
        return item.fechaInicio ?? '';
      case 'fechaSalida':
        return item.fechaSalida ?? '';
      case 'estatus':
        return this.statusFilter === 'deleted' ? 'ELIMINADO' : (item.estatus ?? '');
      default:
        return '';
    }
  }

  private loadRecruitment(): void {
    if (!this.dateFrom || !this.dateTo) {
      this.reclutados = [];
      this.totalElements = 0;
      this.totalPages = 1;
      return;
    }
    this.isLoading = true;
    const params: RecruitmentQueryParams = {
      status: this.statusFilter,
      text: this.filterText.trim() || undefined,
      tipoServicio: this.tipoServicioFilter === 'ALL' ? undefined : this.tipoServicioFilter,
      estatus: this.estatusFilter === 'ALL' ? undefined : this.estatusFilter,
      from: this.dateFrom || undefined,
      to: this.dateTo || undefined,
      page: this.page - 1,
      size: this.pageSize,
      sort: buildSortParams(this.sortKey, this.sortDir, this.sortFieldMap)
    };
    this.recruitmentService
      .listRecruitment(params)
      .pipe(
        catchError(() => of({
          content: [],
          totalElements: 0,
          totalPages: 1,
          number: 0,
          size: this.pageSize
        } as RecruitmentPage))
      )
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.reclutados = response.content || [];
            this.totalElements = response.totalElements || 0;
            this.totalPages = response.totalPages || 1;
            this.page = (response.number ?? 0) + 1;
            this.resolveAuditUsers(this.reclutados);
            this.isLoading = false;
            this.cdr.detectChanges();
            setTimeout(() => this.cdr.detectChanges());
            this.appRef.tick();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.reclutados = [];
            this.totalElements = 0;
            this.totalPages = 1;
            this.auditUserMap = {};
            this.isLoading = false;
            this.cdr.detectChanges();
            setTimeout(() => this.cdr.detectChanges());
            this.appRef.tick();
          });
        }
      });
  }

  private buildRecruitmentExportRows(items: RecruitmentDto[]): { headers: string[]; rows: Array<Array<string | number>> } {
    const headers = [
      'Nombre',
      'Tipo de servicio',
      'Estatus',
      'Fecha inicio',
      'Fecha salida',
      'Creado',
      'Creado por',
      'Actualizado',
      'Actualizado por'
    ];
    const rows = items.map((item) => ([
      item.nombre,
      item.tipoServicio,
      item.estatus,
      item.fechaInicio,
      item.fechaSalida ?? '-',
      this.formatDateTime(item.createdAt),
      this.getAuditLabel(item.createdBy),
      this.formatDateTime(item.updatedAt),
      this.getAuditLabel(item.updatedBy)
    ]));
    return { headers, rows };
  }

  private getRecruitmentExcelColumnWidths(headers: string[], rows: Array<Array<string | number>>): number[] {
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
      if (header.toLowerCase().includes('nombre')) {
        return Math.min(50, Math.max(24, base));
      }
      return Math.min(45, base);
    });
  }

  private buildRecruitmentExportFileName(extension: string): string {
    const range = `${this.dateFrom}_${this.dateTo}`;
    const stamp = this.getTimestampSlug();
    return `reclutamiento-${range}-${stamp}.${extension}`;
  }

  private getTimestampSlug(): string {
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
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

  private getRecruitmentExportMeta(): string[] {
    const range = this.dateFrom && this.dateTo ? `Rango: ${this.dateFrom} - ${this.dateTo}` : '';
    const tipo = this.tipoServicioFilter !== 'ALL' ? `Tipo: ${this.tipoServicioFilter}` : '';
    const estatus = this.estatusFilter !== 'ALL' ? `Estatus: ${this.estatusFilter}` : '';
    const status = this.statusFilter === 'deleted'
      ? 'Estado: Eliminados'
      : this.statusFilter === 'all'
        ? 'Estado: Todos'
        : 'Estado: Activos';
    return [range, tipo, estatus, status].filter(Boolean);
  }

  private async fetchAllRecruitmentForExport(): Promise<RecruitmentDto[]> {
    const all: RecruitmentDto[] = [];
    let page = 0;
    let totalPages = 1;
    const size = 200;
    while (page < totalPages) {
      const response = await firstValueFrom(this.recruitmentService.listRecruitment({
        status: this.statusFilter,
        text: this.filterText.trim() || undefined,
        tipoServicio: this.tipoServicioFilter === 'ALL' ? undefined : this.tipoServicioFilter,
        estatus: this.estatusFilter === 'ALL' ? undefined : this.estatusFilter,
        from: this.dateFrom || undefined,
        to: this.dateTo || undefined,
        sort: buildSortParams(this.sortKey, this.sortDir, this.sortFieldMap),
        page,
        size
      }));
      all.push(...(response.content || []));
      totalPages = response.totalPages || 1;
      page += 1;
    }
    return all;
  }

  private resolveAuditUsers(items: RecruitmentDto[]): void {
    const ids = Array.from(new Set(
      items
        .flatMap((item) => [item.createdBy, item.updatedBy])
        .filter((value): value is string => Boolean(value))
    ));
    if (!ids.length) {
      this.auditUserMap = {};
      return;
    }
    this.usersService.resolveUsers(ids).subscribe({
      next: (resolved) => {
        this.auditUserMap = resolved.reduce<Record<string, ResolvedUserRef>>((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
        this.cdr.detectChanges();
      },
      error: () => {
        this.auditUserMap = {};
        this.cdr.detectChanges();
      }
    });
  }
}
