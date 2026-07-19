import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { setupDb } from "./src/server/db";
import apiRoutes from "./src/server/api";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Setup DB
  setupDb();

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // API Routes
  app.use("/api", apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import("path");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Also serve uploads in production
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
    app.get("*", (req, res) => {
      // Don't serve index.html for uploads
      if (req.path.startsWith("/uploads/") || req.path.startsWith("/api/")) return;
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
