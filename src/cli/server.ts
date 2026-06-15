import express, { Request, Response, NextFunction, RequestHandler } from "express";
import { exec } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as crypto from "crypto";
import { frameworkLogger } from "../core/framework-logger.js";
import { resolveConfigPath } from "../core/config-paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..", "..");
const PUBLIC_DIR = join(ROOT_DIR, "public");

// Read version dynamically from package.json
const packageJsonPath = join(ROOT_DIR, "package.json");
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

const app = express();
const PORT = 3000;

const API_KEY = process.env.XRAY_API_KEY || undefined;

function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!API_KEY) {
    frameworkLogger.log("cli-server", "auth-skipped", "warning", {
      message: "No XRAY_API_KEY set — API is unauthenticated. Set XRAY_API_KEY in production.",
    });
    return next();
  }

  const providedKey = req.headers["x-api-key"];
  if (typeof providedKey !== "string") {
    return res.status(401).json({ error: "API key required. Set XRAY_API_KEY environment variable." });
  }

  if (!timingSafeCompare(providedKey, API_KEY)) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
}

// Lazy load security headers middleware
let securityMiddleware: RequestHandler | null = null;
const getSecurityMiddleware = async () => {
  if (!securityMiddleware) {
    try {
      const { securityHeadersMiddleware } =
        await import("../security/security-headers");
      securityMiddleware = securityHeadersMiddleware.getExpressMiddleware();
    } catch (error) {
      frameworkLogger.log("cli-server", "security-middleware-unavailable", "warning", {
        message: "Security middleware not available, continuing without security headers",
      });
      securityMiddleware = (req: Request, res: Response, next: NextFunction) =>
        next(); // No-op middleware
    }
  }
  return securityMiddleware;
};

// Apply security headers middleware lazily
app.use(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const middleware = await getSecurityMiddleware();
    middleware(req, res, next);
  } catch (error) {
    frameworkLogger.log("cli-server", "security-middleware-load-failed", "warning", {
      error,
      message: "Security middleware failed to load, continuing without it",
    });
    next();
  }
});

// Serve static files
app.use(express.static(PUBLIC_DIR));

// API endpoints
app.get("/api/status", requireAuth, (req: Request, res: Response) => {
  // Return framework status
    res.json({
    framework: "0xRay",
    version,
    status: "active",
    agents: 8,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/agents", requireAuth, (req: Request, res: Response) => {
  // Return agent configurations
  res.json({
     agents: [
       "architect",
       "bug-triage-specialist",
      "code-reviewer",
      "security-auditor",
      "refactorer",
      "testing-lead",
    ],
  });
});

// Performance monitoring middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds
    // HTTP request logging - operational, keep for monitoring
  });
  next();
});

// Add route for root path
app.get("/", (req: Request, res: Response) => {
  res.sendFile(join(PUBLIC_DIR, "index.html"));
});

// Add route for refactoring logs
app.get("/logs", requireAuth, async (req: Request, res: Response) => {
  const logPath = resolveConfigPath("REFACTORING_LOG.md") || join(__dirname, "..", ".xray", "REFACTORING_LOG.md");
  // Server debug logging - remove for production

  try {
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, "utf-8");
      res.setHeader("Content-Type", "text/markdown");
      res.send(content);
    } else {
      res
        .status(404)
        .send(
          "Refactoring log not found. The framework may not have generated any logs yet.",
        );
    }
  } catch (error) {
    // File read error - remove debug logging
    res.status(500).send("Server error reading log file.");
  }
});

// Global error handler (4-param middleware must be registered before listen)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  frameworkLogger.log("cli-server", "unhandled-error", "error", { error: err, path: req.path });
  res.status(500).send("Internal Server Error");
});

app.listen(PORT, () => {
  // Auto-open browser
  const start =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${start} http://localhost:${PORT}`);
});
