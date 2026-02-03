export type MovementType = 'INCOME' | 'OUTCOME';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';

export interface FinMovementDto {
  id: string;
  type: MovementType;
  description: string;
  amount: number;
  movementDate: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface FinMovementPage {
  content: FinMovementDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface FinMovementSummary {
  totalIncome: number;
  totalOutcome: number;
  balance: number;
}

export interface FinMovementQueryParams {
  from: string;
  to: string;
  type?: MovementType;
  paymentMethod?: PaymentMethod;
  text?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  size?: number;
  sort?: string[];
}

export interface CreateMovementRequest {
  type: MovementType;
  description: string;
  amount: number;
  movementDate: string;
  paymentMethod: PaymentMethod;
}

export interface UpdateMovementRequest {
  type?: MovementType;
  description?: string;
  amount?: number;
  movementDate?: string;
  paymentMethod?: PaymentMethod;
}
