const express = require("express");
const db = require("../db");

const router = express.Router();

// Easy Auth injects this header once a request is authenticated — it's a
// stable GUID per person (same value regardless of work/school vs. personal
// Microsoft account). Missing/empty only happens if auth is misconfigured,
// since unauthenticated requests never reach here (globalValidation blocks them).
function getUserId(req) {
  return req.headers["x-ms-client-principal-id"] || null;
}

// GET /api/history — only this user's sessions, newest first, with nested exercise logs
router.get("/", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "not authenticated" });

  const sessions = db
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC")
    .all(userId);

  const logStmt = db.prepare(
    "SELECT * FROM exercise_logs WHERE session_id = ? ORDER BY exercise, set_index"
  );

  const result = sessions.map((s) => {
    const logs = logStmt.all(s.id);
    const exercises = {};
    const bw = {};
    logs.forEach((log) => {
      if (!exercises[log.exercise]) {
        exercises[log.exercise] = { sets: [] };
        bw[log.exercise] = !!log.is_bodyweight;
      }
      exercises[log.exercise].sets[log.set_index] = {
        weight: log.weight ?? "",
        reps: log.reps ?? "",
      };
    });
    return { id: s.id, day: s.day, date: s.date, exercises, bw };
  });

  res.json(result);
});

// POST /api/history — create/overwrite a session, owned by the logged-in user
// body: { id, day, date, exercises: { [name]: { sets: [{weight,reps}] } }, bw: { [name]: bool } }
router.post("/", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "not authenticated" });

  const { id, day, date, exercises, bw } = req.body;
  if (!id || !day || !date || !exercises) {
    return res.status(400).json({ error: "id, day, date, exercises are required" });
  }

  // Prevent overwriting another user's session by guessing/reusing an id
  const existing = db.prepare("SELECT user_id FROM sessions WHERE id = ?").get(id);
  if (existing && existing.user_id !== userId) {
    return res.status(403).json({ error: "forbidden" });
  }

  const insertSession = db.prepare(
    "INSERT OR REPLACE INTO sessions (id, user_id, day, date) VALUES (?, ?, ?, ?)"
  );
  const deleteOldLogs = db.prepare("DELETE FROM exercise_logs WHERE session_id = ?");
  const insertLog = db.prepare(`
    INSERT INTO exercise_logs (session_id, exercise, is_bodyweight, set_index, weight, reps)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    insertSession.run(id, userId, day, date);
    deleteOldLogs.run(id);
    Object.entries(exercises).forEach(([exercise, data]) => {
      const isBw = bw?.[exercise] ? 1 : 0;
      data.sets.forEach((set, idx) => {
        insertLog.run(
          id,
          exercise,
          isBw,
          idx,
          set.weight === "" || set.weight == null ? null : Number(set.weight),
          set.reps === "" || set.reps == null ? null : Number(set.reps)
        );
      });
    });
  });

  tx();
  res.status(201).json({ ok: true, id });
});

// DELETE /api/history/:id — remove a session, only if it belongs to the logged-in user
router.delete("/:id", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "not authenticated" });

  const info = db
    .prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?")
    .run(req.params.id, userId);
  if (info.changes === 0) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

module.exports = router;
