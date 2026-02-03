import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  BadgeComponent,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent,
  FormControlDirective,
  FormFloatingDirective,
  TooltipDirective,
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective,
  PaginationModule,
  RowComponent,
  SpinnerComponent,
  TableDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { catchError, finalize, firstValueFrom, forkJoin, of } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

import { FinancesService } from '../../services/finances.service';
import { UsersService } from '../../services/users.service';
import {
  CreateMovementRequest,
  FinMovementDto,
  FinMovementSummary,
  MovementType,
  PaymentMethod,
  UpdateMovementRequest
} from '../../models/finances.models';
import { ResolvedUserRef } from '../../models/users.models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { buildSortParams, isServerSortable, SortKeyMap } from '../../shared/utils/sort-params';

@Component({
  templateUrl: './finanzas.component.html',
  styleUrls: ['./finanzas.component.scss'],
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
    FormControlDirective,
    FormFloatingDirective,
    IconDirective,
    TooltipDirective,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective,
    SpinnerComponent,
    EmptyStateComponent
  ]
})
export class FinanzasComponent implements OnInit {
  private fb = new FormBuilder();

  movimientos: FinMovementDto[] = [];
  summary: FinMovementSummary = {
    totalIncome: 0,
    totalOutcome: 0,
    balance: 0
  };
  auditUserMap: Record<string, ResolvedUserRef> = {};

  dateFrom = '';
  dateTo = '';
  modalVisible = false;
  editModalVisible = false;
  viewModalVisible = false;
  editingMovimiento: FinMovementDto | null = null;
  viewingMovimiento: FinMovementDto | null = null;
  deleteModalVisible = false;
  deletingMovimiento: FinMovementDto | null = null;
  editOriginal: Partial<CreateMovementRequest> | null = null;
  filterText = '';
  typeFilter: MovementType | 'ALL' = 'ALL';
  paymentFilter: PaymentMethod | 'ALL' = 'ALL';
  statusFilter: 'active' | 'deleted' | 'all' = 'active';
  minAmount: number | null = null;
  maxAmount: number | null = null;

  isLoading = false;
  isSummaryLoading = false;
  isSaving = false;
  isEditSaving = false;
  isDeleteSaving = false;
  isRestoreSaving = false;
  isExportingData = false;

