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

interface Usuario {
  nombre: string;
  username: string;
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
    TooltipDirective,
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
    { nombre: 'Ana Torres', username: 'ana.torres', correo: 'ana.torres@example.com', rol: 'ROLE_DIRECTOR_GENERAL', estado: 'Activo', ultimoIngreso: 'Hoy 09:10' },
    { nombre: 'Luis Perez', username: 'luis.perez', correo: 'luis.perez@example.com', rol: 'ROLE_ASISTENTE_GENERAL', estado: 'Activo', ultimoIngreso: 'Ayer 18:45' },
    { nombre: 'Maria Gomez', username: 'maria.gomez', correo: 'maria.gomez@example.com', rol: 'ROLE_ESPECIALISTA', estado: 'Inactivo', ultimoIngreso: 'Mar 12' },
    { nombre: 'Carlos Ruiz', username: 'carlos.ruiz', correo: 'carlos.ruiz@example.com', rol: 'ROLE_ESPECIALISTA', estado: 'Activo', ultimoIngreso: 'Hoy 08:30' },
    { nombre: 'Elena Diaz', username: 'elena.diaz', correo: 'elena.diaz@example.com', rol: 'ROLE_ASISTENTE_ESPECIALISTA', estado: 'Activo', ultimoIngreso: 'Hoy 10:05' },
    { nombre: 'Marco Salas', username: 'marco.salas', correo: 'marco.salas@example.com', rol: 'ROLE_ASISTENTE_GENERAL', estado: 'Activo', ultimoIngreso: 'Ayer 17:30' },
    { nombre: 'Patricia Leon', username: 'patricia.leon', correo: 'patricia.leon@example.com', rol: 'ROLE_FINANZAS', estado: 'Inactivo', ultimoIngreso: 'Ene 02' },
    { nombre: 'Jorge Campos', username: 'jorge.campos', correo: 'jorge.campos@example.com', rol: 'ROLE_ESPECIALISTA', estado: 'Activo', ultimoIngreso: 'Hoy 07:55' },
    { nombre: 'Lucia Vega', username: 'lucia.vega', correo: 'lucia.vega@example.com', rol: 'ROLE_TRABAJO_SOCIAL', estado: 'Activo', ultimoIngreso: 'Hoy 11:20' },
    { nombre: 'Diego Soto', username: 'diego.soto', correo: 'diego.soto@example.com', rol: 'ROLE_TRABAJO_SOCIAL', estado: 'Inactivo', ultimoIngreso: 'Dic 28' },
    { nombre: 'Sofia Rojas', username: 'sofia.rojas', correo: 'sofia.rojas@example.com', rol: 'ROLE_CAPACITACION', estado: 'Activo', ultimoIngreso: 'Hoy 09:40' },
    { nombre: 'Ricardo Mena', username: 'ricardo.mena', correo: 'ricardo.mena@example.com', rol: 'ROLE_RP', estado: 'Activo', ultimoIngreso: 'Ayer 19:05' },
    { nombre: 'Paula Ortiz', username: 'paula.ortiz', correo: 'paula.ortiz@example.com', rol: 'ROLE_COMPRAS', estado: 'Activo', ultimoIngreso: 'Hoy 10:55' },
    { nombre: 'Fernando Cruz', username: 'fernando.cruz', correo: 'fernando.cruz@example.com', rol: 'ROLE_RRHH', estado: 'Inactivo', ultimoIngreso: 'Dic 30' },
    { nombre: 'Natalia Silva', username: 'natalia.silva', correo: 'natalia.silva@example.com', rol: 'ROLE_FINANZAS', estado: 'Activo', ultimoIngreso: 'Hoy 06:50' },
    { nombre: 'Gabriel Luna', username: 'gabriel.luna', correo: 'gabriel.luna@example.com', rol: 'ROLE_ESPECIALISTA', estado: 'Activo', ultimoIngreso: 'Hoy 12:05' }
  ];

  readonly roleLabels: Record<string, string> = {
    ROLE_DIRECTOR_GENERAL: 'Director general',
    ROLE_ASISTENTE_GENERAL: 'Asistente general',
    ROLE_FINANZAS: 'Finanzas',
    ROLE_ESPECIALISTA: 'Especialista',
    ROLE_ASISTENTE_ESPECIALISTA: 'Asistente especialista',
    ROLE_TRABAJO_SOCIAL: 'Trabajo social',
    ROLE_CAPACITACION: 'Capacitacion',
    ROLE_COMPRAS: 'Compras',
    ROLE_RRHH: 'Recursos Humanos',
    ROLE_RP: 'Relaciones publicas'
  };

  createUserForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    roles: ['ROLE_TRABAJO_SOCIAL', [Validators.required]],
    enabled: [true]
  });

  editUserForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: [''],
    confirmPassword: [''],
    roles: ['ROLE_TRABAJO_SOCIAL', [Validators.required]],
    enabled: [true]
  });

  modalVisible = false;
  editModalVisible = false;
  editingUser: Usuario | null = null;
  deleteModalVisible = false;
  deletingUser: Usuario | null = null;
  filterText = '';
  pageSize = 5;
  page = 1;
  readonly pageSizeOptions = [5, 10, 25, 50];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsuarios.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayStart(): number {
    return this.filteredUsuarios.length ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get displayEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredUsuarios.length);
  }

  get paginatedUsuarios(): Usuario[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredUsuarios.slice(start, start + this.pageSize);
  }

  get filteredUsuarios(): Usuario[] {
    const query = this.filterText.trim().toLowerCase();
    if (!query) {
      return this.usuarios;
    }

    return this.usuarios.filter((usuario) => {
      return usuario.nombre.toLowerCase().includes(query) ||
        usuario.username.toLowerCase().includes(query);
    });
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

  getEstadoColor(estado: Usuario['estado']): string {
    return estado === 'Activo' ? 'success' : 'secondary';
  }

  getRoleLabel(rol: string): string {
    return this.roleLabels[rol] ?? rol;
  }

  passwordsMatch(): boolean {
    return this.createUserForm.value.password === this.createUserForm.value.confirmPassword;
  }

  editPasswordsValid(): boolean {
    const password = this.editUserForm.value.password;
    const confirmPassword = this.editUserForm.value.confirmPassword;

    if (!password && !confirmPassword) {
      return true;
    }

    if (!password || password.length < 6) {
      return false;
    }

    return password === confirmPassword;
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

  toggleEditModal(value: boolean): void {
    this.editModalVisible = value;
    if (!value) {
      this.editingUser = null;
      this.editUserForm.reset({
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

  openEditModal(usuario: Usuario): void {
    this.editingUser = usuario;
    this.editUserForm.setValue({
      name: usuario.nombre,
      email: usuario.correo,
      username: usuario.username,
      password: '',
      confirmPassword: '',
      roles: usuario.rol,
      enabled: usuario.estado === 'Activo'
    });
    this.editModalVisible = true;
  }

  openDeleteModal(usuario: Usuario): void {
    this.deletingUser = usuario;
    this.deleteModalVisible = true;
  }

  toggleDeleteModal(value: boolean): void {
    this.deleteModalVisible = value;
    if (!value) {
      this.deletingUser = null;
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
      username: formValue.username,
      correo: formValue.email,
      rol: formValue.roles ?? 'ROLE_TRABAJO_SOCIAL',
      estado: formValue.enabled ? 'Activo' : 'Inactivo',
      ultimoIngreso: 'Hace un momento'
    };

    this.usuarios = [nuevo, ...this.usuarios];
    this.page = 1;
    this.toggleModal(false);
  }

  submitEdit(): void {
    if (this.editUserForm.invalid || !this.editPasswordsValid()) {
      this.editUserForm.markAllAsTouched();
      return;
    }

    if (!this.editingUser) {
      return;
    }

    const formValue = this.editUserForm.value;
    const updated: Usuario = {
      nombre: formValue.name,
      username: formValue.username,
      correo: formValue.email,
      rol: formValue.roles ?? 'ROLE_TRABAJO_SOCIAL',
      estado: formValue.enabled ? 'Activo' : 'Inactivo',
      ultimoIngreso: this.editingUser.ultimoIngreso
    };

    this.usuarios = this.usuarios.map((usuario) => {
      if (usuario.correo === this.editingUser?.correo) {
        return updated;
      }
      return usuario;
    });

    this.toggleEditModal(false);
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterText = input.value;
    this.page = 1;
  }

  fieldInvalid(field: string): boolean {
    const control = this.createUserForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  fieldInvalidFor(form: FormGroup, field: string): boolean {
    const control = form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
