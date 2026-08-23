import {
    pgTable,
    uuid,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { tasks } from "./tasks.js";
import { users } from "./users.js";

export const comments = pgTable(
    "comments",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        taskId: uuid("task_id")
            .notNull()
            .references(() => tasks.id, {
                // DELETE: cascade. Comments belong to tasks; orphan
                // comments would be unreachable noise.
                onDelete: "cascade",
            }),
        authorId: uuid("author_id")
            .notNull()
            .references(() => users.id, {
                // DELETE: restrict. We never silently lose attribution.
                // To remove a user, the app must first scrub (or
                // anonymize) their comments. Alternative:
                //   - "set null" + nullable `author_id` to keep the
                //     comment text and just show "[deleted]".
                onDelete: "restrict",
            }),
        body: text("body").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        // Every comment feed queries by `task_id` ordered by `created_at`.
        // The PK on `id` doesn't help; this composite index does.
        index("comments_task_id_created_at_idx").on(t.taskId, t.createdAt),

        // "All comments by author X" is rare but useful for moderation.
        index("comments_author_id_idx").on(t.authorId),
    ],
);