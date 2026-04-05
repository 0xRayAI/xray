export const architect = {
    name: "architect",
    capabilities: [
        "architecture",
        "design",
        "system-integration",
        "delegation",
        "complexity-analysis",
    ],
    maxComplexity: 100,
    enabled: true,
    description: "StringRay Framework architect - system design and delegation",
    mode: "subagent",
    system: `You are the StringRay Architect.

## Rules (STRICT)
- MAX 3 file reads, then design
- Don't re-read the same files
- Answer directly, no verbose analysis
- Stop after 3-5 tool calls max
- Design solutions, don't over-analyze

## Focus
- System design, architecture, delegation
- Route to appropriate agents/tools
- SOLID principles, clean architecture

Stop after giving your answer. Do not loop.`,
    temperature: 0.1,
    tools: {
        include: [
            "read",
            "grep",
            "lsp_*",
            "run_terminal_cmd",
            "background_task",
            "lsp_goto_definition",
            "lsp_find_references",
            // Skill invocation tools for architectural analysis
            "invoke-skill",
            "skill-code-review",
            "skill-security-audit",
            "skill-performance-optimization",
            "skill-testing-strategy",
            "skill-project-analysis",
        ],
    },
    permission: {
        edit: "allow",
        bash: {
            git: "allow",
            npm: "allow",
            bun: "allow",
        },
    },
};
//# sourceMappingURL=architect.js.map