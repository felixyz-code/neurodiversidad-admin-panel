import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import {
  AssistantDto,
  CreateAssistantRequest,
  CreateSpecialistRequest,
  SpecialistDto,
  UpdateAssistantSpecialistsRequest,
  UpdateSpecialistAssistantsRequest
} from '../models/staff.models';

@Injectable({ providedIn: 'root' })
export class StaffService {
  constructor(private http: HttpClient) {}

  listSpecialists(): Observable<SpecialistDto[]> {
    return this.http.get<SpecialistDto[]>(`${API_URL}/staff/specialists`);
  }

  listAssistants(): Observable<AssistantDto[]> {
    return this.http.get<AssistantDto[]>(`${API_URL}/staff/assistants`);
  }

  getAssistantByUserId(userId: string): Observable<AssistantDto> {
    return this.http.get<AssistantDto>(`${API_URL}/staff/assistants/by-user/${userId}`);
  }

  getSpecialistByUserId(userId: string): Observable<SpecialistDto> {
    return this.http.get<SpecialistDto>(`${API_URL}/staff/specialists/by-user/${userId}`);
  }

  listAssistantsBySpecialist(specialistId: string): Observable<AssistantDto[]> {
    return this.http.get<AssistantDto[]>(`${API_URL}/staff/specialists/${specialistId}/assistants`);
  }

  listSpecialistsByAssistant(assistantId: string): Observable<SpecialistDto[]> {
    return this.http.get<SpecialistDto[]>(`${API_URL}/staff/assistants/${assistantId}/specialists`);
  }

  updateAssistantSpecialists(assistantId: string, specialistIds: string[]): Observable<AssistantDto> {
    const payload: UpdateAssistantSpecialistsRequest = { specialistIds };
    return this.http.put<AssistantDto>(`${API_URL}/staff/assistants/${assistantId}/specialists`, payload);
  }

  updateSpecialistAssistants(specialistId: string, assistantIds: string[]): Observable<AssistantDto[]> {
    const payload: UpdateSpecialistAssistantsRequest = { assistantIds };
    return this.http.put<AssistantDto[]>(`${API_URL}/staff/specialists/${specialistId}/assistants`, payload);
  }

  createAssistant(payload: CreateAssistantRequest): Observable<void> {
    return this.http.post<void>(`${API_URL}/staff/assistants`, payload);
  }

  createSpecialist(payload: CreateSpecialistRequest): Observable<SpecialistDto> {
    return this.http.post<SpecialistDto>(`${API_URL}/staff/specialists`, payload);
  }
}
