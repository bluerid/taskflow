import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

export function createDb(connectionString: string) {
    const pool = postgres(connectionString, {
        max: 10,
        idle_timeout: 30,
    });

    return drizzle(pool);
}

export async function pingDb(db: ReturnType<typeof createDb>): Promise<void> {
    await db.execute(sql`SELECT 1`);
}