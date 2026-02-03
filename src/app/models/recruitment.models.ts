export type RecruitmentStatusFilter = 'active' | 'deleted' | 'all';
export type RecruitmentTipoServicio = 'PRACTICANTE' | 'VOLUNTARIO' | 'SERVICIO_SOCIAL';
export type RecruitmentEstatus = 'ACTIVO' | 'INACTIVO';

export interface RecruitmentDto {
  id: string;
  nombre: string;
  tipoServicio: RecruitmentTipoServicio;
  fechaInicio: string;
  fechaSalida?: string | null;
  estatus: RecruitmentEstatus;
  createdAt?: string;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
}

export interface RecruitmentPage {
  content: RecruitmentDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface RecruitmentQueryParams {
  status?: RecruitmentStatusFilter;
  text?: string;
  tipoServicio?: RecruitmentTipoServicio;
  estatus?: RecruitmentEstatus;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

export interface CreateRecruitmentRequest {
  nombre: string;
  tipoServicio: RecruitmentTipoServicio;
  fechaInicio: string;
  fechaSalida?: string | null;
  estatus: RecruitmentEstatus;
}

export interface UpdateRecruitmentRequest {
  nombre?: string;
  tipoServicio?: RecruitmentTipoServicio;
  fechaInicio?: string;
  fechaSalida?: string | null;
  estatus?: RecruitmentEstatus;
}
