import { app } from "./serverImpl";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const PORT = 3000;

  // Vite middleware or static files serving
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode serving built assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server runs on port ${PORT}`);
  });
}

// In standard Long-Running container runtime, we start the server automatically
startServer();
