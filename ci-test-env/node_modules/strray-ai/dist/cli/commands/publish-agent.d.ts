/**
 * Publish Agent CLI Command
 *
 * Packages and publishes agents to AgentStore for sharing.
 *
 * Usage: npx strray-ai publish-agent [options]
 * Options:
 *   --agent <name>    Agent name to publish (required)
 *   --version <ver>   Version (optional, auto-detected)
 *   --dry-run         Preview package without publishing
 *
 * Example: npx strray-ai publish-agent --agent orchestrator --dry-run
 */
export declare function publishAgentCommand(): Promise<void>;
export default publishAgentCommand;
//# sourceMappingURL=publish-agent.d.ts.map