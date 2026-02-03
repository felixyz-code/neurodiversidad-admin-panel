import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, catchError, firstValueFrom, map, of, switchMap, timer } from 'rxjs';
import { delay } from 'rxjs/operators';

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
  SpinnerComponent,
  TableDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { NgSelectModule } from '@ng-select/ng-select';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import {
  CreateUserRequest,
  ResolvedUserRef,
  UpdateUserRequest,
  UserAdministrationDTO,
  UsersQueryParams
} from '../../models/users.models';
import { StaffService } from '../../services/staff.service';
import { AssistantDto, SpecialistDto } from '../../models/staff.models';
import { buildSortParams, isServerSortable, SortKeyMap } from '../../shared/utils/sort-params';

interface Usuario {
  id: string;
  nombre: string;
  username: string;
  correo: string;
  rol: string;
  roles?: string[];
  estado: 'Activo' | 'Inactivo' | 'Eliminado';
  ultimoIngreso: string;
  ultimoIngresoTs?: number | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  specialty?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
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
      SpinnerComponent,
      EmptyStateComponent,
      LoadingStateComponent,
      NgSelectModule,
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
export class UsuariosComponent implements OnInit {
  private fb = new FormBuilder();

  usuarios: Usuario[] = [];
  isLoading = false;
  loadError = false;

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
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    roles: ['ROLE_TRABAJO_SOCIAL', [Validators.required]],
    enabled: [true],
    specialistIds: [[]],
    specialty: ['']
  });

  editUserForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: [''],
    confirmPassword: [''],
    roles: ['ROLE_TRABAJO_SOCIAL', [Validators.required]],
    enabled: [true],
    specialistIds: [[]],
    assistantIds: [[]],
    specialty: ['']
  });

  modalVisible = false;
  isCreateSaving = false;
  isSpecialistsLoading = false;
  specialistsLoaded = false;
  specialists: SpecialistDto[] = [];
  assistants: AssistantDto[] = [];
  isAssistantsLoading = false;
  readonly specialtyOptions = [
    { value: 'PSICOLOGIA', label: 'Psicologia' },
    { value: 'PEDAGOGIA', label: 'Pedagogia' },
    { value: 'FISIOTERAPIA', label: 'Fisioterapia' },
    { value: 'PEDIATRIA', label: 'Pediatria' },
    { value: 'OTRA', label: 'Otra' }
  ];
  editModalVisible = false;
  isEditSaving = false;
  isEditSpecialistsLoading = false;
  isEditAssistantsLoading = false;
  editRelationError = '';
  roleChangeError = '';
  roleChangeConfirmChecked = false;
  disableConfirmChecked = false;
  auditUserMap: Record<string, ResolvedUserRef> = {};
  isAuditLoading = false;
  specialtyMap: Record<string, string> = {};
  isSpecialtyMapLoading = false;
  editingAssistantId: string | null = null;
  editingSpecialistId: string | null = null;
  editingUser: Usuario | null = null;
  private editInitialValue: {
    name: string;
    email: string;
    username: string;
    roles: string;
    enabled: boolean;
  } | null = null;
  private editInitialSpecialistIds: string[] = [];
  private editInitialAssistantIds: string[] = [];
  private editInitialEmail = '';
  private editInitialUsername = '';
  deleteModalVisible = false;
  isDeleteSaving = false;
  deletingUser: Usuario | null = null;
  deleteConfirmChecked = false;
  viewModalVisible = false;
  viewingUser: Usuario | null = null;
  viewSpecialists: SpecialistDto[] = [];
  viewAssistants: AssistantDto[] = [];
  isViewSpecialistsLoading = false;
  isViewAssistantsLoading = false;
  viewRelationError = '';
  restoreModalVisible = false;
  restoringUser: Usuario | null = null;
  isRestoreSaving = false;
  restoreConfirmChecked = false;
  activateModalVisible = false;
  activatingUser: Usuario | null = null;
  isActivateSaving = false;
  activateConfirmChecked = false;
  filterText = '';
  roleFilter = '';
  statusFilter: 'active' | 'inactive' | 'deleted' = 'active';
  pageSize = 5;
  page = 1;
  readonly pageSizeOptions = [5, 10, 25, 50];
  sortKey: 'nombre' | 'username' | 'correo' | 'rol' | 'estado' | 'ultimoIngreso' | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  private readonly sortFieldMap: SortKeyMap = {
    nombre: 'name',
    username: 'username',
    correo: 'email',
    estado: 'enabled',
    ultimoIngreso: 'lastLoginAt'
  };

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private staffService: StaffService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsuarios();
    this.setupAvailabilityValidators();
  }

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
    return this.sortedUsuarios.slice(start, start + this.pageSize);
  }

  get filteredUsuarios(): Usuario[] {
    const query = this.filterText.trim().toLowerCase();
    return this.usuarios.filter((usuario) => {
      const matchesText = !query ||
        usuario.nombre.toLowerCase().includes(query) ||
        usuario.username.toLowerCase().includes(query);
      const matchesRole = !this.roleFilter || usuario.rol === this.roleFilter;
      return matchesText && matchesRole;
    });
  }

  get sortedUsuarios(): Usuario[] {
    const items = [...this.filteredUsuarios];
    if (!this.sortKey) {
      return this.sortUsuarios(items);
    }

    if (isServerSortable(this.sortKey, this.sortFieldMap)) {
      return items;
    }

    return items.sort((a, b) => this.compareUsuarios(a, b, this.sortKey!, this.sortDir));
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

  toggleSort(key: 'nombre' | 'username' | 'correo' | 'rol' | 'estado' | 'ultimoIngreso'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.page = 1;
    if (isServerSortable(this.sortKey, this.sortFieldMap)) {
      this.loadUsuarios();
    }
  }

  getEstadoColor(estado: Usuario['estado']): string {
    if (estado === 'Activo') {
      return 'success';
    }
    if (estado === 'Eliminado') {
      return 'danger';
    }
    return 'secondary';
  }

  getRoleLabel(rol: string): string {
    return this.roleLabels[rol] ?? rol;
  }

  get isCurrentUserDirectorGeneral(): boolean {
    return this.authService.hasRole('ROLE_DIRECTOR_GENERAL');
  }

  canModifyUser(usuario: Usuario): boolean {
    if (this.isDirectorGeneralUser(usuario) && !this.isCurrentUserDirectorGeneral) {
      return false;
    }
    return true;
  }

  passwordsMatch(): boolean {
    const password = this.createUserForm.value.password;
    const confirm = this.createUserForm.value.confirmPassword;
    if (!password || !confirm) {
      return true;
    }
    return password === confirm;
  }

  editPasswordsValid(): boolean {
    const password = this.editUserForm.value.password;
    const confirmPassword = this.editUserForm.value.confirmPassword;

    if (!password && !confirmPassword) {
      return true;
    }

    if (!password || password.length < 8) {
      return false;
    }

    return password === confirmPassword;
  }

  hasEditChanges(): boolean {
    if (!this.editInitialValue) {
      return false;
    }

    const current = this.editUserForm.value;
    const currentSpecialistIds = this.normalizeIds(current.specialistIds);
    const currentAssistantIds = this.normalizeIds(current.assistantIds);
    const hasPassword = !!current.password || !!current.confirmPassword;
    const roleChanged = current.roles !== this.editInitialValue.roles;
    const enabledChanged = current.enabled !== this.editInitialValue.enabled;
    const hasFieldChanges = current.name !== this.editInitialValue.name ||
      current.email !== this.editInitialValue.email ||
      current.username !== this.editInitialValue.username ||
      (!this.isEditingCurrentUser && (roleChanged || enabledChanged));

    const hasSpecialistChanges = !this.compareIdLists(currentSpecialistIds, this.editInitialSpecialistIds);
    const hasAssistantChanges = !this.compareIdLists(currentAssistantIds, this.editInitialAssistantIds);

    return hasFieldChanges || hasPassword || hasSpecialistChanges || hasAssistantChanges;
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
        enabled: true,
        specialistIds: [],
        specialty: ''
      });
    }
  }

  toggleEditModal(value: boolean): void {
    this.editModalVisible = value;
    if (!value) {
      this.editingUser = null;
      this.editInitialValue = null;
      this.editingAssistantId = null;
      this.editingSpecialistId = null;
      this.editInitialSpecialistIds = [];
      this.editInitialAssistantIds = [];
      this.isEditSpecialistsLoading = false;
      this.isEditAssistantsLoading = false;
      this.editRelationError = '';
      this.roleChangeError = '';
      this.roleChangeConfirmChecked = false;
      this.disableConfirmChecked = false;
      this.auditUserMap = {};
      this.isAuditLoading = false;
      this.editUserForm.get('roles')?.enable({ emitEvent: false });
      this.editUserForm.get('enabled')?.enable({ emitEvent: false });
      this.editUserForm.reset({
        name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        roles: 'ROLE_TRABAJO_SOCIAL',
        enabled: true,
        specialistIds: [],
        assistantIds: [],
        specialty: ''
      });
      this.setEditAvailabilityValidators(null, '', '');
    }
  }

  openEditModal(usuario: Usuario): void {
    if (!this.canModifyUser(usuario)) {
      return;
    }
    this.editingUser = usuario;
    this.editRelationError = '';
    this.roleChangeError = '';
    this.roleChangeConfirmChecked = false;
    this.disableConfirmChecked = false;
    this.auditUserMap = {};
    this.loadAuditNames(usuario);
    const isCurrent = this.isCurrentUser(usuario);
    const initialValue = {
      name: usuario.nombre,
      email: usuario.correo,
      username: usuario.username,
      password: '',
      confirmPassword: '',
      roles: usuario.rol,
      enabled: usuario.estado === 'Activo',
      specialistIds: [],
      assistantIds: [],
      specialty: usuario.specialty ?? ''
    };
    this.editUserForm.setValue(initialValue);
    this.editInitialEmail = initialValue.email;
    this.editInitialUsername = initialValue.username;
    this.setEditAvailabilityValidators(usuario.id, initialValue.username, initialValue.email);
    if (isCurrent) {
      this.editUserForm.get('roles')?.disable({ emitEvent: false });
      this.editUserForm.get('enabled')?.disable({ emitEvent: false });
    } else {
      this.editUserForm.get('roles')?.enable({ emitEvent: false });
      this.editUserForm.get('enabled')?.enable({ emitEvent: false });
    }
    this.editInitialValue = {
      name: initialValue.name,
      email: initialValue.email,
      username: initialValue.username,
      roles: initialValue.roles,
      enabled: initialValue.enabled
    };
    this.editInitialSpecialistIds = [];
    this.editInitialAssistantIds = [];
    this.editModalVisible = true;
    if (usuario.rol === 'ROLE_ASISTENTE_ESPECIALISTA') {
      this.loadSpecialists();
      this.loadAssistantForUser(usuario.id);
    } else if (usuario.rol === 'ROLE_ESPECIALISTA') {
      this.loadAssistants();
      this.loadSpecialistForUser(usuario.id);
    }
  }

  openDeleteModal(usuario: Usuario): void {
    if (!this.canModifyUser(usuario)) {
      return;
    }
    this.deletingUser = usuario;
    this.deleteConfirmChecked = false;
    this.deleteModalVisible = true;
  }

  toggleDeleteModal(value: boolean): void {
    this.deleteModalVisible = value;
    if (!value) {
      this.deletingUser = null;
      this.deleteConfirmChecked = false;
    }
  }

  openViewModal(usuario: Usuario): void {
    this.viewingUser = usuario;
    this.auditUserMap = {};
    this.loadAuditNames(usuario);
    this.viewSpecialists = [];
    this.viewAssistants = [];
    this.viewRelationError = '';
    if (usuario.rol === 'ROLE_ESPECIALISTA') {
      this.loadViewAssistants(usuario.id);
    } else if (usuario.rol === 'ROLE_ASISTENTE_ESPECIALISTA') {
      this.loadViewSpecialists(usuario.id);
    }
    this.viewModalVisible = true;
  }

  toggleViewModal(value: boolean): void {
    this.viewModalVisible = value;
    if (!value) {
      this.viewingUser = null;
      this.auditUserMap = {};
      this.isAuditLoading = false;
      this.viewSpecialists = [];
      this.viewAssistants = [];
      this.isViewSpecialistsLoading = false;
      this.isViewAssistantsLoading = false;
      this.viewRelationError = '';
    }
  }

  submit(): void {
    if (this.createUserForm.invalid || this.createUserForm.pending || !this.passwordsMatch()) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    const formValue = this.createUserForm.value;
    if (formValue.roles === 'ROLE_ASISTENTE_ESPECIALISTA') {
      this.createAssistant(formValue);
      return;
    }
    if (formValue.roles === 'ROLE_ESPECIALISTA') {
      this.createSpecialist(formValue);
      return;
    }

    const payload: CreateUserRequest = {
      name: formValue.name,
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
      confirmPassword: formValue.confirmPassword,
      enabled: formValue.enabled,
      roles: formValue.roles ? [formValue.roles] : undefined
    };

    this.isCreateSaving = true;
    this.usersService.createUser(payload).subscribe({
      next: (createdUser) => {
        const nuevo = this.mapUsuario(createdUser);
        this.usuarios = [nuevo, ...this.usuarios];
        this.page = 1;
        this.isCreateSaving = false;
        this.toggleModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating user', error);
        this.isCreateSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  submitEdit(): void {
    if (this.editUserForm.invalid || this.editUserForm.pending || !this.editPasswordsValid()) {
      this.editUserForm.markAllAsTouched();
      return;
    }

    if (!this.editingUser) {
      return;
    }
    if (!this.canModifyUser(this.editingUser)) {
      return;
    }

    if (this.isRoleChanged && !this.roleChangeConfirmChecked) {
      return;
    }

    if (this.isDisablingUser && !this.disableConfirmChecked) {
      return;
    }

    const formValue = this.editUserForm.value;
    this.editRelationError = '';
    const payload: UpdateUserRequest = {
      name: formValue.name,
      email: formValue.email,
      username: formValue.username,
      enabled: formValue.enabled,
      roles: formValue.roles ? [formValue.roles] : undefined
    };

    if (this.isEditingCurrentUser && this.editInitialValue) {
      payload.enabled = this.editInitialValue.enabled;
      payload.roles = [this.editInitialValue.roles];
    }

    if (formValue.password) {
      payload.newPassword = formValue.password;
    }

    this.isEditSaving = true;
    this.usersService.updateUser(this.editingUser.id, payload).subscribe({
      next: (updatedUser) => {
        const updated = this.mapUsuario(updatedUser);
        this.usuarios = this.usuarios.map((usuario) => {
          if (usuario.id === this.editingUser?.id) {
            return updated;
          }
          return usuario;
        });

        if (formValue.roles === 'ROLE_ASISTENTE_ESPECIALISTA') {
          this.updateAssistantSpecialists(formValue.specialistIds ?? []);
          return;
        }
        if (formValue.roles === 'ROLE_ESPECIALISTA') {
          this.updateSpecialistAssistants(formValue.assistantIds ?? []);
          return;
        }

        this.isEditSaving = false;
        this.toggleEditModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error updating user', error);
        this.isEditSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  submitDelete(): void {
    if (!this.deletingUser || this.isDeleteSaving || !this.deleteConfirmChecked) {
      return;
    }
    if (!this.canModifyUser(this.deletingUser)) {
      return;
    }

    this.isDeleteSaving = true;
    this.usersService.deleteUser(this.deletingUser.id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter((usuario) => usuario.id !== this.deletingUser?.id);
        this.isDeleteSaving = false;
        this.toggleDeleteModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting user', error);
        this.isDeleteSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmActivate(usuario: Usuario): void {
    if (!this.canModifyUser(usuario)) {
      return;
    }
    this.activatingUser = usuario;
    this.activateConfirmChecked = false;
    this.activateModalVisible = true;
  }

  toggleActivateModal(value: boolean): void {
    this.activateModalVisible = value;
    if (!value) {
      this.activatingUser = null;
      this.isActivateSaving = false;
      this.activateConfirmChecked = false;
    }
  }

  submitActivate(): void {
    if (!this.activatingUser || this.isActivateSaving || !this.activateConfirmChecked) {
      return;
    }
    if (!this.canModifyUser(this.activatingUser)) {
      return;
    }

    this.isActivateSaving = true;
    this.usersService.updateUser(this.activatingUser.id, { enabled: true }).subscribe({
      next: (updatedUser) => {
        const updated = this.mapUsuario(updatedUser);
        if (this.statusFilter === 'inactive') {
          this.usuarios = this.usuarios.filter((usuario) => usuario.id !== this.activatingUser?.id);
        } else {
          this.usuarios = this.usuarios.map((usuario) => {
            if (usuario.id === this.activatingUser?.id) {
              return updated;
            }
            return usuario;
          });
        }
        this.isActivateSaving = false;
        this.toggleActivateModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error activating user', error);
        this.isActivateSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterText = input.value;
    this.page = 1;
  }

  onRoleFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.roleFilter = value;
    this.page = 1;
  }

  async exportUsers(format: 'csv' | 'excel'): Promise<void> {
    const rows = this.sortedUsuarios;
    await this.ensureSpecialtyMap(rows);
    await this.ensureAuditMap(rows);
    if (format === 'excel') {
      await this.exportUsersExcel(rows);
      return;
    }
    this.exportUsersCsv(rows);
  }

  onCreateRoleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'ROLE_ASISTENTE_ESPECIALISTA') {
      this.loadSpecialists();
      this.createUserForm.patchValue({ specialty: '' });
      this.setSpecialtyRequired(false);
    } else if (value === 'ROLE_ESPECIALISTA') {
      this.createUserForm.patchValue({ specialistIds: [] });
      this.setSpecialtyRequired(true);
    } else {
      this.createUserForm.patchValue({ specialistIds: [] });
      this.createUserForm.patchValue({ specialty: '' });
      this.setSpecialtyRequired(false);
    }
  }

  get isAssistantEspecialistaSelected(): boolean {
    return this.createUserForm.value.roles === 'ROLE_ASISTENTE_ESPECIALISTA';
  }

  get isEspecialistaSelected(): boolean {
    return this.createUserForm.value.roles === 'ROLE_ESPECIALISTA';
  }

  onEditRoleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.editRelationError = '';
    this.roleChangeError = '';
    this.roleChangeConfirmChecked = false;

    if (this.editingUser?.rol === 'ROLE_ESPECIALISTA' && value === 'ROLE_ASISTENTE_ESPECIALISTA') {
      this.editUserForm.patchValue({ roles: this.editingUser.rol });
      this.roleChangeError = 'No es posible cambiar a rol Asistente especialista porque este usuario ya es Especialista y requiere relaciones distintas.';
      return;
    }

    if (this.editingUser?.rol === 'ROLE_ASISTENTE_ESPECIALISTA' && value === 'ROLE_ESPECIALISTA') {
      this.editUserForm.patchValue({ roles: this.editingUser.rol });
      this.roleChangeError = 'No es posible cambiar a rol Especialista porque este usuario ya es Asistente especialista y requiere relaciones distintas.';
      return;
    }

    if (value === 'ROLE_ASISTENTE_ESPECIALISTA') {
      this.loadSpecialists();
      if (this.editingUser) {
        this.loadAssistantForUser(this.editingUser.id);
      }
      this.editUserForm.patchValue({ assistantIds: [] });
      this.editingSpecialistId = null;
      this.editInitialAssistantIds = [];
    } else if (value === 'ROLE_ESPECIALISTA') {
      this.loadAssistants();
      if (this.editingUser) {
        this.loadSpecialistForUser(this.editingUser.id);
      }
      this.editUserForm.patchValue({ specialistIds: [] });
      this.editingAssistantId = null;
      this.editInitialSpecialistIds = [];
    } else {
      this.editUserForm.patchValue({ specialistIds: [] });
      this.editUserForm.patchValue({ assistantIds: [] });
      this.editingAssistantId = null;
      this.editingSpecialistId = null;
      this.editInitialSpecialistIds = [];
      this.editInitialAssistantIds = [];
    }
  }

  get isEditAssistantEspecialistaSelected(): boolean {
    return this.editUserForm.value.roles === 'ROLE_ASISTENTE_ESPECIALISTA';
  }

  get isEditEspecialistaSelected(): boolean {
    return this.editUserForm.value.roles === 'ROLE_ESPECIALISTA';
  }

  get isEditingCurrentUser(): boolean {
    return !!this.editingUser && this.isCurrentUser(this.editingUser);
  }

  formatAuditDate(value?: string | null): string {
    return this.formatLastLogin(value ?? null);
  }

  getAuditUserLabel(id?: string | null): string {
    if (!id) {
      return 'Sistema';
    }
    const resolved = this.auditUserMap[id];
    if (!resolved) {
      return id;
    }
    return `${resolved.name} (${resolved.username})`;
  }

  get isRoleChanged(): boolean {
    if (!this.editInitialValue) {
      return false;
    }
    if (this.isEditingCurrentUser) {
      return false;
    }
    return this.editInitialValue.roles !== this.editUserForm.value.roles;
  }

  get isDisablingUser(): boolean {
    if (!this.editInitialValue) {
      return false;
    }
    return this.editInitialValue.enabled && this.editUserForm.value.enabled === false;
  }

  onEditEnabledChange(): void {
    if (this.editUserForm.value.enabled) {
      this.disableConfirmChecked = false;
    }
  }

  setStatusFilter(status: 'active' | 'inactive' | 'deleted'): void {
    if (this.statusFilter === status) {
      return;
    }
    this.statusFilter = status;
    this.page = 1;
    this.loadUsuarios();
  }

  get statusLabel(): string {
    if (this.statusFilter === 'active') {
      return 'Activos';
    }
    if (this.statusFilter === 'inactive') {
      return 'Inactivos';
    }
    return 'Eliminados';
  }

  isDeleted(usuario: Usuario): boolean {
    return usuario.estado === 'Eliminado';
  }

  isCurrentUser(usuario: Usuario): boolean {
    const currentId = this.authService.getStoredAuth()?.user?.id ?? null;
    return !!currentId && usuario.id === currentId;
  }

  confirmRestore(usuario: Usuario): void {
    if (!this.canModifyUser(usuario)) {
      return;
    }
    this.restoringUser = usuario;
    this.restoreConfirmChecked = false;
    this.restoreModalVisible = true;
  }

  toggleRestoreModal(value: boolean): void {
    this.restoreModalVisible = value;
    if (!value) {
      this.restoringUser = null;
      this.isRestoreSaving = false;
      this.restoreConfirmChecked = false;
    }
  }

  submitRestore(): void {
    if (!this.restoringUser || this.isRestoreSaving || !this.restoreConfirmChecked) {
      return;
    }
    if (!this.canModifyUser(this.restoringUser)) {
      return;
    }

    this.isRestoreSaving = true;
    this.usersService.restoreUser(this.restoringUser.id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter((item) => item.id !== this.restoringUser?.id);
        this.isRestoreSaving = false;
        this.toggleRestoreModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error restoring user', error);
        this.isRestoreSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  get emptyStateTitle(): string {
    return 'Sin resultados';
  }

  get emptyStateMessage(): string {
    if (this.filterText.trim()) {
      return 'No hay resultados para el filtro actual.';
    }
    return `No hay usuarios ${this.statusLabel.toLowerCase()} para mostrar.`;
  }

  fieldInvalid(field: string): boolean {
    const control = this.createUserForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  fieldInvalidFor(form: FormGroup, field: string): boolean {
    const control = form.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  private loadUsuarios(): void {
    this.isLoading = true;
    this.loadError = false;
    const params: UsersQueryParams = {
      status: this.statusFilter,
      sort: buildSortParams(this.sortKey, this.sortDir, this.sortFieldMap)
    };
    this.usersService.listUsers(params).pipe(delay(200)).subscribe({
      next: (users) => {
        this.usuarios = users.map((user) => this.mapUsuario(user));
        this.page = 1;
        this.loadSpecialtyMap();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading users', error);
        this.isLoading = false;
        this.loadError = true;
        this.cdr.detectChanges();
      }
    });
  }

  private loadSpecialists(): void {
    if (this.specialistsLoaded || this.isSpecialistsLoading) {
      return;
    }

    this.isSpecialistsLoading = true;
    this.editRelationError = '';
    this.staffService.listSpecialists().subscribe({
      next: (specialists) => {
        this.specialists = specialists;
        this.specialistsLoaded = true;
        this.isSpecialistsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading specialists', error);
        this.isSpecialistsLoading = false;
        this.editRelationError = 'No se pudo cargar la lista de especialistas.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadViewAssistants(userId: string): void {
    if (this.isViewAssistantsLoading) {
      return;
    }
    this.isViewAssistantsLoading = true;
    this.staffService.getSpecialistByUserId(userId).subscribe({
      next: (specialist) => {
        this.staffService.listAssistantsBySpecialist(specialist.id).subscribe({
          next: (assistants) => {
            this.viewAssistants = assistants;
            this.isViewAssistantsLoading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading specialist assistants', error);
            this.isViewAssistantsLoading = false;
            this.viewRelationError = 'No se pudieron cargar los asistentes asociados.';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error loading specialist info', error);
        this.isViewAssistantsLoading = false;
        this.viewRelationError = 'No se pudo cargar la informacion del especialista.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadViewSpecialists(userId: string): void {
    if (this.isViewSpecialistsLoading) {
      return;
    }
    this.isViewSpecialistsLoading = true;
    this.staffService.getAssistantByUserId(userId).subscribe({
      next: (assistant) => {
        this.staffService.listSpecialistsByAssistant(assistant.id).subscribe({
          next: (specialists) => {
            this.viewSpecialists = specialists;
            this.isViewSpecialistsLoading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading assistant specialists', error);
            this.isViewSpecialistsLoading = false;
            this.viewRelationError = 'No se pudieron cargar los especialistas asociados.';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error loading assistant info', error);
        this.isViewSpecialistsLoading = false;
        this.viewRelationError = 'No se pudo cargar la informacion del asistente.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadAssistants(): void {
    if (this.isAssistantsLoading) {
      return;
    }

    this.isAssistantsLoading = true;
    this.editRelationError = '';
    this.staffService.listAssistants().subscribe({
      next: (assistants) => {
        this.assistants = assistants;
        this.isAssistantsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading assistants', error);
        this.isAssistantsLoading = false;
        this.editRelationError = 'No se pudo cargar la lista de asistentes.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadAssistantForUser(userId: string): void {
    if (this.isEditSpecialistsLoading) {
      return;
    }
    this.isEditSpecialistsLoading = true;
    this.editRelationError = '';
    this.staffService.getAssistantByUserId(userId).subscribe({
      next: (assistant) => {
        this.editingAssistantId = assistant.id;
        const specialistIds = assistant.specialistIds ?? [];
        this.editUserForm.patchValue({
          specialistIds
        });
        this.editInitialSpecialistIds = [...specialistIds];
        this.isEditSpecialistsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading assistant', error);
        if (error?.status === 404) {
          this.editingAssistantId = null;
          this.editInitialSpecialistIds = [];
          this.editUserForm.patchValue({ specialistIds: [] });
          this.isEditSpecialistsLoading = false;
          this.editRelationError = '';
          this.cdr.detectChanges();
          return;
        }
        this.isEditSpecialistsLoading = false;
        this.editRelationError = 'No se pudo cargar la relacion de especialistas.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadSpecialistForUser(userId: string): void {
    if (this.isEditAssistantsLoading) {
      return;
    }
    this.isEditAssistantsLoading = true;
    this.editRelationError = '';
    this.staffService.getSpecialistByUserId(userId).subscribe({
      next: (specialist) => {
        this.editingSpecialistId = specialist.id;
        this.staffService.listAssistantsBySpecialist(specialist.id).subscribe({
          next: (assistants) => {
            const assistantIds = assistants.map((assistant) => assistant.id);
            this.editUserForm.patchValue({ assistantIds });
            this.editInitialAssistantIds = [...assistantIds];
            this.isEditAssistantsLoading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading specialist assistants', error);
            this.isEditAssistantsLoading = false;
            this.editRelationError = 'No se pudieron cargar los asistentes asociados.';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error loading specialist', error);
        if (error?.status === 404) {
          this.editingSpecialistId = null;
          this.editInitialAssistantIds = [];
          this.editUserForm.patchValue({ assistantIds: [] });
          this.isEditAssistantsLoading = false;
          this.editRelationError = '';
          this.cdr.detectChanges();
          return;
        }
        this.isEditAssistantsLoading = false;
        this.editRelationError = 'No se pudo cargar la informacion del especialista.';
        this.cdr.detectChanges();
      }
    });
  }

  private updateAssistantSpecialists(specialistIds: string[]): void {
    if (!this.editingAssistantId) {
      if (this.editingUser) {
        this.loadAssistantForUser(this.editingUser.id);
      }
      this.isEditSaving = false;
      this.editRelationError = 'No se pudo obtener el asistente para actualizar especialistas.';
      this.toggleEditModal(false);
      this.cdr.detectChanges();
      return;
    }

    this.staffService.updateAssistantSpecialists(this.editingAssistantId, specialistIds).subscribe({
      next: () => {
        this.isEditSaving = false;
        this.toggleEditModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error updating assistant specialists', error);
        this.isEditSaving = false;
        this.editRelationError = 'No se pudieron guardar los especialistas asociados.';
        this.cdr.detectChanges();
      }
    });
  }

  private updateSpecialistAssistants(assistantIds: string[]): void {
    if (!this.editingSpecialistId) {
      if (this.editingUser) {
        this.loadSpecialistForUser(this.editingUser.id);
      }
      this.isEditSaving = false;
      this.editRelationError = 'No se pudo obtener el especialista para actualizar asistentes.';
      this.toggleEditModal(false);
      this.cdr.detectChanges();
      return;
    }

    this.staffService.updateSpecialistAssistants(this.editingSpecialistId, assistantIds).subscribe({
      next: () => {
        this.isEditSaving = false;
        this.toggleEditModal(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error updating specialist assistants', error);
        this.isEditSaving = false;
        this.editRelationError = 'No se pudieron guardar los asistentes asociados.';
        this.cdr.detectChanges();
      }
    });
  }

  private createAssistant(formValue: any): void {
    const payload = {
      name: formValue.name,
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
      confirmPassword: formValue.confirmPassword,
      enabled: formValue.enabled,
      specialistIds: formValue.specialistIds ?? []
    };

    this.isCreateSaving = true;
    this.staffService.createAssistant(payload).subscribe({
      next: () => {
        this.isCreateSaving = false;
        this.toggleModal(false);
        this.loadUsuarios();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating assistant', error);
        this.isCreateSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  private createSpecialist(formValue: any): void {
    if (!formValue.specialty) {
      this.createUserForm.get('specialty')?.markAsTouched();
      return;
    }

    const payload: CreateUserRequest = {
      name: formValue.name,
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
      confirmPassword: formValue.confirmPassword,
      enabled: formValue.enabled,
      roles: ['ROLE_ESPECIALISTA']
    };

    this.isCreateSaving = true;
    this.usersService.createUser(payload).subscribe({
        next: (createdUser) => {
          this.staffService.createSpecialist({
            userId: createdUser.id,
            specialty: formValue.specialty
          }).subscribe({
            next: () => {
              this.specialtyMap[createdUser.id] = formValue.specialty;
              this.usuarios = [this.mapUsuario(createdUser), ...this.usuarios];
              this.page = 1;
              this.isCreateSaving = false;
              this.toggleModal(false);
              this.cdr.detectChanges();
            },
          error: (error) => {
            console.error('Error creating specialist relation', error);
            this.isCreateSaving = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Error creating specialist user', error);
        this.isCreateSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  private setSpecialtyRequired(required: boolean): void {
    const control = this.createUserForm.get('specialty');
    if (!control) {
      return;
    }
    if (required) {
      control.setValidators([Validators.required]);
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity();
  }

  private mapUsuario(user: UserAdministrationDTO): Usuario {
    const primaryRole = user.roles?.[0] ?? 'ROLE_SIN_ROL';
    const estado = user.deletedAt ? 'Eliminado' : (user.enabled ? 'Activo' : 'Inactivo');
    const ultimoIngresoTs = user.lastLoginAt ? Date.parse(user.lastLoginAt) : null;
    return {
      id: user.id,
      nombre: user.name,
      username: user.username,
      correo: user.email,
      rol: primaryRole,
      roles: user.roles ?? [],
      estado,
      ultimoIngreso: this.formatLastLogin(user.lastLoginAt),
      ultimoIngresoTs,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt ?? null,
      createdBy: user.createdBy ?? null,
      updatedAt: user.updatedAt ?? null,
      updatedBy: user.updatedBy ?? null,
      deletedAt: user.deletedAt ?? null,
      deletedBy: user.deletedBy ?? null,
      specialty: this.specialtyMap[user.id] ?? null
    };
  }

  private formatLastLogin(value?: string | null): string {
    if (!value) {
      return 'Sin registro';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Sin registro';
    }

    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private sortUsuarios(items: Usuario[]): Usuario[] {
    if (this.filterText.trim()) {
      return items;
    }

    const currentUsername = this.authService.getStoredAuth()?.user?.username ?? null;
    return [...items].sort((a, b) => {
      if (currentUsername) {
        const isCurrentA = a.username === currentUsername;
        const isCurrentB = b.username === currentUsername;
        if (isCurrentA && !isCurrentB) {
          return -1;
        }
        if (isCurrentB && !isCurrentA) {
          return 1;
        }
      }
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });
  }

  private loadSpecialtyMap(): void {
    if (this.isSpecialtyMapLoading) {
      return;
    }
    this.isSpecialtyMapLoading = true;
    this.staffService.listSpecialists().subscribe({
      next: (specialists) => {
        this.specialtyMap = specialists.reduce<Record<string, string>>((acc, specialist) => {
          acc[specialist.userId] = specialist.specialty;
          return acc;
        }, {});
        this.usuarios = this.usuarios.map((usuario) => {
          if (usuario.rol !== 'ROLE_ESPECIALISTA') {
            return usuario;
          }
          return {
            ...usuario,
            specialty: this.specialtyMap[usuario.id] ?? null
          };
        });
        this.isSpecialtyMapLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading specialty map', error);
        this.isSpecialtyMapLoading = false;
      }
    });
  }

  private async ensureSpecialtyMap(rows: Usuario[]): Promise<void> {
    if (this.isSpecialtyMapLoading) {
      return;
    }
    const needs = rows.some((usuario) => usuario.rol === 'ROLE_ESPECIALISTA' && !this.specialtyMap[usuario.id]);
    if (!needs) {
      return;
    }
    this.isSpecialtyMapLoading = true;
    try {
      const specialists = await firstValueFrom(this.staffService.listSpecialists());
      this.specialtyMap = specialists.reduce<Record<string, string>>((acc, specialist) => {
        acc[specialist.userId] = specialist.specialty;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error loading specialty map for export', error);
    } finally {
      this.isSpecialtyMapLoading = false;
    }
  }

  private async ensureAuditMap(rows: Usuario[]): Promise<void> {
    const auditIds = rows.flatMap((usuario) => [usuario.createdBy, usuario.updatedBy, usuario.deletedBy])
      .filter((id): id is string => !!id);
    const uniqueAuditIds = Array.from(new Set(auditIds)).filter((id) => !this.auditUserMap[id]);
    if (!uniqueAuditIds.length) {
      return;
    }
    try {
      const resolved = await firstValueFrom(this.usersService.resolveUsers(uniqueAuditIds));
      resolved.forEach((item) => {
        this.auditUserMap[item.id] = item;
      });
    } catch (error) {
      console.error('Error resolving audit users for export', error);
    }
  }

  private exportUsersCsv(rows: Usuario[]): void {
    const { headers, rows: dataRows } = this.buildExportRows(rows);
    const csvContent = this.buildCsv([headers, ...dataRows]);
    const mimeType = 'text/csv;charset=utf-8;';
    const extension = 'csv';
    const fileName = this.buildExportFileName(extension);

    const blob = new Blob([csvContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async exportUsersExcel(rows: Usuario[]): Promise<void> {
    const { headers, rows: dataRows } = this.buildExportRows(rows);
    const exceljs = await import('exceljs');
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');

    worksheet.columns = headers.map((header, index) => ({
      header,
      key: `col${index}`,
      width: Math.min(45, Math.max(14, header.length + 4))
    }));
    worksheet.getRow(1).font = { bold: true };
    dataRows.forEach((row) => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fileName = this.buildExportFileName('xlsx');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private buildExportRows(rows: Usuario[]): { headers: string[]; rows: Array<Array<string | number>> } {
    const headers = [
      'Nombre',
      'Usuario',
      'Correo',
      'Roles',
      'Especialidad',
      'Estado',
      'Ultimo ingreso',
      'Creado',
      'Creado por',
      'Actualizado',
      'Actualizado por'
    ];
    const includeDeleted = this.statusFilter === 'deleted';
    if (includeDeleted) {
      headers.push('Eliminado', 'Eliminado por');
    }
    const data = rows.map((usuario) => ([
      usuario.nombre,
      usuario.username,
      usuario.correo,
      this.getUserRolesLabel(usuario),
      this.getUserSpecialty(usuario),
      usuario.estado,
      usuario.ultimoIngreso,
      this.formatAuditDate(usuario.createdAt),
      this.getAuditUserLabel(usuario.createdBy),
      this.formatAuditDate(usuario.updatedAt),
      this.getAuditUserLabel(usuario.updatedBy)
    ]));
    const rowsWithDeleted = includeDeleted
      ? data.map((row, index) => ([
        ...row,
        this.formatAuditDate(rows[index].deletedAt),
        this.getAuditUserLabel(rows[index].deletedBy)
      ]))
      : data;

    return { headers, rows: rowsWithDeleted };
  }

  private buildExportFileName(extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `usuarios-${this.statusFilter}-${timestamp}.${extension}`;
  }

  private getUserRolesLabel(usuario: Usuario): string {
    const roles = usuario.roles?.length ? usuario.roles : [usuario.rol];
    const labels = roles.map((role) => this.getRoleLabel(role));
    return labels.join(' | ');
  }

  private getUserSpecialty(usuario: Usuario): string {
    if (usuario.rol !== 'ROLE_ESPECIALISTA') {
      return '';
    }
    return usuario.specialty ?? this.specialtyMap[usuario.id] ?? '';
  }

  private loadAuditNames(usuario: Usuario): void {
    const ids = [usuario.createdBy, usuario.updatedBy].filter((id): id is string => !!id);
    if (!ids.length) {
      this.auditUserMap = {};
      this.isAuditLoading = false;
      return;
    }

    const uniqueIds = Array.from(new Set(ids));
    this.isAuditLoading = true;
    this.usersService.resolveUsers(uniqueIds).subscribe({
      next: (resolved) => {
        this.auditUserMap = resolved.reduce<Record<string, ResolvedUserRef>>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});
        this.isAuditLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error resolving audit users', error);
        this.auditUserMap = {};
        this.isAuditLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeIds(ids?: string[] | null): string[] {
    if (!Array.isArray(ids)) {
      return [];
    }
    return ids.filter((value) => !!value);
  }

  private compareIdLists(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    return sortedA.every((value, index) => value === sortedB[index]);
  }

  private compareUsuarios(
    a: Usuario,
    b: Usuario,
    key: 'nombre' | 'username' | 'correo' | 'rol' | 'estado' | 'ultimoIngreso',
    dir: 'asc' | 'desc'
  ): number {
    let result = 0;
    if (key === 'ultimoIngreso') {
      const aVal = a.ultimoIngresoTs ?? 0;
      const bVal = b.ultimoIngresoTs ?? 0;
      result = aVal - bVal;
    } else {
      const aVal = String(a[key] ?? '');
      const bVal = String(b[key] ?? '');
      result = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
    }
    return dir === 'asc' ? result : -result;
  }

  private buildCsv(rows: Array<Array<string | number>>): string {
    const bom = '\ufeff';
    const csvRows = rows.map((row) => row.map((value) => this.escapeCsvValue(value)).join(','));
    return bom + csvRows.join('\n');
  }

  private escapeCsvValue(value: string | number): string {
    const text = String(value ?? '');
    const escaped = text.replace(/"/g, '""');
    if (/[",\n]/.test(escaped)) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  private setupAvailabilityValidators(): void {
    const usernameControl = this.createUserForm.get('username');
    const emailControl = this.createUserForm.get('email');
    if (usernameControl) {
      usernameControl.setAsyncValidators(this.buildAvailabilityValidator('username', () => null, () => ''));
      usernameControl.updateValueAndValidity({ emitEvent: false });
    }
    if (emailControl) {
      emailControl.setAsyncValidators(this.buildAvailabilityValidator('email', () => null, () => ''));
      emailControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private setEditAvailabilityValidators(excludeId: string | null, username: string, email: string): void {
    const usernameControl = this.editUserForm.get('username');
    const emailControl = this.editUserForm.get('email');
    if (usernameControl) {
      usernameControl.setAsyncValidators(this.buildAvailabilityValidator('username', () => excludeId, () => username));
      usernameControl.updateValueAndValidity({ emitEvent: false });
    }
    if (emailControl) {
      emailControl.setAsyncValidators(this.buildAvailabilityValidator('email', () => excludeId, () => email));
      emailControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private buildAvailabilityValidator(
    field: 'username' | 'email',
    getExcludeId: () => string | null,
    getInitialValue: () => string
  ): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        return of(null);
      }

      if (field === 'email' && control.errors?.['email']) {
        return of(null);
      }

      if (value === getInitialValue()) {
        return of(null);
      }

      const excludeId = getExcludeId();
      return timer(400).pipe(
        switchMap(() => this.usersService.checkAvailability({
          username: field === 'username' ? value : undefined,
          email: field === 'email' ? value : undefined,
          excludeId: excludeId ?? undefined
        })),
        map((response) => {
          const available = field === 'username' ? response.usernameAvailable : response.emailAvailable;
          return available ? null : { [field === 'username' ? 'usernameTaken' : 'emailTaken']: true };
        }),
        catchError(() => of(null))
      );
    };
  }

  onCreateUsernameBlur(): void {
    this.createUserForm.get('username')?.markAsTouched();
  }

  onCreateEmailBlur(): void {
    this.createUserForm.get('email')?.markAsTouched();
  }

  onEditUsernameBlur(): void {
    this.editUserForm.get('username')?.markAsTouched();
  }

  onEditEmailBlur(): void {
    this.editUserForm.get('email')?.markAsTouched();
  }

  private isDirectorGeneralUser(usuario: Usuario): boolean {
    if (usuario.rol === 'ROLE_DIRECTOR_GENERAL') {
      return true;
    }
    return usuario.roles?.includes('ROLE_DIRECTOR_GENERAL') ?? false;
  }
}
