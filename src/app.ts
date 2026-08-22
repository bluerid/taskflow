import type { FastifyInstance } from "fastify";
import fastify from "fastify";
import fastifyEnv from "@fastify/env";
import { createDb, pingDb } from "./db/index.js";

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

    const db = createDb(app.config.DATABASE_URL); // might rethink this going ahead to be a singleton.

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