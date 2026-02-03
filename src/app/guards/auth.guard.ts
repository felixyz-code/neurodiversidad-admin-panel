import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { StaffService } from '../services/staff.service';

const ROLE_DIRECTOR_GENERAL = 'ROLE_DIRECTOR_GENERAL';
const ROLE_ASISTENTE_GENERAL = 'ROLE_ASISTENTE_GENERAL';
const ROLE_FINANZAS = 'ROLE_FINANZAS';
const ROLE_RRHH = 'ROLE_RRHH';
const ROLE_CAPACITACION = 'ROLE_CAPACITACION';
const ROLE_TRABAJO_SOCIAL = 'ROLE_TRABAJO_SOCIAL';
const ROLE_COMPRAS = 'ROLE_COMPRAS';
const ROLE_RP = 'ROLE_RP';
const ROLE_ESPECIALISTA = 'ROLE_ESPECIALISTA';
const ROLE_ASISTENTE_ESPECIALISTA = 'ROLE_ASISTENTE_ESPECIALISTA';
const SPECIALTY_FISIOTERAPIA = 'FISIOTERAPIA';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const staffService = inject(StaffService);
  const router = inject(Router);

  const stored = authService.getStoredAuth();
  if (!stored || authService.isStoredAuthExpired()) {
    authService.clearAuth();
    router.navigate(['/login']);
    return of(false);
  }

  const targetPath = getRootPath(state.url);

  return authService.ensureMe().pipe(
    switchMap((user) => {
      const roles = user.roles ?? [];

      if (roles.includes(ROLE_DIRECTOR_GENERAL) || roles.includes(ROLE_ASISTENTE_GENERAL)) {
        return of(true);
      }

      const baseAllowed = getBaseAllowedRoutes(roles);
      if (baseAllowed.has(targetPath)) {
        return of(true);
      }

      if (targetPath === '/citas' || targetPath === '/sesiones') {
        return checkAppointmentsAccess(roles, user.id, targetPath, staffService);
      }

      return of(false);
    }),
    map((allowed) => {
      if (!allowed) {
        router.navigate(['/dashboard']);
      }
      return allowed;
    }),
    catchError(() => {
      authService.clearAuth();
      router.navigate(['/login']);
      return of(false);
    })
  );
};

const DEFAULT_ALLOWED = new Set(['/dashboard', '/perfil', '/404', '/500']);

const getBaseAllowedRoutes = (roles: string[]): Set<string> => {
  const allowed = new Set(DEFAULT_ALLOWED);

  if (roles.includes(ROLE_FINANZAS)) {
    allowed.add('/finanzas');
  }

  if (roles.includes(ROLE_RRHH)) {
    allowed.add('/usuarios');
    allowed.add('/reclutamiento');
  }

  if (roles.includes(ROLE_CAPACITACION)) {
    allowed.add('/reclutamiento');
  }

  if (roles.includes(ROLE_TRABAJO_SOCIAL)) {
    // dashboard + perfil only
  }

  if (roles.includes(ROLE_COMPRAS)) {
    // dashboard + perfil only
  }

  if (roles.includes(ROLE_RP)) {
    // dashboard + perfil only
  }

  if (roles.includes(ROLE_ESPECIALISTA) || roles.includes(ROLE_ASISTENTE_ESPECIALISTA)) {
    // dashboard + perfil only, citas/sesiones se resuelven dinámicamente
  }

  return allowed;
};

const checkAppointmentsAccess = (
  roles: string[],
  userId: string,
  targetPath: string,
  staffService: StaffService
) => {
  const checks = [];

  if (roles.includes(ROLE_ESPECIALISTA)) {
    checks.push(
      staffService.getSpecialistByUserId(userId).pipe(
        map((specialist) => {
          const allowedPath = specialist.specialty === SPECIALTY_FISIOTERAPIA ? '/sesiones' : '/citas';
          return allowedPath === targetPath;
        }),
        catchError(() => of(false))
      )
    );
  }

  if (roles.includes(ROLE_ASISTENTE_ESPECIALISTA)) {
    checks.push(
      staffService.getAssistantByUserId(userId).pipe(
        switchMap((assistant) => staffService.listSpecialistsByAssistant(assistant.id)),
        map((specialists) => {
          const hasFisio = specialists.some((specialist) => specialist.specialty === SPECIALTY_FISIOTERAPIA);
          const hasOther = specialists.some((specialist) => specialist.specialty !== SPECIALTY_FISIOTERAPIA);
          if (targetPath === '/sesiones') {
            return hasFisio;
          }
          if (targetPath === '/citas') {
            return hasOther;
          }
          return false;
        }),
        catchError(() => of(false))
      )
    );
  }

  if (!checks.length) {
    return of(false);
  }

  return forkJoin(checks).pipe(
    map((results) => results.some(Boolean))
  );
};

const getRootPath = (url: string): string => {
  const clean = url.split('?')[0].split('#')[0];
  const segments = clean.split('/').filter(Boolean);
  return segments.length ? `/${segments[0]}` : '/';
};
