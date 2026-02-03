import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { buildHttpParams } from '../shared/utils/http-params';
import {
  AppointmentDto,
  AppointmentPage,
  AppointmentQueryParams,
  CreateAppointmentRequest,
  UpdateAppointmentRequest
} from '../models/appointments.models';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  constructor(private http: HttpClient) {}

  createAppointment(payload: CreateAppointmentRequest): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(`${API_URL}/appointments`, payload);
  }

  updateAppointment(id: string, payload: UpdateAppointmentRequest): Observable<AppointmentDto> {
    return this.http.put<AppointmentDto>(`${API_URL}/appointments/${id}`, payload);
  }

  listAppointments(params: AppointmentQueryParams): Observable<AppointmentPage> {
    return this.http.get<AppointmentPage>(`${API_URL}/appointments`, {
      params: buildHttpParams({
        specialistId: params.specialistId,
        from: params.from,
        to: params.to,
        status: params.status,
        search: params.search,
        page: params.page,
        size: params.size,
        sort: params.sort
      })
    });
  }
}
