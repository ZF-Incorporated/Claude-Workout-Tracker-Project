# Workout Tracker — Backend

A real backend for your progressive overload tracker: Node.js + Express API,
SQLite database, and the same frontend you've been using, now served by
the backend instead of relying on browser storage.

## What's in here

```
workout-backend/
├── server.js           # Express app entry point
├── db.js                # SQLite connection + schema
├── routes/
│   └── history.js       # GET/POST/DELETE /api/history
├── public/
│   └── index.html        # Your frontend (fetches from the API now)
├── package.json
└── workout.db            # Created automatically on first run
```

## Run it locally

1. Install Node.js if you don't have it: https://nodejs.org (LTS version)
2. Open a terminal in this folder and run:
   ```
   npm install
   npm start
   ```
3. Open **http://localhost:3001** in your browser — that's your tracker,
   now backed by a real database file (`workout.db`) instead of localStorage.

Your data now lives in `workout.db`. As long as that file exists, your
history persists — restarting the server, closing your laptop, none of
that touches it.

## Using it from your phone

Your phone can't reach `localhost` on your computer. Two options:

**Option A — same WiFi network (quick, free, good for home gym use):**
1. Find your computer's local IP (e.g. `192.168.1.50`) — on Mac:
   System Settings → Wi-Fi → Details. On Windows: `ipconfig` in Command Prompt.
2. On your phone's browser, go to `http://192.168.1.50:3001`
3. Add to Home Screen. Both devices now read the same database as long
   as your computer is on and running `npm start`.

**Option B — deploy it for real (works anywhere, no computer needed):**
1. Push this folder to a free host like **Render.com** or **Railway.app**
   (both have generous free tiers for small Node apps)
2. Add a **persistent disk** in the host's settings so `workout.db` survives
   restarts (both Render and Railway support this — look for "Disks" or
   "Volumes" in their dashboard)
3. Once deployed you'll get a permanent URL like `your-app.onrender.com`
   — open that on your phone, Add to Home Screen, done. Works from
   anywhere, gym or not.

If you want, I can walk you through either deployment step by step when
you're ready.

## API reference

| Method | Endpoint              | Description                          |
|--------|------------------------|---------------------------------------|
| GET    | `/api/history`          | All sessions with nested exercise logs |
| POST   | `/api/history`          | Create or overwrite a session         |
| DELETE | `/api/history/:id`      | Delete a session by id                |
| GET    | `/api/health`           | Health check                          |

## Notes

- The database schema stores one row per set, per exercise, per session —
  this makes it easy to later add things like progress charts or PR
  tracking without restructuring anything.
- `better-sqlite3` is a native module — if `npm install` fails on your
  machine, you likely need Xcode Command Line Tools (Mac) or the
  "Desktop development with C++" workload (Windows). Let me know if you
  hit that and I'll help troubleshoot.
