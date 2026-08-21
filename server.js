const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const historyRoutes = require("./routes/history");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the frontend as static files (single-origin, no CORS headaches on your phone)
app.use(express.static(path.join(__dirname, "public")));

// Decodes the base64 JSON blob Easy Auth attaches to every authenticated
// request, so we can pull a friendlier display name than just the email.
function parseDisplayName(req) {
  const raw = req.headers["x-ms-client-principal"];
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    const claims = decoded.claims || [];
    const nameClaim = claims.find((c) => c.typ === "name");
    return nameClaim ? nameClaim.val : null;
  } catch {
    return null; // malformed header shouldn't crash the request
  }
}

// Runs on every request. If the person is authenticated, creates their
// profile row on first sight and refreshes it on every visit after —
// this is the entire "new profile generated on login" behavior, no
// separate sign-up step required.
app.use((req, res, next) => {
  const userId = req.headers["x-ms-client-principal-id"];
  if (userId) {
    const email = req.headers["x-ms-client-principal-name"] || null;
    const displayName = parseDisplayName(req) || email;
    db.upsertUser(userId, email, displayName);
    req.userId = userId;
    req.userDisplayName = displayName;
  }
  next();
});

app.use("/api/history", historyRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// For the future welcome screen — frontend can call this to greet the user.
app.get("/api/me", (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "not authenticated" });
  res.json({ id: req.userId, displayName: req.userDisplayName });
});

app.listen(PORT, () => {
  console.log(`Workout tracker API running on http://localhost:${PORT}`);
});
