import type { FastifyInstance } from "fastify";
import fastify from "fastify";

export async function AppInit(): Promise<FastifyInstance> {
    const app: FastifyInstance = fastify({
        logger: true
    });

    return app;
}