import {
    pgTable, uuid, text, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const refreshTokens = pgTable(
    "refresh_tokens",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        tokenHash: text("token_hash").notNull().unique(),

        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        revokedAt: timestamp("revoked_at",  { withTimezone: true }),

        replacedById: uuid("replaced_by_id"),

        createdAt:  timestamp("created_at",  { withTimezone: true })
            .notNull().defaultNow(),
        lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

        userAgent: text("user_agent"),
        ip:        text("ip"),
    },
    (t) => [
        index("refresh_tokens_user_id_idx").on(t.userId),
    ],
);