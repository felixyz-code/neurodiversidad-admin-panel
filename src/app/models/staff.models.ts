export interface SpecialistDto {
  id: string;
  userId: string;
  userName: string;
  specialty: string;
}

export interface AssistantDto {
  id: string;
  userId: string;
  userName: string;
  specialistIds: string[];
  specialistNames: string[];
}

export interface UpdateAssistantSpecialistsRequest {
  specialistIds: string[];
}

export interface UpdateSpecialistAssistantsRequest {
  assistantIds: string[];
}

export interface CreateAssistantRequest {
  name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword?: string;
  enabled?: boolean;
  specialistIds?: string[];
}

export interface CreateSpecialistRequest {
  userId: string;
  specialty: string;
}
