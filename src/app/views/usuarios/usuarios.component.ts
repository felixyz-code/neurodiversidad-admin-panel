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
  TableDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

interface Usuario {
  nombre: string;
  correo: string;
  rol: string;
  estado: 'Activo' | 'Inactivo';
  ultimoIngreso: string;
}

@Component({
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
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
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective,
    FormFloatingDirective,
    FormControlDirective,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective
  ]
})
export class UsuariosComponent {
  private fb = new FormBuilder();

  usuarios: Usuario[] = [
    { nombre: 'Ana Torres', correo: 'ana.torres@example.com', rol: 'Admin', estado: 'Activo', ultimoIngreso: 'Hoy 09:10' },
    { nombre: 'Luis Perez', correo: 'luis.perez@example.com', rol: 'Coordinador', estado: 'Activo', ultimoIngreso: 'Ayer 18:45' },
    { nombre: 'Maria Gomez', correo: 'maria.gomez@example.com', rol: 'Especialista', estado: 'Inactivo', ultimoIngreso: 'Mar 12' },
    { nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@example.com', rol: 'Psicologo', estado: 'Activo', ultimoIngreso: 'Hoy 08:30' },
    { nombre: 'Elena Diaz', correo: 'elena.diaz@example.com', rol: 'Terapeuta', estado: 'Activo', ultimoIngreso: 'Hoy 10:05' },
    { nombre: 'Marco Salas', correo: 'marco.salas@example.com', rol: 'Coordinador', estado: 'Activo', ultimoIngreso: 'Ayer 17:30' },
    { nombre: 'Patricia Leon', correo: 'patricia.leon@example.com', rol: 'Admin', estado: 'Inactivo', ultimoIngreso: 'Ene 02' },
    { nombre: 'Jorge Campos', correo: 'jorge.campos@example.com', rol: 'Especialista', estado: 'Activo', ultimoIngreso: 'Hoy 07:55' },
    { nombre: 'Lucia Vega', correo: 'lucia.vega@example.com', rol: 'Psicologo', estado: 'Activo', ultimoIngreso: 'Hoy 11:20' },
    { nombre: 'Diego Soto', correo: 'diego.soto@example.com', rol: 'Terapeuta', estado: 'Inactivo', ultimoIngreso: 'Dic 28' },
    { nombre: 'Sofia Rojas', correo: 'sofia.rojas@example.com', rol: 'Coordinador', estado: 'Activo', ultimoIngreso: 'Hoy 09:40' },
    { nombre: 'Ricardo Mena', correo: 'ricardo.mena@example.com', rol: 'Especialista', estado: 'Activo', ultimoIngreso: 'Ayer 19:05' },
    { nombre: 'Paula Ortiz', correo: 'paula.ortiz@example.com', rol: 'Admin', estado: 'Activo', ultimoIngreso: 'Hoy 10:55' },
    { nombre: 'Fernando Cruz', correo: 'fernando.cruz@example.com', rol: 'Terapeuta', estado: 'Inactivo', ultimoIngreso: 'Dic 30' },
    { nombre: 'Natalia Silva', correo: 'natalia.silva@example.com', rol: 'Psicologo', estado: 'Activo', ultimoIngreso: 'Hoy 06:50' },
    { nombre: 'Gabriel Luna', correo: 'gabriel.luna@example.com', rol: 'Especialista', estado: 'Activo', ultimoIngreso: 'Hoy 12:05' }
  ];

  createUserForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    roles: ['ROLE_TRABAJO_SOCIAL', [Validators.required]],
    enabled: [true]
  });

  modalVisible = false;
  pageSize = 10;
  page = 1;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.usuarios.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.usuarios.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.usuarios.length);
  }

  get paginatedUsuarios(): Usuario[] {
    const start = (this.page - 1) * this.pageSize;
    return this.usuarios.slice(start, start + this.pageSize);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page = page;
  }

  getEstadoColor(estado: Usuario['estado']): string {
    return estado === 'Activo' ? 'success' : 'secondary';
  }

  passwordsMatch(): boolean {
    return this.createUserForm.value.password === this.createUserForm.value.confirmPassword;
  }

  toggleModal(value: boolean): void {
    this.modalVisible = value;
    if (!value) {
      this.createUserForm.reset({
        name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        roles: 'ROLE_TRABAJO_SOCIAL',
        enabled: true
      });
    }
  }

  submit(): void {
    if (this.createUserForm.invalid || !this.passwordsMatch()) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    const formValue = this.createUserForm.value;
    const nuevo: Usuario = {
      nombre: formValue.name,
      correo: formValue.email,
      rol: formValue.roles ?? 'ROLE_TRABAJO_SOCIAL',
      estado: formValue.enabled ? 'Activo' : 'Inactivo',
      ultimoIngreso: 'Hace un momento'
    };

    this.usuarios = [nuevo, ...this.usuarios];
    this.page = 1;
    this.toggleModal(false);
  }

  fieldInvalid(field: string): boolean {
    const control = this.createUserForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
