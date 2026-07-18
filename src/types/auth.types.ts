// Cross-cutting auth types — shared by lib/token.ts and every module's
// middleware/controllers via req.user. Module-local types (DTOs, request
// context, etc.) belong in that module's own <name>.types.ts instead.

export interface AuthUser {
  id: string;
}

export interface AccessTokenPayload {
  sub: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
