const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// On Azure App Service, only /home survives restarts and redeploys — the
// deployment folder (where this script lives) gets replaced on every push.
// Locally, /home doesn't exist, so fall back to a local ./data folder instead.
const dataDir = process.env.WEBSITE_SITE_NAME
  ? "/home/data"
  : path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "workout.db");
console.log(`Using database at: ${dbPath}`);

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

// One row per exercise, per session. Simpler to query/aggregate than
// nesting JSON blobs, and makes future features (charts, PRs) easy.
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,          -- e.g. "2026-07-02_U1"
    user_id TEXT,                 -- Entra ID x-ms-client-principal-id, scopes data per user
    day TEXT NOT NULL,            -- U1 | U2 | L1 | L2
    date TEXT NOT NULL,           -- YYYY-MM-DD
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercise_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise TEXT NOT NULL,
    is_bodyweight INTEGER NOT NULL DEFAULT 0,
    set_index INTEGER NOT NULL,
    weight REAL,
    reps INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_logs_session ON exercise_logs(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_day ON sessions(day);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,          -- Entra ID x-ms-client-principal-id
    email TEXT,
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: if this db was created before user_id existed, the CREATE TABLE
// above was a no-op (table already existed) — so add the column by hand.
// Enforced as required at the application layer (routes/history.js) instead
// of a DB-level NOT NULL, since existing rows have no value to backfill.
const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all();
const hasUserId = sessionColumns.some((col) => col.name === "user_id");
if (!hasUserId) {
  console.log("Migrating: adding user_id column to sessions table");
  db.exec("ALTER TABLE sessions ADD COLUMN user_id TEXT");
}

// Only safe to create this index once user_id is guaranteed to exist —
// on a fresh install it's already there; on an existing db, the migration
// above just added it.
db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)");

// Creates a profile on first login, refreshes name/email + last_login_at on
// every subsequent one. Called once per request by the auth middleware in
// server.js — cheap upsert, no separate "sign up" step needed.
const upsertUserStmt = db.prepare(`
  INSERT INTO users (id, email, display_name, created_at, last_login_at)
  VALUES (?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    email = excluded.email,
    display_name = excluded.display_name,
    last_login_at = datetime('now')
`);

db.upsertUser = (id, email, displayName) =>
  upsertUserStmt.run(id, email, displayName);

module.exports = db;