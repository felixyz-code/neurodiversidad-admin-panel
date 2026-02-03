import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppointmentsService } from '../../services/appointments.service';
import { PatientsService } from '../../services/patients.service';
import { StaffService } from '../../services/staff.service';
import { UsersService } from '../../services/users.service';
import {
  AppointmentDto,
  AppointmentPage,
  AppointmentQueryParams,
  CreateAppointmentRequest,
  UpdateAppointmentRequest
} from '../../models/appointments.models';
import { PatientDto, PagedResponse } from '../../models/patients.models';
import { AssistantDto, CreateAssistantRequest, CreateSpecialistRequest, SpecialistDto } from '../../models/staff.models';
import { ResolvedUserRef } from '../../models/users.models';

@Injectable({ providedIn: 'root' })
export class AppointmentsFacade {
  constructor(
    private appointmentsService: AppointmentsService,
    private patientsService: PatientsService,
    private staffService: StaffService,
    private usersService: UsersService
  ) {}

  listAppointments(params: AppointmentQueryParams): Observable<AppointmentPage> {
    return this.appointmentsService.listAppointments(params);
  }

  createAppointment(payload: CreateAppointmentRequest): Observable<AppointmentDto> {
    return this.appointmentsService.createAppointment(payload);
  }

  updateAppointment(id: string, payload: UpdateAppointmentRequest): Observable<AppointmentDto> {
    return this.appointmentsService.updateAppointment(id, payload);
  }

  listPatients(search = '', page = 0, size = 20): Observable<PagedResponse<PatientDto>> {
    return this.patientsService.listPatients(search, page, size);
  }

  createPatient(payload: Partial<PatientDto> & { fullName: string }): Observable<PatientDto> {
    return this.patientsService.createPatient(payload);
  }

  listSpecialists(): Observable<SpecialistDto[]> {
    return this.staffService.listSpecialists();
  }

  listAssistants(): Observable<AssistantDto[]> {
    return this.staffService.listAssistants();
  }

  listAssistantsBySpecialist(specialistId: string): Observable<AssistantDto[]> {
    return this.staffService.listAssistantsBySpecialist(specialistId);
  }

  listSpecialistsByAssistant(assistantId: string): Observable<SpecialistDto[]> {
    return this.staffService.listSpecialistsByAssistant(assistantId);
  }

  getAssistantByUserId(userId: string): Observable<AssistantDto> {
    return this.staffService.getAssistantByUserId(userId);
  }

  getSpecialistByUserId(userId: string): Observable<SpecialistDto> {
    return this.staffService.getSpecialistByUserId(userId);
  }

  createAssistant(payload: CreateAssistantRequest): Observable<void> {
    return this.staffService.createAssistant(payload);
  }

  createSpecialist(payload: CreateSpecialistRequest): Observable<SpecialistDto> {
    return this.staffService.createSpecialist(payload);
  }

  resolveUsers(userIds: string[]): Observable<ResolvedUserRef[]> {
    return this.usersService.resolveUsers(userIds);
  }
}
