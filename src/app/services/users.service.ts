import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { buildHttpParams } from '../shared/utils/http-params';
import {
  CreateUserRequest,
  ResolvedUserRef,
  UpdateUserRequest,
  UserAvailabilityResponse,
  UserAdministrationDTO,
  UsersQueryParams
} from '../models/users.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  listUsers(params: UsersQueryParams = {}): Observable<UserAdministrationDTO[]> {
    return this.http.get<UserAdministrationDTO[]>(`${API_URL}/admin/users`, {
      params: buildHttpParams({
        status: params.status,
        text: params.text,
        enabled: params.enabled,
        roleName: params.roleName,
        sort: params.sort
      })
    });
  }

  updateUser(id: string, payload: UpdateUserRequest): Observable<UserAdministrationDTO> {
    return this.http.put<UserAdministrationDTO>(`${API_URL}/admin/users/${id}`, payload);
  }

  createUser(payload: CreateUserRequest): Observable<UserAdministrationDTO> {
    return this.http.post<UserAdministrationDTO>(`${API_URL}/admin/users`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/admin/users/${id}`);
  }

  restoreUser(id: string): Observable<void> {
    return this.http.patch<void>(`${API_URL}/admin/users/${id}/restore`, null);
  }

  resolveUsers(userIds: string[]): Observable<ResolvedUserRef[]> {
    return this.http.post<ResolvedUserRef[]>(`${API_URL}/admin/users/resolve`, { userIds });
  }

  checkAvailability(params: { username?: string; email?: string; excludeId?: string }): Observable<UserAvailabilityResponse> {
    return this.http.get<UserAvailabilityResponse>(`${API_URL}/admin/users/availability`, {
      params: buildHttpParams({
        username: params.username,
        email: params.email,
        excludeId: params.excludeId
      })
    });
  }
}
