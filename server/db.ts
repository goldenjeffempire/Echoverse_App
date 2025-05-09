import dotenv from 'dotenv';  // Import dotenv for loading environment variables
import { Pool, neonConfig } from '@neondatabase/serverless';  // Import Neon database and connection pool
import { drizzle } from 'drizzle-orm/neon-serverless';  // Import Drizzle ORM for Neon database
import ws from 'ws';  // Import WebSocket for Neon config
import * as schema from '@shared/schema';  // Import the shared schema

// Load environment variables from .env file
dotenv.config();

// Configure WebSocket constructor for Neon
neonConfig.webSocketConstructor = ws;

// Ensure DATABASE_URL environment variable is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Create a connection pool with the provided DATABASE_URL
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Drizzle ORM with the connection pool and shared schema
export const db = drizzle({ client: pool, schema });
