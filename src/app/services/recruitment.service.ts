import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { buildHttpParams } from '../shared/utils/http-params';
import {
  CreateRecruitmentRequest,
  RecruitmentDto,
  RecruitmentPage,
  RecruitmentQueryParams,
  UpdateRecruitmentRequest
} from '../models/recruitment.models';

@Injectable({ providedIn: 'root' })
export class RecruitmentService {
  constructor(private http: HttpClient) {}

  listRecruitment(params: RecruitmentQueryParams): Observable<RecruitmentPage> {
    return this.http.get<RecruitmentPage>(`${API_URL}/recruitment`, {
      params: buildHttpParams({
        status: params.status,
        text: params.text,
        tipoServicio: params.tipoServicio,
        estatus: params.estatus,
        from: params.from,
        to: params.to,
        page: params.page,
        size: params.size,
        sort: params.sort
      })
    });
  }

  createRecruitment(payload: CreateRecruitmentRequest): Observable<RecruitmentDto> {
    return this.http.post<RecruitmentDto>(`${API_URL}/recruitment`, payload);
  }

  updateRecruitment(id: string, payload: UpdateRecruitmentRequest): Observable<RecruitmentDto> {
    return this.http.put<RecruitmentDto>(`${API_URL}/recruitment/${id}`, payload);
  }

  deleteRecruitment(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/recruitment/${id}`);
  }

  restoreRecruitment(id: string): Observable<void> {
    return this.http.patch<void>(`${API_URL}/recruitment/${id}/restore`, null);
  }
}
