import type { FastifyInstance } from "fastify";
import fastify from "fastify";
import fastifyEnv from "@fastify/env";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import { createDb, pingDb } from "./db/index.js";
import { authRoutes } from "./modules/auth/auth.routes.js";

export async function AppInit(): Promise<FastifyInstance> {
    const app: FastifyInstance = fastify({
        logger: true
    });

    await app.register(fastifyEnv, {
        dotenv: true,
        schema: {
            type: "object",
            required: [
                "DATABASE_URL",
                "REDIS_URL",
                "JWT_SECRET",
            ],
            properties: {
                PORT: {
                    type: "number",
                    default: 3000,
                },
                DATABASE_URL: {
                    type: "string",
                },

                REDIS_URL: {
                    type: "string",
                },

                JWT_SECRET: {
                    type: "string",
                },
            },
        },
    });

    // Initialize database connection and decorate on app for easy access
    const db = createDb(app.config.DATABASE_URL);
    app.decorate("db", db);

    // Register JWT plugin
    await app.register(fastifyJwt, {
        secret: app.config.JWT_SECRET,
    });

    // Register rate limit plugin (globally disabled - we'll use per-route config)
    await app.register(fastifyRateLimit, {
        global: false,
    });

    // Add JWT authentication middleware
    app.addHook("preHandler", async (request, reply) => {
        // Skip authentication for health check and auth endpoints
        if (
            request.url === "/health" ||
            request.url.startsWith("/auth/")
        ) {
            return;
        }

        try {
            await request.jwtVerify();
        } catch (err) {
            return reply.code(401).send({ error: "Unauthorized" });
        }
    });

    // Register auth routes
    await app.register(authRoutes);

    app.get("/health", async(_request, reply) => {
        const port = app.config.PORT;
        const url = app.config.DATABASE_URL;
        try {
            await pingDb(db);
            return {
                status: "ok",
                db: "ok",
            };
        } catch (err) {
            app.log.error({ err }, "db health check failed");
            return reply.code(503).send({
                status: "error",
                db: "unreachable",
            });
        }
    });

    await app.ready();

    return app;
}