export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';

export interface CreateAppointmentRequest {
  specialistId: string;
  patientId: string;
  startAt: string;
  durationMinutes: number;
  notes?: string;
  status?: AppointmentStatus;
}

export interface UpdateAppointmentRequest {
  startAt?: string;
  durationMinutes?: number;
  notes?: string;
  status?: AppointmentStatus;
  specialistId?: string;
}

export interface AppointmentDto {
  id: string;
  specialistId: string;
  specialistName: string;
  patientId: string;
  patientName: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface AppointmentPage {
  content: AppointmentDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AppointmentQueryParams {
  specialistId?: string;
  from?: string;
  to?: string;
  status?: AppointmentStatus;
  search?: string;
  page?: number;
  size?: number;
  sort?: string[];
}
