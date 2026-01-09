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

type EstadoCita = 'Pendiente' | 'Finalizada' | 'Cancelada';

interface Cita {
  paciente: string;
  fecha: string;
  hora: string;
  especialista: string;
  estado: EstadoCita;
}

interface PacienteOption {
  name: string;
  isNew?: boolean;
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
export class CitasComponent {
  private fb = new FormBuilder();

  readonly currentEspecialista = 'Dra. Laura Martinez';

  citas: Cita[] = [
    { paciente: 'Azul Felix', fecha: '2026-01-09', hora: '09:00', especialista: 'Dra. Laura Martinez', estado: 'Pendiente' },
    { paciente: 'Diego Salgado', fecha: '2026-01-09', hora: '10:30', especialista: 'Dra. Laura Martinez', estado: 'Finalizada' },
    { paciente: 'Sofia Mendez', fecha: '2026-01-09', hora: '12:00', especialista: 'Dra. Laura Martinez', estado: 'Pendiente' },
    { paciente: 'Luis Herrera', fecha: '2026-01-09', hora: '13:30', especialista: 'Dr. Miguel Perez', estado: 'Cancelada' },
    { paciente: 'Andrea Vega', fecha: '2026-01-08', hora: '15:00', especialista: 'Dra. Laura Martinez', estado: 'Finalizada' },
    { paciente: 'Karla Rios', fecha: '2026-01-08', hora: '16:30', especialista: 'Dr. Miguel Perez', estado: 'Pendiente' },
    { paciente: 'Rene Morales', fecha: '2026-01-07', hora: '09:30', especialista: 'Lic. Paulina Castro', estado: 'Finalizada' },
    { paciente: 'Paula Ortiz', fecha: '2026-01-07', hora: '11:00', especialista: 'Lic. Paulina Castro', estado: 'Pendiente' },
    { paciente: 'Gerardo Luna', fecha: '2026-01-06', hora: '10:00', especialista: 'Dra. Laura Martinez', estado: 'Cancelada' },
    { paciente: 'Valeria Campos', fecha: '2026-01-06', hora: '11:30', especialista: 'Dr. Miguel Perez', estado: 'Finalizada' },
    { paciente: 'Marco Castillo', fecha: '2026-01-06', hora: '13:00', especialista: 'Dr. Miguel Perez', estado: 'Pendiente' },
    { paciente: 'Marina Gil', fecha: '2026-01-05', hora: '14:00', especialista: 'Lic. Paulina Castro', estado: 'Finalizada' }
  ];

  especialistas: string[] = [
    'Dra. Laura Martinez',
    'Dr. Miguel Perez',
    'Lic. Paulina Castro',
    'Dr. Hector Salinas',
    'Dra. Gabriela Ruiz'
  ];
  dateFrom = '';
  dateTo = '';
  filterText = '';

  modalVisible = false;

  citaForm: FormGroup = this.fb.group({
    paciente: [null, [Validators.required]],
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]],
    especialista: [null, [Validators.required]],
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
    this.citaForm.patchValue({
      fecha: todayString,
      hora: '09:00'
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCitas.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.filteredCitas.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredCitas.length);
  }

  get filteredCitas(): Cita[] {
    const from = this.dateFrom ? new Date(this.dateFrom) : null;
    const to = this.dateTo ? new Date(this.dateTo) : null;
    const query = this.normalizeSearch(this.filterText);

    return this.citas.filter((cita) => {
      const citaDate = new Date(cita.fecha);
      if (from && citaDate < from) {
        return false;
      }
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        if (citaDate > endOfDay) {
          return false;
        }
      }
      if (query && !this.normalizeSearch(cita.paciente).includes(query)) {
        return false;
      }
      return true;
    });
  }

  get paginatedCitas(): Cita[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredCitas.slice(start, start + this.pageSize);
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
      this.citaForm.reset({
        paciente: null,
        fecha: this.formatDate(new Date()),
        hora: '09:00',
        especialista: null,
        estado: 'Pendiente'
      });
    }
  }

  submit(): void {
    if (this.citaForm.invalid) {
      this.citaForm.markAllAsTouched();
      return;
    }

    const formValue = this.citaForm.value;
    this.citas = [
      ...this.citas,
      {
        paciente: this.getPacienteNombre(formValue.paciente),
        fecha: formValue.fecha,
        hora: formValue.hora,
        especialista: formValue.especialista,
        estado: formValue.estado
      }
    ];
    this.toggleModal(false);
  }

  getEstadoColor(estado: EstadoCita): string {
    if (estado === 'Finalizada') {
      return 'success';
    }
    if (estado === 'Cancelada') {
      return 'danger';
    }
    return 'warning';
  }

  searchEspecialista = (term: string, item: string): boolean => {
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
    return Array.from(new Set(this.citas.map((cita) => cita.paciente)))
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
