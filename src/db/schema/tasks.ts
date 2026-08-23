import {
    pgTable,
    uuid,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { taskStatus, taskPriority } from "./enums.js";

export const tasks = pgTable(
    "tasks",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        projectId: uuid("project_id")
            .notNull()
            .references(() => projects.id, {
                // DELETE: cascade. A task without its parent project is
                // meaningless, and orphaning would block project deletion.
                onDelete: "cascade",
            }),
        title: text("title").notNull(),
        description: text("description"),
        status: taskStatus("status").notNull().default("todo"),
        priority: taskPriority("priority").notNull().default("medium"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // project_id is the dominant filter on every task list ("show me
        // the tasks for project X"). PK index on `id` alone won't help.
        index("tasks_project_id_idx").on(t.projectId),

        // Kanban/group-by queries filter by status within a project
        // (most common access pattern after `project_id`).
        index("tasks_project_status_idx").on(t.projectId, t.status),

        // "Show me urgent tasks across all projects" — common dashboard
        // and notification query.
        index("tasks_priority_idx").on(t.priority),
    ],
);