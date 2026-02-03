import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgScrollbar } from 'ngx-scrollbar';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { IconDirective } from '@coreui/icons-angular';
import {
  ContainerComponent,
  ShadowOnScrollDirective,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarFooterComponent,
  SidebarHeaderComponent,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerDirective
} from '@coreui/angular';

import { DefaultFooterComponent, DefaultHeaderComponent } from './';
import { navItems } from './_nav';
import { AuthService, AuthUser } from '../../services/auth.service';
import { StaffService } from '../../services/staff.service';

function isOverflown(element: HTMLElement) {
  return (
    element.scrollHeight > element.clientHeight ||
    element.scrollWidth > element.clientWidth
  );
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  imports: [
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarBrandComponent,
    SidebarNavComponent,
    SidebarFooterComponent,
    SidebarToggleDirective,
    SidebarTogglerDirective,
    ContainerComponent,
    DefaultFooterComponent,
    DefaultHeaderComponent,
    NgScrollbar,
    RouterOutlet,
    RouterLink,
    ShadowOnScrollDirective
  ]
})
export class DefaultLayoutComponent implements OnInit {
  public navItems = [...navItems];

  private readonly allNavUrls = new Set(navItems.map((item) => item.url).filter((url): url is string => !!url));

  constructor(
    private authService: AuthService,
    private staffService: StaffService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const stored = this.authService.getStoredAuth();
    if (stored?.user) {
      const baseAllowed = this.resolveAllowedRoutesFromRoles(stored.user.roles ?? []);
      this.setNavItems(baseAllowed);
    }

    this.authService.ensureMe().pipe(
      switchMap((user) => this.resolveAllowedRoutes(user))
    ).subscribe((allowed) => {
      this.setNavItems(allowed);
    });
  }

  private setNavItems(allowed: Set<string>): void {
    this.navItems = navItems.filter((item) => {
      if (!item.url) {
        return true;
      }
      return typeof item.url === 'string' && allowed.has(item.url);
    });
    this.cdr.detectChanges();
  }

  private resolveAllowedRoutesFromRoles(roles: string[]): Set<string> {
    if (roles.includes('ROLE_DIRECTOR_GENERAL') || roles.includes('ROLE_ASISTENTE_GENERAL')) {
      return new Set(this.allNavUrls);
    }

    const allowed = new Set<string>(['/dashboard']);
    if (roles.includes('ROLE_FINANZAS')) {
      allowed.add('/finanzas');
    }
    if (roles.includes('ROLE_RRHH')) {
      allowed.add('/usuarios');
      allowed.add('/reclutamiento');
    }
    if (roles.includes('ROLE_CAPACITACION')) {
      allowed.add('/reclutamiento');
    }
    return allowed;
  }

  private resolveAllowedRoutes(user: AuthUser) {
    const roles = user.roles ?? [];

    if (roles.includes('ROLE_DIRECTOR_GENERAL') || roles.includes('ROLE_ASISTENTE_GENERAL')) {
      return of(new Set(this.allNavUrls));
    }

    const allowed = new Set<string>(['/dashboard']);

    if (roles.includes('ROLE_FINANZAS')) {
      allowed.add('/finanzas');
    }

    if (roles.includes('ROLE_RRHH')) {
      allowed.add('/usuarios');
      allowed.add('/reclutamiento');
    }

    if (roles.includes('ROLE_CAPACITACION')) {
      allowed.add('/reclutamiento');
    }

    const checks: Array<Observable<string[]>> = [];

    if (roles.includes('ROLE_ESPECIALISTA')) {
      checks.push(
        this.staffService.getSpecialistByUserId(user.id).pipe(
          map((specialist) => [specialist.specialty === 'FISIOTERAPIA' ? '/sesiones' : '/citas']),
          catchError(() => of([]))
        )
      );
    }

    if (roles.includes('ROLE_ASISTENTE_ESPECIALISTA')) {
      checks.push(
        this.staffService.getAssistantByUserId(user.id).pipe(
          switchMap((assistant) => this.staffService.listSpecialistsByAssistant(assistant.id)),
          map((specialists) => {
            const routes: string[] = [];
            const hasFisio = specialists.some((specialist) => specialist.specialty === 'FISIOTERAPIA');
            const hasOther = specialists.some((specialist) => specialist.specialty !== 'FISIOTERAPIA');
            if (hasFisio) {
              routes.push('/sesiones');
            }
            if (hasOther) {
              routes.push('/citas');
            }
            return routes;
          }),
          catchError(() => of([]))
        )
      );
    }

    if (!checks.length) {
      return of(allowed);
    }

    return forkJoin(checks).pipe(
      map((results) => {
        results.flat().forEach((route) => allowed.add(route));
        return allowed;
      })
    );
  }
}
