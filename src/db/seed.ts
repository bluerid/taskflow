import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

import * as schema from "./schema/index.js";

const { users, organizations, orgMembers } = schema;

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");

    const client = postgres(url, { max: 1 });
    const db = drizzle(client, { schema });

    console.log("⚠️  Clearing existing data…");
    // Clear in correct order due to FK constraints
    await db.execute(sql`
        TRUNCATE TABLE
            org_members,
            organizations,
            users
        RESTART IDENTITY CASCADE
    `);

    console.log("🌱 Seeding test users with both roles…");

    // Create 2 organizations
    const orgResults = await db
        .insert(organizations)
        .values([
            { name: "Acme Corp" },
            { name: "Globex Inc" },
        ])
        .returning();
    const acme = orgResults[0]!;
    const globex = orgResults[1]!;

    // Create 4 users
    const userResults = await db
        .insert(users)
        .values([
            { email: "alice@acme.test", passwordHash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" }, // secret
            { email: "bob@acme.test",   passwordHash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" }, // secret
            { email: "carol@globex.test", passwordHash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" }, // secret
            { email: "dan@globex.test",   passwordHash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW" }, // secret
        ])
        .returning();
    const alice = userResults[0]!;
    const bob = userResults[1]!;
    const carol = userResults[2]!;
    const dan = userResults[3]!;

    // Assign roles: 2 admins, 2 members (one each per org)
    await db.insert(orgMembers).values([
        // Alice - org_admin at Acme
        { orgId: acme.id, userId: alice.id, role: "org_admin" },
        // Bob - member at Acme
        { orgId: acme.id, userId: bob.id,   role: "member" },
        // Carol - org_admin at Globex
        { orgId: globex.id, userId: carol.id, role: "org_admin" },
        // Dan - member at Globex
        { orgId: globex.id, userId: dan.id,   role: "member" },
    ]);

    console.log("✅ Seeding complete:");
    console.log(`  Organizations: ${acme.name} (${acme.id}), ${globex.name} (${globex.id})`);
    console.log(`  Users:`);
    console.log(`    Alice (${alice.email}) - org_admin @ ${acme.name}`);
    console.log(`    Bob   (${bob.email})   - member @ ${acme.name}`);
    console.log(`    Carol (${carol.email}) - org_admin @ ${globex.name}`);
    console.log(`    Dan   (${dan.email})   - member @ ${globex.name}`);

    await client.end();
}

main().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});