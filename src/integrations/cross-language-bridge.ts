/**
 * 0xRay v1.2.0
 *
 * JSON-RPC/WebSocket bridge for TypeScript-Python communication.
 * Enables TypeScript agents to access Python BaseAgent capabilities.
 *
 * @since 2026-01-09
 */

import { WebSocket } from 'ws';
import {
  BaseIntegration,
  type IntegrationConfig,
  type HealthResult,
} from "./base/index.js";

export type JSONPrimitives = string | number | boolean | null;

export interface JSONArray extends Array<JSONValue> {}

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONValue = JSONPrimitives | JSONArray | JSONObject;

export interface RPCParamsObject {
  [key: string]: JSONValue;
}

export type RPCParams = JSONValue | RPCParamsObject;

export interface RPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: RPCParams;
}

export interface RPCErrorData {
  code: number;
  message: string;
  data?: JSONValue;
}

export interface RPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: JSONValue;
  error?: RPCErrorData;
}

export interface RPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: RPCParams;
}

export interface CodexViolation {
  term_id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface CodexComplianceResult {
  compliant: boolean;
  violations: CodexViolation[];
  recommendations: string[];
}

export interface DeepReasoningResult {
  reasoning: string;
  confidence: number;
  recommendations: string[];
}

export interface AgentState {
  [key: string]: JSONValue;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  errorRate: number;
}

export interface SecurityValidationResult {
  safe: boolean;
  threats: string[];
  recommendations: string[];
}

export interface BaseAgentCapabilities {
  validateCodexCompliance(
    content: string,
    context: RPCParamsObject,
  ): Promise<CodexComplianceResult>;

  performDeepReasoning(
    query: string,
    context: RPCParamsObject,
  ): Promise<DeepReasoningResult>;

  persistAgentState(agentId: string, state: AgentState): Promise<boolean>;
  loadAgentState(agentId: string): Promise<AgentState>;

  getPerformanceMetrics(agentId: string): Promise<PerformanceMetrics>;

  validateSecurity(
    content: string,
    operation: string,
  ): Promise<SecurityValidationResult>;
}

export interface CrossLanguageBridgeConfig extends Partial<IntegrationConfig> {
  pythonServerUrl?: string;
  connectionTimeout?: number;
}

export class CrossLanguageBridge extends BaseIntegration {
  private ws: WebSocket | null = null;
  private connected = false;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: JSONValue) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private requestId = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private pythonServerUrl: string;
  private connectionTimeout: number;

  constructor(config?: CrossLanguageBridgeConfig) {
    super("cross-language-bridge", "1.0.0", config);

    this.pythonServerUrl = config?.pythonServerUrl ?? "ws://localhost:8765";
    this.connectionTimeout = config?.connectionTimeout ?? 5000;
  }

  protected async performInitialization(): Promise<void> {
    await this.log("info", "Initializing CrossLanguageBridge...");
    await this.connect();
  }

  protected async performShutdown(): Promise<void> {
    await this.log("info", "Shutting down CrossLanguageBridge...");
    await this.disconnect();
  }

  protected async performHealthCheck(): Promise<HealthResult> {
    if (this.connected) {
      return {
        healthy: true,
        message: "Connected to Python server",
        details: {
          pendingRequests: this.pendingRequests.size,
          reconnectAttempts: this.reconnectAttempts,
        },
      };
    }

    return {
      healthy: false,
      message: "Not connected to Python server",
      details: {
        pendingRequests: this.pendingRequests.size,
        reconnectAttempts: this.reconnectAttempts,
      },
    };
  }

  private async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.log(
        "info",
        `Connecting to Python server: ${this.pythonServerUrl}`,
      );

