import "@fastify/env";

declare module "fastify" {
  interface FastifyInstance {
    config: {
      PORT: number;
      DATABASE_URL: string;
      REDIS_URL: string;
      JWT_SECRET: string;
    };
    db: any;
  }
}