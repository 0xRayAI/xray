/**
 * Session Management MCP Server
 *
 * Tools for managing user sessions and persistent state.
 * Provides session lifecycle management, state persistence, and cleanup utilities.
 */

import * as fs from "fs";
import { frameworkLogger } from "../../core/framework-logger.js";
import { XrayKnowledgeSkillBase, type ToolDefinition } from "../shared/knowledge-skill-base.js";

interface Tool {
  name: string;
  description: string;
  inputSchema: object;
}

// In-memory session store for MCP server context
interface SessionData {
  id: string;
  data: Record<string, unknown>;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number | undefined;
}

class SessionManagementServer extends XrayKnowledgeSkillBase {
  private sessions: Map<string, SessionData> = new Map();
  protected tools: ToolDefinition[] = [
    {
      name: "create_session",
      description:
        "Create a new session with optional data and expiration",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Optional custom session ID (generated if not provided)",
          },
          data: {
            type: "object",
            description: "Initial session data",
          },
          ttl: {
            type: "number",
            description: "Time to live in seconds (optional)",
          },
        },
      },
    },
    {
      name: "get_session",
      description:
        "Retrieve session data by session ID",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to retrieve",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "update_session",
      description:
        "Update session data",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to update",
          },
          data: {
            type: "object",
            description: "Data to merge with existing session",
          },
          extendTtl: {
            type: "number",
            description: "Extend TTL by this many seconds",
          },
        },
        required: ["sessionId", "data"],
      },
    },
    {
      name: "delete_session",
      description:
        "Delete a session",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to delete",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "list_sessions",
      description:
        "List all active sessions",
      inputSchema: {
        type: "object",
        properties: {
          includeExpired: {
            type: "boolean",
            default: false,
            description: "Include expired sessions in the list",
          },
          limit: {
            type: "number",
            default: 50,
            description: "Maximum number of sessions to return",
          },
        },
      },
    },
    {
      name: "session_exists",
      description:
        "Check if a session exists and is valid",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to check",
          },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "cleanup_expired_sessions",
      description:
        "Clean up all expired sessions",
      inputSchema: {
        type: "object",
        properties: {
          dryRun: {
            type: "boolean",
            default: false,
            description: "If true, only return what would be deleted without deleting",
          },
        },
      },
    },
  ];

  constructor() {
    super("session-management", "3.1.0");

    this.handlers = {
      create_session: async (args) => this.handleCreateSession(args as Record<string, unknown>),
      get_session: async (args) => this.handleGetSession(args as Record<string, unknown>),
      update_session: async (args) => this.handleUpdateSession(args as Record<string, unknown>),
      delete_session: async (args) => this.handleDeleteSession(args as Record<string, unknown>),
      list_sessions: async (args) => this.handleListSessions(args as Record<string, unknown>),
      session_exists: async (args) => this.handleSessionExists(args as Record<string, unknown>),
      cleanup_expired_sessions: async (args) => this.handleCleanupExpiredSessions(args as Record<string, unknown>),
    };

    this.setupToolHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private isExpired(session: SessionData): boolean {
    if (!session.expiresAt) return false;
    return Date.now() > session.expiresAt;
  }

  private handleCreateSession(args: Record<string, unknown>) {
    const sessionId = args.sessionId as string | undefined;
    const data = (args.data as Record<string, unknown>) || {};
    const ttl = args.ttl as number | undefined;
    const id = sessionId || this.generateSessionId();

    const now = Date.now();
    const session: SessionData = {
      id,
      data: data as Record<string, unknown>,
      createdAt: now,
      lastAccessed: now,
      expiresAt: ttl ? now + ttl * 1000 : undefined,
    };

    this.sessions.set(id, session);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              sessionId: id,
              createdAt: new Date(session.createdAt).toISOString(),
              expiresAt: session.expiresAt
                ? new Date(session.expiresAt).toISOString()
                : "never",
              data: session.data,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private handleGetSession(args: Record<string, unknown>) {
    const sessionId = args.sessionId as string;
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: "Session not found",
                sessionId,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }

    if (this.isExpired(session)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: "Session has expired",
                sessionId,
                expiredAt: session.expiresAt,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }

    // Update last accessed
    session.lastAccessed = Date.now();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              sessionId: session.id,
              createdAt: new Date(session.createdAt).toISOString(),
              lastAccessed: new Date(session.lastAccessed).toISOString(),
              expiresAt: session.expiresAt
                ? new Date(session.expiresAt).toISOString()
                : "never",
              data: session.data,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private handleUpdateSession(args: Record<string, unknown>) {
    const sessionId = args.sessionId as string;
    const data = args.data as Record<string, unknown>;
    const extendTtl = args.extendTtl as number | undefined;
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: "Session not found",
                sessionId,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }

    // Merge data
    session.data = { ...session.data, ...data };
    session.lastAccessed = Date.now();

    // Extend TTL if requested
    if (extendTtl && session.expiresAt) {
      session.expiresAt = session.expiresAt + extendTtl * 1000;
    } else if (extendTtl && !session.expiresAt) {
      session.expiresAt = Date.now() + extendTtl * 1000;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              sessionId: session.id,
              updatedAt: new Date(session.lastAccessed).toISOString(),
              expiresAt: session.expiresAt
                ? new Date(session.expiresAt).toISOString()
                : "never",
              data: session.data,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private handleDeleteSession(args: Record<string, unknown>) {
    const sessionId = args.sessionId as string;
    const existed = this.sessions.has(sessionId);
    this.sessions.delete(sessionId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              sessionId,
              deleted: existed,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private handleListSessions(args: Record<string, unknown>) {
    const includeExpired = (args.includeExpired as boolean) || false;
    const limit = (args.limit as number) || 50;
    const now = Date.now();

    const sessions = Array.from(this.sessions.values())
      .filter((session) => {
        if (includeExpired) return true;
        if (!session.expiresAt) return true;
        return now < session.expiresAt;
      })
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit)
      .map((session) => ({
        sessionId: session.id,
        createdAt: new Date(session.createdAt).toISOString(),
        lastAccessed: new Date(session.lastAccessed).toISOString(),
        expiresAt: session.expiresAt
          ? new Date(session.expiresAt).toISOString()
          : "never",
        isExpired: session.expiresAt ? now > session.expiresAt : false,
        dataKeys: Object.keys(session.data),
      }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total: sessions.length,
              includeExpired,
              sessions,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private handleSessionExists(args: Record<string, unknown>) {
    const sessionId = args.sessionId as string;
    const session = this.sessions.get(sessionId);

    const exists = session && !this.isExpired(session);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              sessionId,
              exists,
              ...(session && !this.isExpired(session)
                ? {
                    createdAt: new Date(session.createdAt).toISOString(),
                    lastAccessed: new Date(session.lastAccessed).toISOString(),
                  }
                : {}),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private handleCleanupExpiredSessions(args: Record<string, unknown>) {
    const dryRun = (args.dryRun as boolean) || false;
    const now = Date.now();
    let cleaned = 0;
    const expiredIds: string[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt && now > session.expiresAt) {
        expiredIds.push(id);
        if (!dryRun) {
          this.sessions.delete(id);
        }
        cleaned++;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              dryRun,
              cleaned,
              expiredSessionIds: expiredIds,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // run() removed — handled by XrayKnowledgeSkillBase
}

if (import.meta.url === `file://${fs.realpathSync(process.argv[1]!)}`) {
  const server = new SessionManagementServer();
  server.run().catch((error) => frameworkLogger.log("mcps/session-management", "run", "error", { error: String(error) }));
}

export default SessionManagementServer;
