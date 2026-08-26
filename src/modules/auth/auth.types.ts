import type { FastifyInstance } from "fastify";

/**
 * User information extracted from JWT payload.
 */
export interface JwtPayload {
  sub: string; // user ID
  orgId: string; // organization ID
  role: "org_admin" | "member";
  iat: number;
  exp: number;
}

/**
 * Extended Fastify request with user context.
 */
export interface AuthRequest {
  user: JwtPayload;
}

/**
 * Extended Fastify instance with auth decorators.
 */
export interface AuthFastifyInstance extends FastifyInstance {
  authenticate: (req: AuthRequest, reply: any) => Promise<void>;
  authorize: (role: "org_admin" | "member") => (req: AuthRequest, reply: any) => Promise<void>;
}

/**
 * Authentication service dependencies.
 */
export interface AuthDeps {
  db: ReturnType<typeof import("drizzle-orm/postgres-js").drizzle>;
}

/**
 * Login request body.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response body.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    orgId: string;
    role: "org_admin" | "member";
  };
}

/**
 * Refresh token request body.
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Refresh token response body.
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Register request body.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string; // optional display name
}

/**
 * Register response body.
 */
export interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    orgId: string;
    role: "org_admin";
  };
}

/**
 * Logout response body.
 */
export interface LogoutResponse {
  message: string;
}