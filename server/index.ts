import dotenv from 'dotenv';
import cors from 'cors';
import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { json, urlencoded } from "express";
import rateLimit from 'express-rate-limit';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// Parse incoming JSON requests
app.use(json());

// Parse URL-encoded requests (for form submissions)
app.use(urlencoded({ extended: false }));

// Rate limiting middleware to avoid too many requests from the same client
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});
app.use(limiter);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "development-secret", // Make sure to set this in .env
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === "production", // Secure cookies in production
    maxAge: 30 * 24 * 60 * 60 * 1000, // Session expiration (30 days)
  }
}));

// Set up authentication
setupAuth(app);

// Custom logging middleware
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

// Global error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err); // Log error details to the console
});

// Register routes and start server
(async () => {
  const server = await registerRoutes(app);

  // Setup Vite in development environment
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server with retry mechanism
  const port = 5000;
  let retryCount = 0;
  const maxRetries = 3;

  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`Server running on port ${port}`);
  }).on('error', (e: any) => {
    if (e.code === 'EADDRINUSE' && retryCount < maxRetries) {
      log(`Port ${port} is busy, retrying...`);
      retryCount++;
      setTimeout(() => {
        server.close();
        server.listen({ port, host: "0.0.0.0", reusePort: true });
      }, 1000);
    } else {
      log(`Unable to start server: ${e.message}`);
    }
  });
})();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0); // Exit process after graceful shutdown
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
