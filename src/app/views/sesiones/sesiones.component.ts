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
  TableDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { NgSelectModule } from '@ng-select/ng-select';

type EstadoSesion = 'Pendiente' | 'Finalizada' | 'Cancelada';

interface Sesion {
  paciente: string;
  fecha: string;
  hora: string;
  fisioterapeuta: string;
  estado: EstadoSesion;
}

interface PacienteOption {
  name: string;
  isNew?: boolean;
}

@Component({
  templateUrl: './sesiones.component.html',
  styleUrls: ['./sesiones.component.scss'],
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
    NgSelectModule,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective
  ]
})
export class SesionesComponent {
  private fb = new FormBuilder();

  sesiones: Sesion[] = [
    { paciente: 'Azul Felix', fecha: '2026-01-09', hora: '09:00', fisioterapeuta: 'Lic. Daniela Ortega', estado: 'Pendiente' },
    { paciente: 'Diego Salgado', fecha: '2026-01-09', hora: '10:30', fisioterapeuta: 'Lic. Daniela Ortega', estado: 'Finalizada' },
    { paciente: 'Sofia Mendez', fecha: '2026-01-09', hora: '12:00', fisioterapeuta: 'Lic. Daniela Ortega', estado: 'Pendiente' },
    { paciente: 'Luis Herrera', fecha: '2026-01-08', hora: '09:30', fisioterapeuta: 'Lic. Ruben Ibarra', estado: 'Cancelada' },
    { paciente: 'Andrea Vega', fecha: '2026-01-08', hora: '11:00', fisioterapeuta: 'Lic. Ruben Ibarra', estado: 'Finalizada' },
    { paciente: 'Karla Rios', fecha: '2026-01-08', hora: '12:30', fisioterapeuta: 'Lic. Daniela Ortega', estado: 'Pendiente' },
    { paciente: 'Rene Morales', fecha: '2026-01-07', hora: '09:00', fisioterapeuta: 'Lic. Sofia Perez', estado: 'Finalizada' },
    { paciente: 'Paula Ortiz', fecha: '2026-01-07', hora: '10:30', fisioterapeuta: 'Lic. Sofia Perez', estado: 'Pendiente' },
    { paciente: 'Gerardo Luna', fecha: '2026-01-06', hora: '11:30', fisioterapeuta: 'Lic. Ruben Ibarra', estado: 'Cancelada' },
    { paciente: 'Valeria Campos', fecha: '2026-01-06', hora: '13:00', fisioterapeuta: 'Lic. Daniela Ortega', estado: 'Finalizada' }
  ];

  fisioterapeutas: string[] = [
    'Lic. Daniela Ortega',
    'Lic. Ruben Ibarra',
    'Lic. Sofia Perez',
    'Lic. Mario Vazquez'
  ];

  dateFrom = '';
  dateTo = '';
  filterText = '';
  modalVisible = false;

  sesionForm: FormGroup = this.fb.group({
    paciente: [null, [Validators.required]],
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]],
    fisioterapeuta: [null, [Validators.required]],
    estado: ['Pendiente', [Validators.required]]
  });

  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 25, 50];
  page = 1;

  constructor() {
    const today = new Date();
    const todayString = this.formatDate(today);
    this.dateFrom = todayString;
    this.dateTo = todayString;
    this.sesionForm.patchValue({
      fecha: todayString,
      hora: '09:00'
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSesiones.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.filteredSesiones.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredSesiones.length);
  }

  get filteredSesiones(): Sesion[] {
    const from = this.dateFrom ? new Date(this.dateFrom) : null;
    const to = this.dateTo ? new Date(this.dateTo) : null;
    const query = this.normalizeSearch(this.filterText);

    return this.sesiones.filter((sesion) => {
      const sesionDate = new Date(sesion.fecha);
      if (from && sesionDate < from) {
        return false;
      }
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        if (sesionDate > endOfDay) {
          return false;
        }
      }
      if (query && !this.normalizeSearch(sesion.paciente).includes(query)) {
        return false;
      }
      return true;
    });
  }

  get paginatedSesiones(): Sesion[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredSesiones.slice(start, start + this.pageSize);
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
    this.filterText = (event.target as HTMLInputElement).value;
    this.page = 1;
  }

  toggleModal(value: boolean): void {
    this.modalVisible = value;
    if (!value) {
      this.sesionForm.reset({
        paciente: null,
        fecha: this.formatDate(new Date()),
        hora: '09:00',
        fisioterapeuta: null,
        estado: 'Pendiente'
      });
    }
  }

  submit(): void {
    if (this.sesionForm.invalid) {
      this.sesionForm.markAllAsTouched();
      return;
    }

    const formValue = this.sesionForm.value;
    this.sesiones = [
      ...this.sesiones,
      {
        paciente: this.getPacienteNombre(formValue.paciente),
        fecha: formValue.fecha,
        hora: formValue.hora,
        fisioterapeuta: formValue.fisioterapeuta,
        estado: formValue.estado
      }
    ];
    this.toggleModal(false);
  }

  getEstadoColor(estado: EstadoSesion): string {
    if (estado === 'Finalizada') {
      return 'success';
    }
    if (estado === 'Cancelada') {
      return 'danger';
    }
    return 'warning';
  }

  searchFisioterapeuta = (term: string, item: string): boolean => {
    const normalizedTerm = this.normalizeSearch(term);
    if (!normalizedTerm) {
      return true;
    }
    return this.normalizeSearch(item).includes(normalizedTerm);
  };

  searchPaciente = (term: string, item: PacienteOption): boolean => {
    const normalizedTerm = this.normalizeSearch(term);
    if (!normalizedTerm) {
      return true;
    }
    return this.normalizeSearch(item.name).includes(normalizedTerm);
  };

  get pacientes(): PacienteOption[] {
    return Array.from(new Set(this.sesiones.map((sesion) => sesion.paciente)))
      .sort()
      .map((name) => ({ name }));
  }

  addPaciente = (nombre: string): PacienteOption | null => {
    const trimmed = nombre.trim();
    if (!trimmed) {
      return null;
    }
    return {
      name: trimmed,
      isNew: true
    };
  };

  private getPacienteNombre(value: PacienteOption | string | null): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.name;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
}
