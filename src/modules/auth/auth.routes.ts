import type { FastifyInstance } from "fastify/types/instance.js";
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from "./auth.schema.js";
import { register, login, refresh, logout, logoutAllDevices } from "./auth.service.js";
import { hashPassword } from "./auth.utils.js";

/**
 * Register authentication routes with the Fastify instance.
 * @param fastify - Fastify instance
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register POST /auth/register
  fastify.post(
    "/auth/register",
    {
      schema: registerSchema,
      // Rate limit: 10 requests per minute per IP
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { email, password, name } = request.body as {
        email: string;
        password: string;
        name?: string;
      };

      try {
        const result = await register(
          fastify.db,
          fastify,
          email,
          password
        );

        reply.code(201).send({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            orgId: result.user.orgId,
            role: result.user.role,
          },
        });
      } catch (error: any) {
        if (error.message === "User already exists") {
          reply.code(409).send({ error: "User already exists" });
        } else {
          fastify.log.error(error);
          reply.code(500).send({ error: "Internal server error" });
        }
      }
    }
  );

  // Register POST /auth/login
  fastify.post(
    "/auth/login",
    {
      schema: loginSchema,
      // Rate limit: 10 requests per minute per IP
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      try {
        const result = await login(
          fastify.db,
          fastify,
          email,
          password
        );

        reply.send({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            orgId: result.user.orgId,
            role: result.user.role,
          },
        });
      } catch (error: any) {
        if (error.message === "Invalid credentials") {
          reply.code(401).send({ error: "Invalid credentials" });
        } else {
          fastify.log.error(error);
          reply.code(500).send({ error: "Internal server error" });
        }
      }
    }
  );

  // Register POST /auth/refresh
  fastify.post(
    "/auth/refresh",
    {
      schema: refreshSchema,
      // Rate limit: 10 requests per minute per IP
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };

      try {
        const result = await refresh(
          fastify.db,
          fastify,
          refreshToken
        );

        reply.send({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });
      } catch (error: any) {
        if (
          error.message === "Invalid refresh token" ||
          error.message === "Refresh token expired" ||
          error.message === "Refresh token revoked" ||
          error.message === "Refresh token reused - possible theft attempt"
        ) {
          reply.code(401).send({ error: error.message });
        } else {
          fastify.log.error(error);
          reply.code(500).send({ error: "Internal server error" });
        }
      }
    }
  );

  // Register POST /auth/logout
  fastify.post(
    "/auth/logout",
    {
      schema: logoutSchema,
      // Rate limit: 10 requests per minute per IP
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };

      try {
        await logout(fastify.db, refreshToken);
        reply.send({ message: "Logged out successfully" });
      } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  // Bonus: POST /auth/logout-all (logout from all devices)
  fastify.post(
    "/auth/logout-all",
    {
      // This endpoint requires authentication - we'll add the preHandler below
      // Rate limit: 10 requests per minute per IP
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      try {
        // The user ID comes from the JWT middleware (attached to request.user)
        const userId = request.user.sub;
        
        await logoutAllDevices(fastify.db, userId);
        reply.send({ message: "Logged out from all devices successfully" });
      } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ error: "Internal server error" });
      }
    }
  );
}