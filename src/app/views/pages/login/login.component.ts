import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardGroupComponent,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  FormDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import { SpinnerComponent } from '@coreui/angular';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [ContainerComponent, RowComponent, ColComponent, CardGroupComponent, CardComponent, CardBodyComponent, FormDirective, InputGroupComponent, InputGroupTextDirective, IconDirective, FormControlDirective, ButtonDirective, FormsModule, SpinnerComponent]
})
export class LoginComponent {
  username = '';
  password = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.authService.login({ username: this.username, password: this.password }).pipe(
      timeout(10000),
      finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.password = '';
        if (error?.name === 'TimeoutError') {
          this.errorMessage = 'La solicitud está tardando. Intenta nuevamente.';
          this.cdr.detectChanges();
          return;
        }
        if (error?.status === 401 || error?.status === 403) {
          this.errorMessage = 'Credenciales incorrectas. Verifica tu usuario y contrasena.';
        } else {
          this.errorMessage = 'No se pudo iniciar sesion. Intenta de nuevo en unos minutos.';
        }
        this.cdr.detectChanges();
        console.error('Login failed', error);
      }
    });
  }
}
