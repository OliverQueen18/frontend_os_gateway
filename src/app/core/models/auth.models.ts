export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  username: string;
  roles: string[];
  permissions?: string[];
  expiresAt: string;
}

export interface AuthUser {
  userId: number;
  username: string;
  roles: string[];
  permissions: string[];
}