      this.ws = new WebSocket(this.pythonServerUrl, {
        handshakeTimeout: this.connectionTimeout,
      } as any);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(
            new Error(`Connection timeout after ${this.connectionTimeout}ms`),
          );
        }, this.connectionTimeout);

        this.ws!.on("open", () => {
          clearTimeout(timeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit("connected");
          this.log("success", "Connected to Python server");
          resolve();
        });

        this.ws!.on("message", (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws!.on("error", (error: Error) => {
          clearTimeout(timeout);
          this.log("error", `Connection error: ${error.message}`);
          reject(error);
        });

        this.ws!.on("close", () => {
          this.connected = false;
          this.emit("disconnected");
          this.log("info", "Disconnected from Python server");

          // CRITICAL FIX: Remove all listeners to prevent memory leaks
          this.ws!.removeAllListeners();

          // Auto-reconnect if not manually closed
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(
              () => {
                this.reconnectAttempts++;
                this.connect();
              },
              this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            );
          }
        });
      });
    } catch (error) {
      this.log(
        "error",
        `Connection failed: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private handleMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as
        | RPCResponse
        | RPCNotification;

      if (
        "id" in message &&
        message.id !== undefined &&
        this.pendingRequests.has(message.id)
      ) {
        // Handle RPC response
        const { resolve, reject, timeout } = this.pendingRequests.get(
          message.id,
        )!;
        clearTimeout(timeout);
        this.pendingRequests.delete(message.id);

        if ("error" in message && message.error) {
          reject(
            new Error(
              `RPC Error ${message.error.code}: ${message.error.message}`,
            ),
          );
        } else if ("result" in message) {
          resolve(message.result);
        }
      } else if ("method" in message) {
        // Handle incoming notifications/calls from Python
        this.emit("notification", message.method, message.params);
      }
    } catch (error) {
      this.log(
        "error",
        `Message handling error: ${(error as Error).message}`,
      );
    }
  }

  async sendRequest(
    method: string,
    params?: RPCParams,
    timeoutMs = 30000,
  ): Promise<JSONValue> {
    if (!this.connected) {
      await this.connect();
    }

    const id = ++this.requestId;
    const request: RPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`RPC request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  // BaseAgent capability implementations
  async validateCodexCompliance(
    content: string,
    context: RPCParamsObject,
  ): Promise<CodexComplianceResult> {
    return this.sendRequest("validateCodexCompliance", { content, context }) as unknown as Promise<CodexComplianceResult>;
  }

  async performDeepReasoning(
    query: string,
    context: RPCParamsObject,
  ): Promise<DeepReasoningResult> {
    return this.sendRequest("performDeepReasoning", { query, context }) as unknown as Promise<DeepReasoningResult>;
  }

  async persistAgentState(agentId: string, state: AgentState): Promise<boolean> {
    return this.sendRequest("persistAgentState", { agentId, state }) as unknown as Promise<boolean>;
  }

  async loadAgentState(agentId: string): Promise<AgentState> {
    return this.sendRequest("loadAgentState", { agentId }) as unknown as Promise<AgentState>;
  }

  async getPerformanceMetrics(agentId: string): Promise<PerformanceMetrics> {
    return this.sendRequest("getPerformanceMetrics", { agentId }) as unknown as Promise<PerformanceMetrics>;
  }

  async validateSecurity(content: string, operation: string): Promise<SecurityValidationResult> {
    return this.sendRequest("validateSecurity", { content, operation }) as unknown as Promise<SecurityValidationResult>;
  }

  // Utility methods
  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }

  getConnectionStats() {
    return {
      connected: this.connected,
      pendingRequests: this.pendingRequests.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance for framework-wide use
let bridgeInstance: CrossLanguageBridge | null = null;

export function getCrossLanguageBridge(): CrossLanguageBridge {
  if (!bridgeInstance) {
    bridgeInstance = new CrossLanguageBridge();
  }
  return bridgeInstance;
}

// Convenience function for TypeScript agents to access BaseAgent capabilities
export async function callBaseAgent(
  method: string,
  params: RPCParamsObject = {},
): Promise<JSONValue> {
  const bridge = getCrossLanguageBridge();
  return bridge.sendRequest(method, params);
}
