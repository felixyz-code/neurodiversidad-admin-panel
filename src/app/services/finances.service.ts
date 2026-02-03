import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_URL } from '../config/api.config';
import { buildHttpParams } from '../shared/utils/http-params';
import {
  CreateMovementRequest,
  FinMovementPage,
  FinMovementSummary,
  FinMovementQueryParams,
  UpdateMovementRequest
} from '../models/finances.models';

type FinMovementStatus = 'active' | 'deleted' | 'all';
type FinMovementListParams = FinMovementQueryParams & { status?: FinMovementStatus };

@Injectable({ providedIn: 'root' })
export class FinancesService {
  constructor(private http: HttpClient) {}

  listMovements(params: FinMovementListParams): Observable<FinMovementPage> {
    return this.http.get<FinMovementPage>(`${API_URL}/finances/movements`, {
      params: buildHttpParams({
        from: params.from,
        to: params.to,
        type: params.type,
        paymentMethod: params.paymentMethod,
        text: params.text,
        minAmount: params.minAmount,
        maxAmount: params.maxAmount,
        page: params.page,
        size: params.size,
        status: params.status,
        sort: params.sort
      })
    });
  }

  getSummary(params: FinMovementQueryParams & { status?: FinMovementStatus }): Observable<FinMovementSummary> {
    return this.http.get<FinMovementSummary>(`${API_URL}/finances/movements/summary`, {
      params: buildHttpParams({
        from: params.from,
        to: params.to,
        type: params.type,
        paymentMethod: params.paymentMethod,
        text: params.text,
        minAmount: params.minAmount,
        maxAmount: params.maxAmount,
        status: params.status
      })
    });
  }

  createMovement(payload: CreateMovementRequest) {
    return this.http.post(`${API_URL}/finances/movements`, payload);
  }

  updateMovement(id: string, payload: UpdateMovementRequest) {
    return this.http.put(`${API_URL}/finances/movements/${id}`, payload);
  }

  deleteMovement(id: string) {
    return this.http.delete(`${API_URL}/finances/movements/${id}`);
  }

  restoreMovement(id: string) {
    return this.http.patch(`${API_URL}/finances/movements/${id}/restore`, {});
  }
}
