/**
 * JSON schemas for validating auth request bodies.
 * These can be used directly with Fastify's schema validation.
 */

export const registerSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
      name: { type: "string" },
    },
    additionalProperties: false,
  },
} as const;

export const loginSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  },
} as const;

export const refreshSchema = {
  body: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  },
} as const;

export const logoutSchema = {
  body: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: { type: "string", minLength: 1 },
    },
    additionalProperties: false,
  },
} as const;