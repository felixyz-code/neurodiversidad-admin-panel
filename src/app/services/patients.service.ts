import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { PatientDto, PagedResponse } from '../models/patients.models';

@Injectable({ providedIn: 'root' })
export class PatientsService {
  constructor(private http: HttpClient) {}

  listPatients(search = '', page = 0, size = 20): Observable<PagedResponse<PatientDto>> {
    const query = new URLSearchParams();
    query.set('search', search);
    query.set('page', String(page));
    query.set('size', String(size));
    return this.http.get<PagedResponse<PatientDto>>(`${API_URL}/patients?${query.toString()}`);
  }

  createPatient(payload: Partial<PatientDto> & { fullName: string }): Observable<PatientDto> {
    return this.http.post<PatientDto>(`${API_URL}/patients`, payload);
  }
}
