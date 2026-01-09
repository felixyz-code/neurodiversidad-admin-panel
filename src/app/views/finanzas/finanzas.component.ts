import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
  TableDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

interface Movimiento {
  fecha: string;
  tipo: 'Ingreso' | 'Egreso';
  descripcion: string;
  monto: number;
}

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
    ModalTitleDirective
  ]
})
export class FinanzasComponent {
  private fb = new FormBuilder();

  movimientos: Movimiento[] = [
    { fecha: '2026-01-05', tipo: 'Ingreso', descripcion: 'Donativo mensual', monto: 2500 },
    { fecha: '2026-01-04', tipo: 'Egreso', descripcion: 'Material terapeutico', monto: 820 },
    { fecha: '2026-01-04', tipo: 'Ingreso', descripcion: 'Cuotas de afiliacion', monto: 1350 },
    { fecha: '2026-01-03', tipo: 'Egreso', descripcion: 'Servicios basicos', monto: 430 },
    { fecha: '2026-01-03', tipo: 'Ingreso', descripcion: 'Taller de capacitacion', monto: 900 },
    { fecha: '2026-01-02', tipo: 'Egreso', descripcion: 'Honorarios externos', monto: 1200 },
    { fecha: '2026-01-02', tipo: 'Ingreso', descripcion: 'Apoyo institucional', monto: 3000 },
    { fecha: '2026-01-01', tipo: 'Egreso', descripcion: 'Mantenimiento', monto: 560 },
    { fecha: '2025-12-31', tipo: 'Ingreso', descripcion: 'Eventos de fin de anio', monto: 1750 },
    { fecha: '2025-12-31', tipo: 'Egreso', descripcion: 'Publicidad', monto: 400 },
    { fecha: '2025-12-30', tipo: 'Ingreso', descripcion: 'Patrocinio local', monto: 2200 },
    { fecha: '2025-12-30', tipo: 'Egreso', descripcion: 'Transporte', monto: 260 }
  ];

  dateFrom = '';
  dateTo = '';
  modalVisible = false;
  editModalVisible = false;
  editingMovimiento: Movimiento | null = null;
  deleteModalVisible = false;
  deletingMovimiento: Movimiento | null = null;
  editOriginal: { tipo: string; descripcion: string; monto: number; fecha: string } | null = null;
  filterText = '';

  movimientoForm: FormGroup = this.fb.group({
    tipo: ['Ingreso', [Validators.required]],
    descripcion: ['', [Validators.required]],
    monto: [0, [Validators.required, Validators.min(1)]],
    fecha: ['', [Validators.required]]
  });

  editMovimientoForm: FormGroup = this.fb.group({
    tipo: ['Ingreso', [Validators.required]],
    descripcion: ['', [Validators.required]],
    monto: [0, [Validators.required, Validators.min(1)]],
    fecha: ['', [Validators.required]]
  });
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25, 50];
  page = 1;

  constructor() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.dateFrom = this.formatDate(startOfMonth);
    this.dateTo = this.formatDate(today);
    this.movimientoForm.patchValue({ fecha: this.formatDate(today) });
    this.editMovimientoForm.patchValue({ fecha: this.formatDate(today) });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMovimientos.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.filteredMovimientos.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredMovimientos.length);
  }

  get filteredMovimientos(): Movimiento[] {
    const from = this.dateFrom ? new Date(this.dateFrom) : null;
    const to = this.dateTo ? new Date(this.dateTo) : null;
    const query = this.filterText.trim().toLowerCase();

    return this.movimientos.filter((mov) => {
      const movDate = new Date(mov.fecha);
      if (from && movDate < from) {
        return false;
      }
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        if (movDate > endOfDay) {
          return false;
        }
      }
      if (query) {
        return mov.descripcion.toLowerCase().includes(query);
      }
      return true;
    });
  }

  get paginatedMovimientos(): Movimiento[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredMovimientos.slice(start, start + this.pageSize);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page = page;
  }

  setPageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize = value;
    this.page = 1;
  }

  onDateChange(): void {
    this.page = 1;
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterText = input.value;
    this.page = 1;
  }

  clearFilter(): void {
    this.filterText = '';
    this.page = 1;
  }

  get totalEntradas(): number {
    return this.filteredMovimientos
      .filter((mov) => mov.tipo === 'Ingreso')
      .reduce((acc, mov) => acc + mov.monto, 0);
  }

  get totalSalidas(): number {
    return this.filteredMovimientos
      .filter((mov) => mov.tipo === 'Egreso')
      .reduce((acc, mov) => acc + mov.monto, 0);
  }

  get balance(): number {
    return this.totalEntradas - this.totalSalidas;
  }

  getTipoColor(tipo: Movimiento['tipo']): string {
    return tipo === 'Ingreso' ? 'success' : 'danger';
  }

  toggleModal(value: boolean): void {
    this.modalVisible = value;
    if (!value) {
      this.movimientoForm.reset({
        tipo: 'Ingreso',
        descripcion: '',
        monto: 0,
        fecha: this.formatDate(new Date())
      });
    }
  }

  openEditModal(movimiento: Movimiento): void {
    this.editingMovimiento = movimiento;
    this.editMovimientoForm.setValue({
      tipo: movimiento.tipo,
      descripcion: movimiento.descripcion,
      monto: movimiento.monto,
      fecha: movimiento.fecha
    });
    this.editOriginal = {
      tipo: movimiento.tipo,
      descripcion: movimiento.descripcion,
      monto: movimiento.monto,
      fecha: movimiento.fecha
    };
    this.editModalVisible = true;
  }

  openDeleteModal(movimiento: Movimiento): void {
    this.deletingMovimiento = movimiento;
    this.deleteModalVisible = true;
  }

  toggleEditModal(value: boolean): void {
    this.editModalVisible = value;
    if (!value) {
      this.editingMovimiento = null;
      this.editOriginal = null;
      this.editMovimientoForm.reset({
        tipo: 'Ingreso',
        descripcion: '',
        monto: 0,
        fecha: this.formatDate(new Date())
      });
    }
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

    const formValue = this.editMovimientoForm.value;
    const updated: Movimiento = {
      tipo: formValue.tipo,
      descripcion: formValue.descripcion,
      monto: formValue.monto,
      fecha: formValue.fecha
    };

    this.movimientos = this.movimientos.map((mov) => {
      if (mov === this.editingMovimiento) {
        return updated;
      }
      return mov;
    });

    this.toggleEditModal(false);
  }

  get editHasChanges(): boolean {
    if (!this.editOriginal) {
      return false;
    }
    const formValue = this.editMovimientoForm.value;
    return formValue.tipo !== this.editOriginal.tipo ||
      formValue.descripcion !== this.editOriginal.descripcion ||
      Number(formValue.monto) !== this.editOriginal.monto ||
      formValue.fecha !== this.editOriginal.fecha;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
