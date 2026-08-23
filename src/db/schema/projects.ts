import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const projects = pgTable(
    "projects",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        organizationId: uuid("organization_id")
            .notNull()
            .references(() => organizations.id, {
                // DELETE: cascading — an organization owns its projects;
                // when the org is removed, its projects go with it.
                // Audit/legal copy would need an outbox before this happens.
                onDelete: "cascade",
            }),
        name: text("name").notNull(),
        description: text("description"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // Every list/filter in the app starts with `WHERE organization_id = ?`
        // (multi-tenant scoping). PK doesn't help here.
        index("projects_organization_id_idx").on(t.organizationId),
    ],
);