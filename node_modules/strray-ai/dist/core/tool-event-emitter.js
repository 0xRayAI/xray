/**
 * Tool Event Emitter
 *
 * Simple event system to capture all tool calls and route them
 * through the activity logger and skills router.
 *
 * @version 1.0.0
 */
import { EventEmitter } from "events";
import { activity } from "./activity-logger.js";
class ToolEventEmitter extends EventEmitter {
    static instance;
    constructor() {
        super();
        this.setupLogging();
    }
    static getInstance() {
        if (!ToolEventEmitter.instance) {
            ToolEventEmitter.instance = new ToolEventEmitter();
        }
        return ToolEventEmitter.instance;
    }
    setupLogging() {
        // Log all tool events to activity logger
        this.on("tool", (event) => {
            activity.script("tool-executed", `Tool ${event.tool} executed`, {
                tool: event.tool,
                duration: event.duration,
                success: !event.error,
                args: Object.keys(event.args || {}),
            });
        });
        this.on("tool:start", (event) => {
            activity.script("tool-started", `Tool ${event.tool} started`, {
                tool: event.tool,
                args: Object.keys(event.args || {}),
            });
        });
        this.on("tool:complete", (event) => {
            const success = !event.error;
            if (success) {
                activity.success("agent", "tool-complete", `Tool ${event.tool} completed`, {
                    tool: event.tool,
                    duration: event.duration,
                });
            }
            else {
                activity.error("agent", "tool-failed", `Tool ${event.tool} failed`, {
                    tool: event.tool,
                    error: event.error || "unknown",
                    duration: event.duration,
                });
            }
        });
    }
    emitToolStart(tool, args) {
        const event = {
            tool,
            args,
            duration: 0,
            timestamp: Date.now(),
        };
        this.emit("tool:start", event);
        this.emit("tool", event);
    }
    emitToolComplete(tool, args, result, error, duration) {
        const event = {
            tool,
            args,
            result,
            duration: duration || 0,
            timestamp: Date.now(),
        };
        // Only set error if it's defined
        if (error) {
            event.error = error;
        }
        this.emit("tool:complete", event);
        this.emit("tool", event);
    }
}
// Singleton export
export const toolEvents = ToolEventEmitter.getInstance();
// Convenience functions
export function logToolStart(tool, args = {}) {
    toolEvents.emitToolStart(tool, args);
}
export function logToolComplete(tool, args = {}, result, error, duration) {
    toolEvents.emitToolComplete(tool, args, result, error, duration);
}
//# sourceMappingURL=tool-event-emitter.js.map