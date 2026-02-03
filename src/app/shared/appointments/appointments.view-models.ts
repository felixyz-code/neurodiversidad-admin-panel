import { AppointmentStatus } from '../../models/appointments.models';

export type AppointmentEstadoLabel = 'Pendiente' | 'Confirmada' | 'Finalizada' | 'Cancelada';

export interface AppointmentListItem {
  id?: string;
  paciente: string;
  pacienteId?: string;
  fecha: string;
  hora: string;
  horaFin?: string;
  duracion?: number;
  especialista: string;
  especialistaId?: string;
  especialidad?: string | null;
  estado: AppointmentEstadoLabel;
  status?: AppointmentStatus;
  notes?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}
