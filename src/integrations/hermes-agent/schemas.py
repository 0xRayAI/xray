"""Tool schemas — what the LLM sees."""

XRAY_VALIDATE = {
    "name": "xray_validate",
    "description": (
        "Run Xray pre-commit validation on specified files. "
        "Checks codex compliance, rule validation, and quality gates. "
        "Use this before committing any code changes. Returns pass/fail "
        "with actionable remediation for any violations."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "files": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of file paths to validate",
            },
            "operation": {
                "type": "string",
                "description": "Operation type (commit, create, modify, refactor)",
                "default": "commit",
            },
        },
        "required": ["files"],
    },
}

XRAY_CODEX_CHECK = {
    "name": "xray_codex_check",
    "description": (
        "Validate code against the Universal Development Codex (60 error-prevention terms). "
        "Checks error-handling, type-safety, performance, security, and architecture patterns. "
        "Use when you want to verify code quality against systematic standards."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Code snippet to validate against codex rules",
            },
            "operation": {
                "type": "string",
                "description": "What operation the code performs (create, modify, refactor)",
            },
            "focus_areas": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": ["error-handling", "type-safety", "performance", "security", "architecture"],
                },
                "description": "Specific codex areas to focus on",
            },
        },
        "required": ["operation"],
    },
}

XRAY_HEALTH = {
    "name": "xray_health",
    "description": (
        "Run Xray framework health check. Returns version, agent count, "
        "MCP server status, and enforcement statistics. Use to verify the "
        "Xray integration is working correctly."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
    },
}

XRAY_SKILL_INSTALL = {
    "name": "xray_skill_install",
    "description": (
        "Install skills from the registry or any git repo. "
        "Downloads skill definitions for specialized capabilities "
        "like UI/UX design, mobile development, security auditing, etc. "
        "Use this to add new skills to your development environment."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "source": {
                "type": "string",
                "description": "Source name or git URL to install skills from",
            },
        },
        "required": ["source"],
    },
}

XRAY_SKILL_REGISTRY = {
    "name": "xray_skill_registry",
    "description": (
        "Manage the skills registry — list available sources, "
        "add new sources, or remove existing ones. Use 'list' to see "
        "all available skill sources, 'add' to register a new source, "
        "'remove' to unregister an existing source."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["list", "add", "remove"],
                "description": "Registry action to perform",
            },
            "name": {
                "type": "string",
                "description": "Source name (required for add/remove)",
            },
            "url": {
                "type": "string",
                "description": "Repository URL (required for add)",
            },
        },
        "required": ["action"],
    },
}

XRAY_HOOKS = {
    "name": "xray_hooks",
    "description": (
        "Manage Xray git hooks (install, uninstall, list, status). "
        "Installs pre-commit, post-commit, pre-push, and post-push hooks "
        "that run TypeScript validation, Codex checks, and monitoring. "
        "Use 'install' to set up all hooks, 'list' to see current status."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["install", "uninstall", "list", "status"],
                "description": "Action to perform on git hooks",
            },
            "hooks": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": ["pre-commit", "post-commit", "pre-push", "post-push"],
                },
                "description": "Specific hooks to manage (default: all)",
            },
        },
        "required": ["action"],
    },
}
