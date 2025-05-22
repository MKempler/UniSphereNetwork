import dotenv from "dotenv";
import path from "path";
// Correct path for .env when CWD is server/
dotenv.config({ path: path.resolve(process.cwd(), "../.env") }); 

console.log("[db.ts] CWD:", process.cwd());
console.log("[db.ts] DATABASE_URL (after dotenv in db.ts):", process.env.DATABASE_URL);

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema.ts";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database? (Error in db.ts)",
  );
}

export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });