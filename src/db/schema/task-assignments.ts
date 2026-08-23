import {
    pgTable,
    uuid,
    timestamp,
    primaryKey,
    index,
} from "drizzle-orm/pg-core";
import { tasks } from "./tasks.js";
import { users } from "./users.js";

export const taskAssignments = pgTable(
    "task_assignments",
    {
        taskId: uuid("task_id")
            .notNull()
            .references(() => tasks.id, {
                // DELETE: cascade. An assignment references a task; with
                // the task gone, the assignment is meaningless.
                onDelete: "cascade",
            }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                // DELETE: cascade. If a user is removed, drop their
                // assignments. We track assignment history via
                // `assigned_at`; removing a user removes their
                // assignment records. Alternatives:
                //   - "restrict": block deletion until manually cleaned.
                //   - "set null": requires nullable `user_id`.
                onDelete: "cascade",
            }),
        assignedAt: timestamp("assigned_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.taskId, t.userId] }),

        // "Tasks assigned to me" filter. The composite PK leads with
        // task_id, so this index makes the reverse lookup index-only.
        index("task_assignments_user_id_idx").on(t.userId),
    ],
);