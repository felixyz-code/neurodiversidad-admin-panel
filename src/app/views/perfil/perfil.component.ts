import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

import {
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
  RowComponent,
  SpinnerComponent
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

import { AuthService, AuthUser } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { UpdateUserRequest } from '../../models/users.models';

@Component({
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormFloatingDirective,
    FormControlDirective,
    ButtonDirective,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    SpinnerComponent,
    IconDirective
  ]
})
export class PerfilComponent implements OnInit {
  private fb = new FormBuilder();

  user: AuthUser | null = null;
  isLoading = false;
  isSaving = false;
  confirmChecked = false;
  confirmModalVisible = false;
  loadError = '';
  saveError = '';

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]]
  });

  private initialValue: { name: string; email: string; username: string } | null = null;
  private initialEmail = '';
  private initialUsername = '';

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.form.valueChanges.subscribe(() => {
      if (this.confirmChecked) {
        this.confirmChecked = false;
      }
    });
    this.setupAvailabilityValidators();
  }

  get rolesLabel(): string {
    return this.user?.roles?.join(', ') ?? '-';
  }

  get isSaveDisabled(): boolean {
    return this.isSaving || this.form.invalid || !this.hasChanges();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.loadError = '';
    this.authService.ensureMe().subscribe({
      next: (user) => {
        this.user = user;
        this.form.setValue({
          name: user.name ?? '',
          email: user.email ?? '',
          username: user.username ?? ''
        });
        this.initialValue = {
          name: user.name ?? '',
          email: user.email ?? '',
          username: user.username ?? ''
        };
        this.initialEmail = user.email ?? '';
        this.initialUsername = user.username ?? '';
        this.setAvailabilityValidators(user.id);
        this.confirmChecked = false;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = 'No se pudo cargar el perfil.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  submit(): void {
    if (!this.user || this.form.invalid || !this.hasChanges()) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirmChecked = false;
    this.confirmModalVisible = true;
  }

  confirmSave(): void {
    if (!this.confirmChecked) {
      return;
    }

    this.confirmModalVisible = false;
    this.performSave();
  }

  private performSave(): void {
    const payload = this.buildUpdatePayload();
    if (!payload) {
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.usersService.updateUser(this.user!.id, payload).subscribe({
      next: () => {
        this.authService.me().subscribe({
          next: (updated) => {
            this.user = updated;
            this.form.setValue({
              name: updated.name ?? '',
              email: updated.email ?? '',
              username: updated.username ?? ''
            });
            this.initialValue = {
              name: updated.name ?? '',
              email: updated.email ?? '',
              username: updated.username ?? ''
            };
            this.initialEmail = updated.email ?? '';
            this.initialUsername = updated.username ?? '';
            this.setAvailabilityValidators(updated.id);
            this.confirmChecked = false;
            this.isSaving = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.isSaving = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.saveError = 'No se pudieron guardar los cambios.';
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildUpdatePayload(): UpdateUserRequest | null {
    if (!this.initialValue) {
      return null;
    }

    const current = this.form.value;
    const payload: UpdateUserRequest = {};
    if (current.name !== this.initialValue.name) {
      payload.name = current.name;
    }
    if (current.email !== this.initialValue.email) {
      payload.email = current.email;
    }
    if (current.username !== this.initialValue.username) {
      payload.username = current.username;
    }
    return Object.keys(payload).length ? payload : null;
  }

  private hasChanges(): boolean {
    if (!this.initialValue) {
      return false;
    }
    const current = this.form.value;
    return current.name !== this.initialValue.name ||
      current.email !== this.initialValue.email ||
      current.username !== this.initialValue.username;
  }

  private setupAvailabilityValidators(): void {
    const usernameControl = this.form.get('username');
    const emailControl = this.form.get('email');
    if (usernameControl) {
      usernameControl.setAsyncValidators(this.buildAvailabilityValidator('username'));
      usernameControl.updateValueAndValidity({ emitEvent: false });
    }
    if (emailControl) {
      emailControl.setAsyncValidators(this.buildAvailabilityValidator('email'));
      emailControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private setAvailabilityValidators(userId: string): void {
    const usernameControl = this.form.get('username');
    const emailControl = this.form.get('email');
    if (usernameControl) {
      usernameControl.setAsyncValidators(this.buildAvailabilityValidator('username', userId));
      usernameControl.updateValueAndValidity({ emitEvent: false });
    }
    if (emailControl) {
      emailControl.setAsyncValidators(this.buildAvailabilityValidator('email', userId));
      emailControl.updateValueAndValidity({ emitEvent: false });
    }
  }

  private buildAvailabilityValidator(field: 'username' | 'email', excludeId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = String(control.value ?? '').trim();
      if (!value) {
        return of(null);
      }

      if (field === 'email' && control.errors?.['email']) {
        return of(null);
      }

      if (field === 'username' && value === this.initialUsername) {
        return of(null);
      }
      if (field === 'email' && value === this.initialEmail) {
        return of(null);
      }

      return timer(400).pipe(
        switchMap(() => this.usersService.checkAvailability({
          username: field === 'username' ? value : undefined,
          email: field === 'email' ? value : undefined,
          excludeId
        })),
        map((response) => {
          const available = field === 'username' ? response.usernameAvailable : response.emailAvailable;
          return available ? null : { [field === 'username' ? 'usernameTaken' : 'emailTaken']: true };
        }),
        catchError(() => of(null))
      );
    };
  }

  onUsernameBlur(): void {
    this.form.get('username')?.markAsTouched();
  }

  onEmailBlur(): void {
    this.form.get('email')?.markAsTouched();
  }
}
