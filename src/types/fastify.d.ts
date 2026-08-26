import "@fastify/env";
import "@fastify/jwt";

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


declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      orgId: string;
      role: "org_admin" | "member";
    };

    user: {
      sub: string;
      orgId: string;
      role: "org_admin" | "member";
    };
  }
}