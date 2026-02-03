export interface UserAdministrationDTO {
  id: string;
  name: string;
  email: string;
  username: string;
  enabled: boolean;
  roles: string[];
  lastLoginAt?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  username?: string;
  newPassword?: string;
  enabled?: boolean;
  roles?: string[];
}

export interface CreateUserRequest {
  name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword?: string;
  enabled?: boolean;
  roles?: string[];
}

export interface UsersQueryParams {
  status?: 'active' | 'inactive' | 'deleted';
  text?: string;
  enabled?: boolean;
  roleName?: string;
  sort?: string[];
}

export interface ResolvedUserRef {
  id: string;
  name: string;
  username: string;
}

export interface UserAvailabilityResponse {
  usernameAvailable: boolean;
  emailAvailable: boolean;
}
