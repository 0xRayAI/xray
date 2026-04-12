/**
 * 0xRay Codex Injection Plugin for OpenCode
 *
 * This plugin automatically injects the Universal Development Codex v1.2.0
 * into the system prompt for all AI agents, ensuring codex terms are
 * consistently enforced across the entire development session.
 *
 * @version 1.0.0
 * @author 0xRay Framework
 */
export default function strrayCodexPlugin(input: {
    client?: string;
    directory?: string;
    worktree?: string;
}): Promise<{
    "experimental.chat.system.transform": (_input: Record<string, unknown>, output: {
        system?: string[];
    }) => Promise<void>;
    "tool.execute.before": (input: {
        tool: string;
        args?: {
            content?: string;
            filePath?: string;
        };
    }, output: any) => Promise<void>;
    "tool.execute.after": (input: {
        tool: string;
        args?: {
            content?: string;
            filePath?: string;
        };
        result?: any;
    }, _output: any) => Promise<void>;
    config: (_config: Record<string, unknown>) => Promise<void>;
}>;
//# sourceMappingURL=strray-codex-injection.d.ts.map