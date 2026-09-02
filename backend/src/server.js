require("dotenv").config();

const cors = require("cors");
const express = require("express");

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "backend" });
});

app.use((error, _request, response, _next) => {
  if (error.message === "Origin not allowed by CORS") {
    response.status(403).json({ error: error.message });
    return;
  }

  response.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});