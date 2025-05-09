import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { URL } from "url"; // Required for import.meta.dirname
import dotenv from "dotenv"; // Import dotenv

// Load environment variables from .env file
dotenv.config();

// Create a custom logger for Vite
const viteLogger = createLogger();

// Logger function to log messages with timestamp and source
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Function to set up Vite for SSR (Server-Side Rendering) with Express
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true, // Use middleware mode for SSR
    hmr: { server }, // Enable Hot Module Replacement (HMR) support
    allowedHosts: true, // Allows requests from all hosts
  };

  // Create Vite server with custom configuration
  const vite = await createViteServer({
    ...viteConfig, // Spread the Vite config into the server setup
    configFile: false, // Don't use a config file
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1); // Exit the process on error
      },
    },
    server: serverOptions, // Set server options for HMR and allowed hosts
    appType: "custom", // Use custom app setup for SSR
  });

  // Apply Vite middlewares (necessary for SSR)
  app.use(vite.middlewares);

  // Catch-all route for serving SSR pages with Vite transformations
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl; // Get the original URL requested

    try {
      // Resolve the path to the client-side HTML template
      const clientTemplate = path.resolve(
        new URL(import.meta.url).pathname,
        "..",
        "client",
        "index.html"
      );

      // Read the HTML template file
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Apply cache-busting by appending a unique version query string to the script tag
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Use Vite to transform the index.html with any necessary SSR-specific transformations
      const page = await vite.transformIndexHtml(url, template);

      // Send the transformed HTML page back to the client
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error); // Fix stack trace for SSR
      next(e); // Pass any errors to the next middleware
    }
  });
}

// Function to serve static files after the client is built
export function serveStatic(app: Express) {
  const distPath = path.resolve(new URL(import.meta.url).pathname, "public");

  // Check if the public directory exists
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve static files from the public directory
  app.use(express.static(distPath));

  // If a static file doesn't exist, fall back to serving index.html
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
