#!/usr/bin/env node
/**
 * Seeds the demo organization, profiles and memberships for existing Neon Auth
 * users. It never creates Auth users or passwords; provision those through Neon
 * first. Refuses production-like environments.
 */
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
if ((process.env.APP_ENV ?? "").toLowerCase() === "production") {
  console.error("Refusing to seed a production environment.");
  process.exit(1);
}
if ((process.env.ALLOW_DEMO_SEED ?? "").toLowerCase() !== "true") {
  console.error("Set ALLOW_DEMO_SEED=true to seed the synthetic demo workspace.");
  process.exit(1);
}

const organizationId = "00000000-0000-4000-8000-000000000001";
const users = [
  { email: process.env.DEMO_ANALYST_EMAIL ?? "analyst@assay.test", role: "ANALYST", name: "Maya Chen" },
  { email: process.env.DEMO_CREDIT_MANAGER_EMAIL ?? "manager@assay.test", role: "MANAGER", name: "Jon Bell" },
  { email: process.env.DEMO_AUDITOR_EMAIL ?? "auditor@assay.test", role: "AUDITOR", name: "Priya Raman" },
];

const pool = new Pool({ connectionString: databaseUrl, ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: true } });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO organizations (id, name, slug, status, default_currency, timezone)
     VALUES ($1, 'Assay Demo Credit Partners', 'assay-demo', 'ACTIVE', 'USD', 'UTC')
     ON CONFLICT (id) DO NOTHING`,
    [organizationId],
  );
  for (const user of users) {
    const { rows } = await client.query('SELECT id, email, name FROM neon_auth."user" WHERE lower(email) = lower($1) LIMIT 1', [user.email]);
    const authUser = rows[0];
    if (!authUser) {
      throw new Error(`Neon Auth user not found for ${user.email}. Provision it through Neon first.`);
    }
    await client.query(
      `INSERT INTO profiles (user_id, email, display_name, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name`,
      [authUser.id, authUser.email, authUser.name ?? user.name],
    );
    await client.query(
      `INSERT INTO memberships (organization_id, user_id, role, status, invited_by)
       VALUES ($1, $2, $3, 'ACTIVE', 'seed')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE'`,
      [organizationId, authUser.id, user.role],
    );
    console.log(`seeded ${user.role.padEnd(8)} ${authUser.email}`);
  }
  await client.query("COMMIT");
  console.log("Demo workspace seeded. No passwords were created or printed.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : "Seed failed.");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
