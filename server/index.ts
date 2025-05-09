import dotenv from 'dotenv';
import cors from 'cors';
import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { json, urlencoded } from "express";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Basic middleware
app.use(cors());  // Enable CORS
app.use(json());
app.use(urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "development-secret", // Corrected environment variable
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production", // Corrected environment variable
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
}));

// Set up authentication
setupAuth(app);

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let jsonResponse: any;

  const originalJson = res.json;
  res.json = function (body) {
    jsonResponse = body;
    return originalJson.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (jsonResponse) {
        logLine += ` :: ${JSON.stringify(jsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 77) + "...";
      }
      log(logLine);
    }
  });

  next();
});

// Register all routes and start the server
(async () => {
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err; // Rethrow the error after responding
  });

  // Setup Vite in development environment
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = 5000;
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`Server running on port ${port}`);
  }).on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      log(`Port ${port} is busy, retrying...`);
      setTimeout(() => {
        server.close();
        server.listen({ port, host: "0.0.0.0", reusePort: true });
      }, 1000);
    }
  });
})();
