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
  ModalBodyComponent,
  ModalComponent,
  ModalFooterComponent,
  ModalHeaderComponent,
  ModalTitleDirective,
  PaginationModule,
  RowComponent,
  TableDirective,
  TooltipDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

type TipoServicio = 'Practicante' | 'Voluntario' | 'Servicio Social';
type Estatus = 'Activo' | 'Inactivo';

interface Reclutado {
  id: number;
  nombre: string;
  tipoServicio: TipoServicio;
  fechaInicio: string;
  fechaSalida: string | null;
  estatus: Estatus;
}

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
    FormControlDirective,
    FormFloatingDirective,
    TooltipDirective,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective
  ]
})
export class ReclutamientoComponent {
  private fb = new FormBuilder();

  reclutados: Reclutado[] = [
    { id: 1, nombre: 'Ana Torres', tipoServicio: 'Servicio Social', fechaInicio: '2025-12-01', fechaSalida: null, estatus: 'Activo' },
    { id: 2, nombre: 'Luis Perez', tipoServicio: 'Practicante', fechaInicio: '2025-11-15', fechaSalida: '2026-02-15', estatus: 'Activo' },
    { id: 3, nombre: 'Maria Gomez', tipoServicio: 'Voluntario', fechaInicio: '2025-10-05', fechaSalida: null, estatus: 'Inactivo' },
    { id: 4, nombre: 'Carlos Ruiz', tipoServicio: 'Practicante', fechaInicio: '2026-01-03', fechaSalida: null, estatus: 'Activo' },
    { id: 5, nombre: 'Elena Diaz', tipoServicio: 'Servicio Social', fechaInicio: '2025-09-20', fechaSalida: '2025-12-20', estatus: 'Inactivo' },
    { id: 6, nombre: 'Jorge Campos', tipoServicio: 'Voluntario', fechaInicio: '2026-01-05', fechaSalida: null, estatus: 'Activo' }
  ];

  form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    tipoServicio: ['Servicio Social', [Validators.required]],
    fechaInicio: [this.formatDate(new Date()), [Validators.required]],
    fechaSalida: [''],
    estatus: ['Activo', [Validators.required]]
  });

  editingId: number | null = null;
  deleteModalVisible = false;
  deletingReclutado: Reclutado | null = null;
  modalVisible = false;
  filterText = '';
  pageSize = 5;
  page = 1;
  readonly pageSizeOptions = [5, 10, 25, 50];

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredReclutados.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.filteredReclutados.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredReclutados.length);
  }

  get filteredReclutados(): Reclutado[] {
    const query = this.filterText.trim().toLowerCase();
    if (!query) {
      return this.reclutados;
    }
    return this.reclutados.filter((item) => item.nombre.toLowerCase().includes(query));
  }

  get paginatedReclutados(): Reclutado[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredReclutados.slice(start, start + this.pageSize);
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

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterText = input.value;
    this.page = 1;
  }

  openEdit(reclutado: Reclutado): void {
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

  openCreateModal(): void {
    this.resetForm();
    this.modalVisible = true;
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({
      nombre: '',
      tipoServicio: 'Servicio Social',
      fechaInicio: this.formatDate(new Date()),
      fechaSalida: '',
      estatus: 'Activo'
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
    const payload: Reclutado = {
      id: this.editingId ?? this.nextId(),
      nombre: formValue.nombre,
      tipoServicio: formValue.tipoServicio,
      fechaInicio: formValue.fechaInicio,
      fechaSalida: formValue.fechaSalida ? formValue.fechaSalida : null,
      estatus: formValue.estatus
    };

    if (this.editingId) {
      this.reclutados = this.reclutados.map((item) =>
        item.id === this.editingId ? payload : item
      );
    } else {
      this.reclutados = [payload, ...this.reclutados];
    }

    this.page = 1;
    this.resetForm();
    this.modalVisible = false;
  }

  openDeleteModal(reclutado: Reclutado): void {
    this.deletingReclutado = reclutado;
    this.deleteModalVisible = true;
  }

  toggleDeleteModal(value: boolean): void {
    this.deleteModalVisible = value;
    if (!value) {
      this.deletingReclutado = null;
    }
  }

  getEstatusColor(estatus: Estatus): string {
    return estatus === 'Activo' ? 'success' : 'secondary';
  }

  getFechaSalidaLabel(fechaSalida: string | null): string {
    return fechaSalida ? fechaSalida : 'Indefinido';
  }

  fieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private nextId(): number {
    return this.reclutados.length
      ? Math.max(...this.reclutados.map((item) => item.id)) + 1
      : 1;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