  movimientoForm: FormGroup = this.fb.group({
    type: ['INCOME', [Validators.required]],
    description: ['', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(1)]],
    movementDate: ['', [Validators.required]],
    paymentMethod: ['CASH', [Validators.required]]
  });

  editMovimientoForm: FormGroup = this.fb.group({
    type: ['INCOME', [Validators.required]],
    description: ['', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(1)]],
    movementDate: ['', [Validators.required]],
    paymentMethod: ['CASH', [Validators.required]]
  });
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50, 100];
  page = 1;
  totalElements = 0;
  totalPagesValue = 1;
  sortKey: 'tipo' | 'descripcion' | 'monto' | 'metodo' | 'fecha' | 'creadoPor' | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  private readonly sortFieldMap: SortKeyMap = {
    tipo: 'type',
    descripcion: 'description',
    monto: 'amount',
    metodo: 'paymentMethod',
    fecha: 'movementDate'
  };

  constructor(
    private financesService: FinancesService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.dateFrom = this.formatDate(startOfMonth);
    this.dateTo = this.formatDate(today);
    this.movimientoForm.patchValue({ movementDate: this.formatDate(today) });
    this.editMovimientoForm.patchValue({ movementDate: this.formatDate(today) });
  }

  ngOnInit(): void {
    this.refreshData();
  }

  get totalPages(): number {
    return Math.max(1, this.totalPagesValue);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.totalElements ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalElements);
  }

  get sortedMovimientos(): FinMovementDto[] {
    if (!this.sortKey || isServerSortable(this.sortKey, this.sortFieldMap)) {
      return this.movimientos;
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...this.movimientos].sort((a, b) => {
      const valueA = this.getSortValue(a);
      const valueB = this.getSortValue(b);
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * dir;
      }
      return String(valueA).localeCompare(String(valueB), 'es', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page = page;
    this.refreshData(false);
  }

  setPageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize = value;
    this.resetToFirstPage();
    this.refreshData(false);
  }

  onDateChange(): void {
    this.resetToFirstPage();
    this.refreshData();
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterText = input.value;
    this.resetToFirstPage();
    this.refreshData();
  }

  clearFilter(): void {
    this.filterText = '';
    this.resetToFirstPage();
    this.refreshData();
  }

  onTypeFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MovementType | 'ALL';
    this.typeFilter = value;
    this.resetToFirstPage();
    this.refreshData();
  }

  onPaymentFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PaymentMethod | 'ALL';
    this.paymentFilter = value;
    this.resetToFirstPage();
    this.refreshData();
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'active' | 'deleted' | 'all';
    this.statusFilter = value;
    this.resetToFirstPage();
    this.refreshData();
  }

  onAmountFilterChange(): void {
    this.resetToFirstPage();
    this.refreshData();
  }

  onMinAmountInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.minAmount = value ? Number(value) : null;
    this.onAmountFilterChange();
  }

  onMaxAmountInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.maxAmount = value ? Number(value) : null;
    this.onAmountFilterChange();
  }

  toggleSort(key: 'tipo' | 'descripcion' | 'monto' | 'metodo' | 'fecha' | 'creadoPor'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    if (isServerSortable(this.sortKey, this.sortFieldMap)) {
      this.resetToFirstPage();
      this.refreshData(false);
    }
  }

  get totalEntradas(): number {
    return this.summary.totalIncome || 0;
  }

  get totalSalidas(): number {
    return this.summary.totalOutcome || 0;
  }

  get balance(): number {
    return this.summary.balance || 0;
  }

  getTipoColor(tipo: MovementType): string {
    return tipo === 'INCOME' ? 'success' : 'danger';
  }

  getTipoLabel(tipo: MovementType): string {
    return tipo === 'INCOME' ? 'Ingreso' : 'Egreso';
  }

  getMetodoPagoLabel(metodo: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
      OTHER: 'Otro'
    };
    return labels[metodo];
  }

  getAuditLabel(value?: string | null, fallback = 'Sistema'): string {
    if (!value) {
      return fallback;
    }
    const resolved = this.auditUserMap[value];
    if (!resolved) {
      return value;
    }
    return resolved.name;
  }

  toggleModal(value: boolean): void {
    this.modalVisible = value;
    if (!value) {
      this.movimientoForm.reset({
        type: 'INCOME',
        description: '',
        amount: 0,
        movementDate: this.formatDate(new Date()),
        paymentMethod: 'CASH'
      });
    }
  }

  openEditModal(movimiento: FinMovementDto): void {
    this.editingMovimiento = movimiento;
    this.editMovimientoForm.setValue({
      type: movimiento.type,
      description: movimiento.description,
      amount: movimiento.amount,
      movementDate: movimiento.movementDate,
      paymentMethod: movimiento.paymentMethod
    });
    this.editOriginal = {
      type: movimiento.type,
      description: movimiento.description,
      amount: movimiento.amount,
      movementDate: movimiento.movementDate,
      paymentMethod: movimiento.paymentMethod
    };
    this.editModalVisible = true;
  }

  openDeleteModal(movimiento: FinMovementDto): void {
    this.deletingMovimiento = movimiento;
    this.deleteModalVisible = true;
  }

  toggleEditModal(value: boolean): void {
    this.editModalVisible = value;
    if (!value) {
      this.editingMovimiento = null;
      this.editOriginal = null;
      this.editMovimientoForm.reset({
        type: 'INCOME',
        description: '',
        amount: 0,
        movementDate: this.formatDate(new Date()),
        paymentMethod: 'CASH'
      });
    }
  }

  toggleViewModal(value: boolean): void {
    this.viewModalVisible = value;
    if (!value) {
      this.viewingMovimiento = null;
    }
  }

  openViewModal(movimiento: FinMovementDto): void {
    this.viewingMovimiento = movimiento;
    this.viewModalVisible = true;
  }

  toggleDeleteModal(value: boolean): void {
    this.deleteModalVisible = value;
    if (!value) {
      this.deletingMovimiento = null;
    }
  }

  submitEdit(): void {
    if (this.editMovimientoForm.invalid || !this.editingMovimiento || !this.editHasChanges) {
      this.editMovimientoForm.markAllAsTouched();
      return;
    }

    const payload = this.buildUpdatePayload();
    if (!payload) {
      return;
    }
    this.isEditSaving = true;
    this.financesService
      .updateMovement(this.editingMovimiento.id, payload)
      .pipe(finalize(() => (this.isEditSaving = false)))
      .subscribe(() => {
        this.toggleEditModal(false);
        this.refreshData();
      });
  }

  get editHasChanges(): boolean {
    if (!this.editOriginal) {
      return false;
    }
    const formValue = this.editMovimientoForm.value;
    return formValue.type !== this.editOriginal.type ||
      formValue.description !== this.editOriginal.description ||
      Number(formValue.amount) !== this.editOriginal.amount ||
      formValue.movementDate !== this.editOriginal.movementDate ||
      formValue.paymentMethod !== this.editOriginal.paymentMethod;
  }

  submitCreate(): void {
    if (this.movimientoForm.invalid) {
      this.movimientoForm.markAllAsTouched();
      return;
    }
    const payload: CreateMovementRequest = {
      type: this.movimientoForm.value.type,
      description: this.movimientoForm.value.description,
      amount: Number(this.movimientoForm.value.amount),
      movementDate: this.movimientoForm.value.movementDate,
      paymentMethod: this.movimientoForm.value.paymentMethod
    };
    this.isSaving = true;
    this.financesService
      .createMovement(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe(() => {
        this.toggleModal(false);
        this.refreshData();
      });
  }

  confirmDelete(): void {
    if (!this.deletingMovimiento) {
      return;
    }
    this.isDeleteSaving = true;
    this.financesService
      .deleteMovement(this.deletingMovimiento.id)
      .pipe(finalize(() => (this.isDeleteSaving = false)))
      .subscribe(() => {
        this.toggleDeleteModal(false);
        this.refreshData();
      });
  }

  confirmRestore(): void {
    if (!this.deletingMovimiento) {
      return;
    }
    this.isRestoreSaving = true;
    this.financesService
      .restoreMovement(this.deletingMovimiento.id)
      .pipe(finalize(() => (this.isRestoreSaving = false)))
      .subscribe(() => {
        this.toggleDeleteModal(false);
        this.refreshData();
      });
  }

  async exportFinanzasExcel(): Promise<void> {
    if (this.isExportingData) {
      return;
    }
    this.isExportingData = true;
    try {
      const movements = await this.fetchAllMovementsForExport();
      const { headers, rows } = this.buildFinanzasExportRows(movements);
      const exceljs = await import('exceljs');
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Finanzas');
      const widths = this.getFinanzasExcelColumnWidths(headers, rows);
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
      this.downloadBlob(blob, this.buildFinanzasExportFileName('xlsx'));
    } catch (error) {
      console.error('Error exporting finanzas', error);
    } finally {
      this.isExportingData = false;
      this.cdr.detectChanges();
    }
  }

  async exportFinanzasPdf(): Promise<void> {
    if (this.isExportingData) {
      return;
    }
    this.isExportingData = true;
    try {
      const movements = await this.fetchAllMovementsForExport();
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
      pdf.text('Listado de movimientos', margin, margin);

      const subtitleParts = this.getFinanzasExportMeta();
      if (subtitleParts.length) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(90, 98, 110);
        pdf.text(subtitleParts.join(' | '), margin, margin + 16);
      }

      const { headers, rows } = this.buildFinanzasExportRows(movements);
      autoTable(pdf, {
        head: [headers],
        body: rows as RowInput[],
        startY: margin + 32,
        margin: { left: margin, right: margin },
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 70 },  // Creado
          1: { cellWidth: 55 },  // Tipo
          2: { cellWidth: 120 }, // Descripcion
          3: { cellWidth: 60 },  // Monto
          4: { cellWidth: 70 },  // Metodo
          5: { cellWidth: 65 },  // Fecha
          6: { cellWidth: 75 },  // Creado por
          7: { cellWidth: 65 },  // Actualizado
          8: { cellWidth: 75 }   // Actualizado por
        },
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

      pdf.save(this.buildFinanzasExportFileName('pdf'));
    } catch (error) {
      console.error('Error exporting finanzas PDF', error);
    } finally {
      this.isExportingData = false;
      this.cdr.detectChanges();
    }
  }

  private refreshData(refreshSummary = true): void {
    if (!this.dateFrom || !this.dateTo) {
      this.isLoading = false;
      this.isSummaryLoading = false;
      this.movimientos = [];
      this.totalElements = 0;
      this.totalPagesValue = 1;
      return;
    }

    this.isLoading = true;
    if (refreshSummary) {
      this.isSummaryLoading = true;
    }

    const list$ = this.financesService.listMovements({
      from: this.dateFrom,
      to: this.dateTo,
      type: this.typeFilter === 'ALL' ? undefined : this.typeFilter,
      paymentMethod: this.paymentFilter === 'ALL' ? undefined : this.paymentFilter,
      text: this.filterText.trim() || undefined,
      minAmount: this.minAmount ?? undefined,
      maxAmount: this.maxAmount ?? undefined,
      page: this.page - 1,
      size: this.pageSize,
      status: this.statusFilter,
      sort: buildSortParams(this.sortKey, this.sortDir, this.sortFieldMap)
    }).pipe(
      catchError(() => of({
        content: [],
        totalElements: 0,
        totalPages: 1,
        number: this.page - 1,
        size: this.pageSize
      }))
    );

    const summary$ = refreshSummary
      ? this.financesService.getSummary({
        from: this.dateFrom,
        to: this.dateTo,
        type: this.typeFilter === 'ALL' ? undefined : this.typeFilter,
        paymentMethod: this.paymentFilter === 'ALL' ? undefined : this.paymentFilter,
        text: this.filterText.trim() || undefined,
        minAmount: this.minAmount ?? undefined,
        maxAmount: this.maxAmount ?? undefined,
        status: this.statusFilter,
        sort: buildSortParams(this.sortKey, this.sortDir, this.sortFieldMap)
      }).pipe(
        catchError(() => of({ totalIncome: 0, totalOutcome: 0, balance: 0 }))
      )
      : of(this.summary);

    forkJoin({ list: list$, summary: summary$ })
      .subscribe({
        next: ({ list, summary }) => {
          this.ngZone.run(() => {
            this.movimientos = list.content || [];
            this.totalElements = list.totalElements || 0;
            this.totalPagesValue = list.totalPages || 1;
            this.page = (list.number ?? 0) + 1;
            this.summary = summary;
            this.resolveAuditUsers(this.movimientos);
            this.isLoading = false;
            if (refreshSummary) {
              this.isSummaryLoading = false;
            }
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.movimientos = [];
            this.totalElements = 0;
            this.totalPagesValue = 1;
            this.auditUserMap = {};
            this.isLoading = false;
            if (refreshSummary) {
              this.isSummaryLoading = false;
            }
            this.cdr.detectChanges();
          });
        }
      });
  }

  private resetToFirstPage(): void {
    this.page = 1;
  }

  private buildUpdatePayload(): UpdateMovementRequest | null {
    if (!this.editOriginal) {
      return null;
    }
    const formValue = this.editMovimientoForm.value;
    const payload: UpdateMovementRequest = {};
    if (formValue.type !== this.editOriginal.type) {
      payload.type = formValue.type;
    }
    if (formValue.description !== this.editOriginal.description) {
      payload.description = formValue.description;
    }
    if (Number(formValue.amount) !== this.editOriginal.amount) {
      payload.amount = Number(formValue.amount);
    }
    if (formValue.movementDate !== this.editOriginal.movementDate) {
      payload.movementDate = formValue.movementDate;
    }
    if (formValue.paymentMethod !== this.editOriginal.paymentMethod) {
      payload.paymentMethod = formValue.paymentMethod;
    }
    return Object.keys(payload).length ? payload : null;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getSortValue(item: FinMovementDto): string | number {
    switch (this.sortKey) {
      case 'tipo':
        return this.getTipoLabel(item.type);
      case 'descripcion':
        return item.description ?? '';
      case 'monto':
        return item.amount ?? 0;
      case 'metodo':
        return this.getMetodoPagoLabel(item.paymentMethod);
      case 'fecha':
        return item.movementDate ?? '';
      case 'creadoPor':
        return this.getAuditLabel(item.createdBy);
      default:
        return '';
    }
  }

  private formatDateTime(value?: string | null): string {
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

  private buildFinanzasExportRows(movements: FinMovementDto[]): { headers: string[]; rows: Array<Array<string | number>> } {
    const headers = [
      'Creado',
      'Tipo',
      'Descripcion',
      'Monto',
      'Metodo',
      'Fecha',
      'Creado por',
      'Actualizado',
      'Actualizado por'
    ];
    const rows = movements.map((item) => ([
      this.formatDateTime(item.createdAt),
      this.getTipoLabel(item.type),
      item.description,
      item.amount,
      this.getMetodoPagoLabel(item.paymentMethod),
      item.movementDate,
      this.getAuditLabel(item.createdBy),
      this.formatDateTime(item.updatedAt),
      this.getAuditLabel(item.updatedBy, '-')
    ]));
    return { headers, rows };
  }

  private getFinanzasExcelColumnWidths(headers: string[], rows: Array<Array<string | number>>): number[] {
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
      if (header.toLowerCase().includes('descripcion')) {
        return Math.min(80, Math.max(30, base));
      }
      return Math.min(50, base);
    });
  }

  private buildFinanzasExportFileName(extension: string): string {
    const range = `${this.dateFrom}_${this.dateTo}`;
    const stamp = this.getTimestampSlug();
    return `finanzas-${range}-${stamp}.${extension}`;
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

  private getFinanzasExportMeta(): string[] {
    const range = this.dateFrom && this.dateTo ? `Rango: ${this.dateFrom} - ${this.dateTo}` : '';
    const tipo = this.typeFilter !== 'ALL' ? `Tipo: ${this.getTipoLabel(this.typeFilter)}` : '';
    const metodo = this.paymentFilter !== 'ALL' ? `Metodo: ${this.getMetodoPagoLabel(this.paymentFilter)}` : '';
    const statusLabel = this.statusFilter === 'deleted'
      ? 'Estado: Eliminados'
      : this.statusFilter === 'all'
        ? 'Estado: Todos'
        : 'Estado: Activos';
    return [range, tipo, metodo, statusLabel].filter(Boolean);
  }

  private async fetchAllMovementsForExport(): Promise<FinMovementDto[]> {
    const all: FinMovementDto[] = [];
    let page = 0;
    let totalPages = 1;
    const size = 200;
    while (page < totalPages) {
      const response = await firstValueFrom(this.financesService.listMovements({
        from: this.dateFrom,
        to: this.dateTo,
        type: this.typeFilter === 'ALL' ? undefined : this.typeFilter,
        paymentMethod: this.paymentFilter === 'ALL' ? undefined : this.paymentFilter,
        text: this.filterText.trim() || undefined,
        minAmount: this.minAmount ?? undefined,
        maxAmount: this.maxAmount ?? undefined,
        page,
        size,
        status: this.statusFilter,
        sort: buildSortParams(this.sortKey, this.sortDir, this.sortFieldMap)
      }));
      all.push(...(response.content || []));
      totalPages = response.totalPages || 1;
      page += 1;
    }
    return all;
  }

  private resolveAuditUsers(movements: FinMovementDto[]): void {
    const ids = Array.from(new Set(
      movements
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
