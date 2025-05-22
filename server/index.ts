import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
console.log("CWD:", process.cwd());
console.log("DATABASE_URL (after dotenv):", process.env.DATABASE_URL);
import expressPkg from "express";
const express = expressPkg;
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.ts";
import { setupVite, serveStatic, log } from "./vite.ts";
import session from "express-session";
import { createClient } from "redis";

const app = express();

// Enable CORS for all routes and origins (you can configure this more strictly later)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  console.log("SERVER START: Beginning async execution in server/index.ts");
  
  // Dynamically import connect-redis for ESM compatibility
  const importedModule = await import("connect-redis");
  
  // @ts-ignore: TS may not recognize .default or .RedisStore on dynamic import result type
  let StoreConstructor = importedModule.default;

  // If .default is not a constructor/function, try for a named export 'RedisStore'
  if (typeof StoreConstructor !== 'function') {
    // @ts-ignore: TS may not recognize .RedisStore on dynamic import result type
    StoreConstructor = importedModule.RedisStore;
  }

  // As a fallback, if neither .default nor .RedisStore is the constructor,
  // check if the module itself is the constructor (less common).
  if (typeof StoreConstructor !== 'function') {
    StoreConstructor = importedModule;
  }

  // Final check to ensure we have a constructor
  if (typeof StoreConstructor !== 'function') {
    console.error("Failed to resolve RedisStore constructor from connect-redis.");
    console.error("Imported module:", importedModule);
    console.error("Attempted StoreConstructor:", StoreConstructor);
    throw new TypeError("RedisStore (from connect-redis) is not a constructor or could not be found.");
  }

  const redisClient = createClient();
  await redisClient.connect().catch(console.error);
  
  const redisStore = new StoreConstructor({
    client: redisClient,
    prefix: "sess:",
  });

  app.use(session({
    store: redisStore,
    secret: "your-very-secret-key", // Use a strong secret in production!
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      httpOnly: true,
      secure: false, // Set to true if using HTTPS
    },
  }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

  // ADD DIAGNOSTIC MIDDLEWARE HERE
  app.use("/api/auth/login", (req, res, next) => {
    console.log("DIAGNOSTIC LOG: Saw request for /api/auth/login BEFORE registerRoutes");
    next();
  });

  app.use("/api/users/me", (req, res, next) => {
    console.log("DIAGNOSTIC LOG: Saw request for /api/users/me BEFORE registerRoutes");
    next();
  });

  const server = await registerRoutes(app);
  console.log("SERVER START: registerRoutes has completed.");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // throw err; // Commenting this out to prevent server crashes on API errors
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "localhost", () => {
    log(`serving on port ${port}`);
  });
})();
