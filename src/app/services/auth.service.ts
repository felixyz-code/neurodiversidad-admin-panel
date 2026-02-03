import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  enabled: boolean;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
  tokenType: string;
}

export interface StoredAuth {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  user: AuthUser;
  storedAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'auth';
  private meCache: AuthUser | null = null;
  private meCheckedAt = 0;

  constructor(private http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, payload).pipe(
      tap((response) => this.persistAuth(response))
    );
  }

  logout(): Observable<string> {
    return this.http.post(`${API_URL}/users/logout`, null, { responseType: 'text' });
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${API_URL}/auth/me`).pipe(
      tap((user) => {
        this.meCache = user;
        this.meCheckedAt = Date.now();
        this.updateStoredUser(user);
      })
    );
  }

  ensureMe(): Observable<AuthUser> {
    if (this.meCache && !this.isStoredAuthExpired()) {
      return of(this.meCache);
    }

    return this.me();
  }

  getStoredAuth(): StoredAuth | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const stored = JSON.parse(raw) as StoredAuth;
      return this.normalizeStoredAuth(stored);
    } catch {
      return null;
    }
  }

  isStoredAuthExpired(): boolean {
    const stored = this.getStoredAuth();
    if (!stored) {
      return true;
    }

    const storedAt = stored.storedAt ?? 0;
    return Date.now() > storedAt + stored.expiresIn;
  }

  hasRole(role: string): boolean {
    const stored = this.getStoredAuth();
    if (!stored) {
      return false;
    }

    return stored.user?.roles?.includes(role) ?? false;
  }

  clearAuth(): void {
    localStorage.removeItem(this.storageKey);
    this.meCache = null;
    this.meCheckedAt = 0;
  }

  private persistAuth(response: LoginResponse): void {
    const stored: StoredAuth = {
      accessToken: response.accessToken,
      expiresIn: response.expiresIn,
      tokenType: response.tokenType,
      user: response.user,
      storedAt: Date.now()
    };

    localStorage.setItem(this.storageKey, JSON.stringify(stored));
    this.meCache = response.user;
    this.meCheckedAt = Date.now();
  }

  private updateStoredUser(user: AuthUser): void {
    const stored = this.getStoredAuth();
    if (!stored) {
      return;
    }

    const next: StoredAuth = {
      ...stored,
      user
    };

    localStorage.setItem(this.storageKey, JSON.stringify(next));
  }

  private normalizeStoredAuth(stored: StoredAuth): StoredAuth {
    if (stored.storedAt) {
      return stored;
    }

    const expMs = this.getTokenExpiryMs(stored.accessToken);
    const now = Date.now();
    const inferredStoredAt = expMs ? Math.max(0, expMs - stored.expiresIn) : now;
    const normalized: StoredAuth = {
      ...stored,
      storedAt: inferredStoredAt
    };

    localStorage.setItem(this.storageKey, JSON.stringify(normalized));
    return normalized;
  }

  private getTokenExpiryMs(token: string | undefined): number | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
      const decoded = atob(padded);
      const data = JSON.parse(decoded) as { exp?: number };
      if (!data.exp) {
        return null;
      }
      return data.exp * 1000;
    } catch {
      return null;
    }
  }
}
