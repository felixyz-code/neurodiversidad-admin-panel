export interface PatientDto {
  id: string;
  fullName: string;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
