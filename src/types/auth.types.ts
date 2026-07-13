export interface Role {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  permissions: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
}
