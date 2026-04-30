import * as path from "path";
import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext, ProcessorResult } from "../processor-types.js";
import { captureSessionInference, saveSessionInference } from "../../inference/session-capture.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { featuresConfigLoader } from "../../core/features-config.js";

export class SessionCaptureProcessor extends PostProcessor {
  name = "session-capture";
  priority = 99;

  protected async run(context: ProcessorContext): Promise<ProcessorResult> {
    const features = featuresConfigLoader.loadConfig() as any;
    if (!features?.inference?.enabled) {
      return { success: true, data: { message: "Inference disabled" }, duration: 0, processorName: this.name };
    }

    const lastTag = this.getLastTag();
    if (!lastTag) {
      return { success: true, data: { message: "No git tags" }, duration: 0, processorName: this.name };
    }

    try {
      const session = captureSessionInference(lastTag, "HEAD");
      if (!session) {
        return { success: true, data: { message: "No session data" }, duration: 0, processorName: this.name };
      }

      if (session.metrics.commits < 3) {
        return { success: true, data: { message: `Only ${session.metrics.commits} commits` }, duration: 0, processorName: this.name };
      }

      const savedPath = saveSessionInference(session);
      frameworkLogger.log("session-capture", "session-saved", "info", {
        sessionId: session.sessionId,
        commits: session.metrics.commits,
        path: savedPath,
      });

      return {
        success: true,
        data: { message: `Session captured: ${session.metrics.commits} commits`, path: savedPath },
        duration: 0,
        processorName: this.name,
      };
    } catch (error) {
      frameworkLogger.log("session-capture", "capture-error", "warning", {
        error: String(error),
      });
      return { success: true, data: { message: `Capture skipped: ${String(error)}` }, duration: 0, processorName: this.name };
    }
  }

  private getLastTag(): string | null {
    try {
      const { execSync } = require("child_process") as typeof import("child_process");
      const tag = execSync("git describe --tags --abbrev=0 2>/dev/null", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      return tag || null;
    } catch {
      return null;
    }
  }
}
