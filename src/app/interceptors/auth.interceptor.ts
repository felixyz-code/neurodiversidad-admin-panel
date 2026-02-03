import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const stored = authService.getStoredAuth();

  if (!stored || authService.isStoredAuthExpired()) {
    return next(req);
  }

  const authHeader = `${stored.tokenType} ${stored.accessToken}`;
  const authRequest = req.clone({
    setHeaders: {
      Authorization: authHeader
    }
  });

  return next(authRequest);
};
