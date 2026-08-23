import bcrypt from "bcrypt";
import { randomBytes, createHash } from "crypto";

/**
 * Hash a password using bcrypt with cost factor 12+.
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain password with its hash.
 */
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random token (hex encoded).
 * Used for refresh tokens before hashing.
 */
export function generateToken(): string {
    return randomBytes(32).toString("hex");
}

/**
 * Hash a refresh token for storage (we never store raw tokens).
 * Uses SHA-256 for fast O(1) lookup.
 */
export function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * Extract the client IP from request, respecting proxies.
 * Assumes trustProxy is set appropriately in Fastify.
 */
export function getRequestIP(req: Request): string {
    return req.ip ?? req.headers["x-forwarded-for"] as string ?? "unknown";
}

/**
 * Extract user agent from request.
 */
export function getUserAgent(req: Request): string | null {
    return req.headers["user-agent"] ?? null;
}