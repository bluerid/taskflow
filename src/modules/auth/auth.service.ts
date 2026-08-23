import { eq, and, isNull, ne } from "drizzle-orm";
import { hashRefreshToken } from "./auth.utils.js";
import * as schema from "../../db/schema/index.js";
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

const {
  users,
  organizations,
  orgMembers,
  refreshTokens,
} = schema;

/**
 * Issue a new access token and refresh token pair for a user in an organization.
 * @param db - Drizzle database instance
 * @param user - User record from database
 * @param org - Organization record from database
 * @param role - User's role in the organization
 * @param fastify - Fastify instance for JWT signing
 * @returns Object containing accessToken and refreshToken
 */
export async function issueTokenPair(
  db: any,
  user: typeof users.$inferSelect,
  org: typeof organizations.$inferSelect,
  role: "org_admin" | "member",
  fastify: any
): Promise<{ accessToken: string; refreshToken: string }> {
  // Generate refresh token (raw) and its hash for storage
  const rawRefreshToken = randomBytes(32).toString("hex");
  const refreshTokenHash = hashRefreshToken(rawRefreshToken);
  
  // Set expiration: 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Store the refresh token hash
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
    // Optionally store IP and user agent from request if available
  });
  
  // Create JWT payload
  const payload = {
    sub: user.id,
    orgId: org.id,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes TTL
  };
  
  // Sign access token
  const accessToken = await fastify.jwt.sign(payload);
  
  return {
    accessToken,
    refreshToken: rawRefreshToken, // Return raw token to client only once
  };
}

/**
 * Register a new user, create their first organization, and make them org_admin.
 * @param db - Drizzle database instance
 * @param fastify - Fastify instance for JWT signing
 * @param email - User's email
 * @param password - User's plain password
 * @returns Object containing accessToken, refreshToken, and user info
 */
export async function register(
  db: any,
  fastify: any,
  email: string,
  password: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    orgId: string;
    role: "org_admin";
  };
}> {
  return db.transaction(async (tx: any) => { // TODO: we'll fix types going ahead!
    // Check if user already exists
    const [existingUser] = await tx
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    if (existingUser) {
      throw new Error("User already exists");
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const [user] = await tx
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning();
    
    if (!user) {
      throw new Error("Failed to create user");
    }
    
    // Create personal organization for the user
    const [org] = await tx
      .insert(organizations)
      .values({
        name: `${email}'s workspace`,
      })
      .returning();

    if (!org) {
      throw new Error("Failed to create organization");
    }
    
    // Make user org_admin of their organization
    await tx
      .insert(orgMembers)
      .values({
        orgId: org.id,
        userId: user.id,
        role: "org_admin",
      });
    
    // Issue token pair
    const { accessToken, refreshToken } = await issueTokenPair(
      tx,
      user,
      org,
      "org_admin",
      fastify
    );
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        orgId: org.id,
        role: "org_admin",
      },
    };
  });
}

/**
 * Login a user by verifying credentials and issuing tokens.
 * @param db - Drizzle database instance
 * @param fastify - Fastify instance for JWT signing
 * @param email - User's email
 * @param password - User's plain password
 * @returns Object containing accessToken, refreshToken, and user info
 */
export async function login(
  db: any,
  fastify: any,
  email: string,
  password: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    orgId: string;
    role: "org_admin" | "member";
  };
}> {
  return db.transaction(async (tx: any) => {
    // Find user by email (case-insensitive)
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    if (!user) {
      // Use same timing as real hash to prevent user enumeration
      await bcrypt.compare(password, "$2b$12$dummy");
      throw new Error("Invalid credentials");
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new Error("Invalid credentials");
    }
    
    // Get user's default organization (first one they belong to)
    // In a real app, you might let user choose or have a default org setting
    const [orgMember] = await tx
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(eq(orgMembers.userId, user.id))
      .limit(1);
    
    if (!orgMember) {
      throw new Error("User not associated with any organization");
    }
    
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgMember.orgId))
      .limit(1);
    
    if (!org) {
      throw new Error("Organization not found");
    }
    
    // Issue token pair
    const { accessToken, refreshToken } = await issueTokenPair(
      tx,
      user,
      org,
      orgMember.role,
      fastify
    );
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        orgId: org.id,
        role: orgMember.role,
      },
    };
  });
}

/**
 * Refresh access token using a valid refresh token.
 * Implements refresh token rotation: old token is marked as used/replaced.
 * @param db - Drizzle database instance
 * @param fastify - Fastify instance for JWT signing
 * @param rawRefreshToken - The raw refresh token from client
 * @returns Object containing new accessToken and refreshToken
 */
export async function refresh(
  db: any,
  fastify: any,
  rawRefreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  return db.transaction(async (tx: any) => {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    
    // Find the refresh token by hash (for update)
    const [tokenRow] = await tx
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .for("update") // Lock row to prevent race conditions
      .limit(1);
    
    if (!tokenRow) {
      throw new Error("Invalid refresh token");
    }
    
    // Check if token is expired
    if (tokenRow.expiresAt < new Date()) {
      throw new Error("Refresh token expired");
    }
    
    // Check if token is revoked
    if (tokenRow.revokedAt !== null) {
      throw new Error("Refresh token revoked");
    }
    
    // Detect token reuse: if token was already replaced, it's a theft attempt
    if (tokenRow.replacedById !== null) {
      // Revoke all other active tokens for this user as potential compromise
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, tokenRow.userId),
            isNull(refreshTokens.revokedAt),
            ne(refreshTokens.id, tokenRow.id) // Don't revoke itself
          )
        );
      
      throw new Error("Refresh token reused - possible theft attempt");
    }
    
    // Get user and organization info
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, tokenRow.userId))
      .limit(1);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const [orgMember] = await tx
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(eq(orgMembers.userId, user.id))
      .limit(1);
    
    if (!orgMember) {
      throw new Error("User not associated with any organization");
    }
    
    const [org] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgMember.orgId))
      .limit(1);
    
    if (!org) {
      throw new Error("Organization not found");
    }
    
    // Mark current token as used and replaced
    const newRawToken = randomBytes(32).toString("hex");
    const newTokenHash = hashRefreshToken(newRawToken);
    
    // Insert new refresh token row
    const [newTokenRow] = await tx
      .insert(refreshTokens)
      .values({
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .returning();

    // Update the old token to point to the new one and mark as used
    await tx
      .update(refreshTokens)
      .set({
        replacedById: newTokenRow.id,
        lastUsedAt: new Date(),
      })
      .where(eq(refreshTokens.id, tokenRow.id));
    
    // Issue new access token
    const payload = {
      sub: user.id,
      orgId: org.id,
      role: orgMember.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes TTL
    };
    
    const accessToken = await fastify.jwt.sign(payload);
    
    return {
      accessToken,
      refreshToken: newRawToken, // Return raw new token to client
    };
  });
}

/**
 * Logout by revoking the refresh token.
 * @param db - Drizzle database instance
 * @param rawRefreshToken - The refresh token to revoke
 */
export async function logout(
  db: ReturnType<typeof import("drizzle-orm/postgres-js").drizzle>,
  rawRefreshToken: string
): Promise<void> {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

/**
 * Logout from all devices by revoking all active refresh tokens for a user.
 * @param db - Drizzle database instance
 * @param userId - The user ID
 */
export async function logoutAllDevices(
  db: ReturnType<typeof import("drizzle-orm/postgres-js").drizzle>,
  userId: string
): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt)
      )
    );
}