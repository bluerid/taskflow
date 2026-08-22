import type { FastifyInstance } from "fastify";
import fastify from "fastify";
import fastifyEnv from "@fastify/env";

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

    app.get("/health", async() => {
        const port = app.config.PORT;
        const url = app.config.DATABASE_URL;
        return {
            status: "ok"
        };
    });

    await app.ready();

    return app;
}