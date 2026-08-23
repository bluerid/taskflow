import { pgEnum } from "drizzle-orm/pg-core";

export const taskStatus = pgEnum("task_status", [
    "todo",
    "in_progress",
    "review",
    "done",
]);

export const taskPriority = pgEnum("task_priority", [
    "low",
    "medium",
    "high",
    "urgent",
]);

export const orgRoleEnum = pgEnum("org_role", [
  "org_admin",
  "member",
]);