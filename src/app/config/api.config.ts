import { environment } from '../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;
export const API_PREFIX = '/api/v1';
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;
