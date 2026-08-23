import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";
import { orgRoleEnum } from "./enums.js";

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.orgId, table.userId] }),
  ],
);