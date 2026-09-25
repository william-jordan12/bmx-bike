import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { Pool } from "pg";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function loadEnvFile() {
  if (process.env.DATABASE_URL) return;
  for (const name of [".env.local", ".env"]) {
    if (!existsSync(name)) continue;
    for (const line of readFileSync(name, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      if (match[1] === "DATABASE_URL" || !process.env[match[1]]) {
        process.env[match[1]] = value;
      }
    }
  }
}

function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  return `${salt}:${scryptSync(password, salt, KEY_LENGTH).toString("hex")}`;
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  loadEnvFile();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Add it to .env.local or pass it as an environment variable.");
    process.exit(1);
  }

  const username = process.argv[2] || process.env.ADMIN_USERNAME || (await ask("Admin username [admin]: "));
  if (!username) {
    console.error("A username is required.");
    process.exit(1);
  }

  const password = process.env.ADMIN_RESET_PASSWORD || (await ask("New password (min 10 chars): "));
  if (!password || password.length < 10) {
    console.error("The new password must be at least 10 characters.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 15_000 });
  try {
    await pool.query(
      `INSERT INTO bmx_admins (username, password_hash) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, session_token = NULL, updated_at = now()`,
      [username, hashPassword(password)]
    );
    const { rows } = await pool.query(`SELECT username, created_at FROM bmx_admins WHERE username = $1`, [
      username
    ]);
    console.log(`Password updated for "${rows[0].username}".`);
    if (rows[0].created_at) console.log("Existing sessions were signed out.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
