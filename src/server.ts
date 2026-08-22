import { AppInit } from './app.js';
import type { FastifyInstance } from "fastify";

async function startServer() {
    const app:FastifyInstance = await AppInit();
    try {
        await app.listen({
            port: 3000,
            host: '0.0.0.0'
        });
    } catch (error:unknown) {
        app.log.error(error);
        process.exit(1);
    }
}

startServer();