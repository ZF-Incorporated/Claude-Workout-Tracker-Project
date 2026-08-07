const express = require("express");
const cors = require("cors");
const path = require("path");
const historyRoutes = require("./routes/history");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the frontend as static files (single-origin, no CORS headaches on your phone)
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/history", historyRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Workout tracker API running on http://localhost:${PORT}`);
});
