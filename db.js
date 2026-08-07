const Database = require("better-sqlite3");
const path = require("path");

// SQLite file lives right next to this script — persists across restarts.
const db = new Database(path.join(__dirname, "workout.db"));

db.pragma("journal_mode = WAL");

// One row per exercise, per session. Simpler to query/aggregate than
// nesting JSON blobs, and makes future features (charts, PRs) easy.
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,          -- e.g. "2026-07-02_U1"
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
`);

module.exports = db;
