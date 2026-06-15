"""Tool handlers — code that runs when the LLM calls each tool.

v2.0: Now uses the Node.js bridge for real framework integration.
Falls back to CLI (npx 0xray) when bridge is unavailable.
"""

import json
import subprocess
import shutil
import os
from pathlib import Path
from . import schemas

def _bridge_call(command: dict, timeout: int = 10) -> dict:
    """Call the Hermes bridge via subprocess stdin."""
    from . import _call_bridge
    return _call_bridge(command, timeout)

def _run_xray(args: list, timeout: int = 30) -> str:
    """Fallback: run npx 0xray CLI command."""
    try:
        result = subprocess.run(
            ["npx", "0xray"] + args,
            capture_output=True, text=True, timeout=timeout,
        )
        return result.stdout
    except FileNotFoundError:
        return json.dumps({"error": "0xray not found. Run: npm install -g 0xray"})
    except subprocess.TimeoutExpired:
        return json.dumps({"error": f"Command timed out after {timeout}s"})
    except Exception as e:
        return json.dumps({"error": str(e)})

def _get_project_root() -> str:
    """Find project root (used in fallback mode)."""
    from . import PROJECT_ROOT
    return str(PROJECT_ROOT)


# ── Tool: xray_validate ─────────────────────────────────────

def xray_validate(args: dict, **kwargs) -> str:
    """Run pre-commit validation on files using the framework.

    Uses bridge for real quality gate + processor pipeline.
    Falls back to CLI if bridge unavailable.
    """
    files = args.get("files", [])
    operation = args.get("operation", "commit")

    if not files:
        return json.dumps({"error": "No files specified for validation"})

    # Try bridge first (real framework integration)
    bridge_result = _bridge_call({
        "command": "validate",
        "files": files,
        "operation": operation,
    }, timeout=30)

    if "error" not in bridge_result:
        return json.dumps({
            "status": "passed" if bridge_result.get("passed") else "violations",
            "operation": operation,
            "files_checked": len(files),
            "file_results": bridge_result.get("fileResults", []),
            "via": "bridge",
        })

    # Fallback to CLI
    result = json.loads(_run_xray(["validate"], timeout=30))
    if "error" in result:
        return json.dumps(result)

    return json.dumps({
        "status": "ok" if result.get("status") == "ok" else "validation_issues",
        "operation": operation,
        "files_checked": len(files),
        "output": result.get("output", ""),
        "via": "cli",
    })


# ── Tool: xray_codex_check ──────────────────────────────────

def xray_codex_check(args: dict, **kwargs) -> str:
    """Check code against Xray codex rules.

    Uses bridge for real quality gate codex checks.
    Falls back to CLI if bridge unavailable.
    """
    code = args.get("code")
    operation = args.get("operation", "create")
    focus_areas = args.get("focus_areas", [])

    # Use 'is not None' to correctly handle empty string
    if code is not None:
        # Try bridge for real codex checking
        bridge_result = _bridge_call({
            "command": "codex-check",
            "code": code,
            "focusAreas": focus_areas,
        }, timeout=15)

        if "error" not in bridge_result:
            return json.dumps({
                "status": "passed" if bridge_result.get("passed") else "violations",
                "operation": operation,
                "focus_areas": focus_areas or "all",
                "code_length": len(code),
                "violations": bridge_result.get("violations", []),
                "checks": bridge_result.get("checks", []),
                "via": "bridge",
            })

        # Bridge unavailable — fall back to static analysis
        return json.dumps({
            "status": "checked",
            "operation": operation,
            "focus_areas": focus_areas or "all",
            "code_length": len(code),
            "note": "Bridge unavailable — basic analysis only. "
                   "Full codex validation available via MCP: mcp_xray_enforcer_codex_enforcement",
            "via": "static",
        })

    # No code provided — check framework health
    bridge_result = _bridge_call({"command": "health"}, timeout=10)
    if "error" not in bridge_result:
        return json.dumps({
            "status": "ok",
            "framework": bridge_result.get("framework"),
            "version": bridge_result.get("version"),
            "components": bridge_result.get("components"),
            "note": "Pass 'code' parameter for actual codex validation",
            "via": "bridge",
        })

    result = json.loads(_run_xray(["health"], timeout=15))
    if "error" in result:
        return json.dumps(result)

    return json.dumps({
        "status": "ok",
        "health_output": result.get("output", ""),
        "note": "Pass 'code' parameter for actual codex validation",
        "via": "cli",
    })


# ── Tool: xray_health ───────────────────────────────────────

def xray_health(args: dict, **kwargs) -> str:
    """Check Xray framework health via bridge.

    Returns framework status, loaded components, version.
    """
    bridge_result = _bridge_call({"command": "health"}, timeout=10)
    if "error" not in bridge_result:
        return json.dumps({
            "status": "ok",
            "framework": bridge_result.get("framework"),
            "version": bridge_result.get("version"),
            "project_root": bridge_result.get("projectRoot"),
            "components": bridge_result.get("components"),
            "node_version": bridge_result.get("nodeVersion"),
            "via": "bridge",
        })

    # Fallback to CLI
    return _run_xray(["health"], timeout=15)


# ── Tool: xray_hooks ───────────────────────────────────────

def xray_hooks(args: dict, **kwargs) -> str:
    """Manage Xray git hooks.

    Actions: install, uninstall, list, status
    Uses bridge for hook management when available.
    Falls back to direct file-based management when bridge unavailable.
    """
    action = args.get("action", "list")
    hooks = args.get("hooks", ["pre-commit", "post-commit", "pre-push", "post-push"])

    # Try bridge first
    bridge_result = _bridge_call({
        "command": "hooks",
        "action": action,
        "hooks": hooks,
    }, timeout=15)

    if "error" not in bridge_result:
        return json.dumps({
            "status": "ok",
            "action": action,
            "hooks": hooks,
            "result": bridge_result,
            "via": "bridge",
        })

    # Fallback: direct file-based hook management
    git_hooks_dir = Path(_get_project_root()) / ".git" / "hooks"
    xray_hooks_dir = Path(_get_project_root()) / "hooks"

    if not git_hooks_dir.exists():
        return json.dumps({"error": "Not a git repository", "via": "fallback"})

    if action in ("list", "status"):
        result = {"managed": [], "missing": [], "external": [], "stale": []}
        for hook_name in hooks:
            git_hook = git_hooks_dir / hook_name
            xray_hook = xray_hooks_dir / hook_name
            if not git_hook.exists():
                result["missing"].append(hook_name)
            else:
                try:
                    content = git_hook.read_text()[:500]
                    if "Xray" in content or "xray" in content or False or "run-hook.js" in content:
                        result["managed"].append(hook_name)
                    else:
                        result["external"].append(hook_name)
                except OSError:
                    result["external"].append(hook_name)
            if not xray_hook.exists():
                result["stale"].append(hook_name)
        return json.dumps({"status": "ok", "action": action, **result, "via": "fallback"})

    if action == "install":
        installed = []
        skipped = []
        for hook_name in hooks:
            src = xray_hooks_dir / hook_name
            dst = git_hooks_dir / hook_name
            if not src.exists():
                skipped.append(hook_name)
                continue
            try:
                if dst.exists():
                    try:
                        content = dst.read_text()[:500]
                        if "Xray" not in content and "xray" not in content:
                            dst.rename(dst.with_suffix(".xray-backup"))
                        else:
                            dst.unlink()
                    except OSError:
                        pass
                try:
                    rel = os.path.relpath(str(src), str(git_hooks_dir))
                    os.symlink(rel, dst)
                except OSError:
                    shutil.copy2(src, dst)
                installed.append(hook_name)
            except OSError:
                pass
        return json.dumps({"status": "ok", "action": "install", "installed": installed, "skipped": skipped, "via": "fallback"})

    if action == "uninstall":
        removed = []
        restored = []
        for hook_name in hooks:
            dst = git_hooks_dir / hook_name
            backup = dst.with_suffix(".xray-backup")
            if not dst.exists():
                continue
            try:
                content = dst.read_text()[:500]
                is_xray = "Xray" in content or "xray" in content or False or "run-hook.js" in content
                if is_xray or dst.is_symlink():
                    dst.unlink()
                    if backup.exists():
                        shutil.move(str(backup), str(dst))
                        restored.append(hook_name)
                    else:
                        removed.append(hook_name)
            except OSError:
                pass
        return json.dumps({"status": "ok", "action": "uninstall", "removed": removed, "restored": restored, "via": "fallback"})

    return json.dumps({"error": f"Unknown action: {action}", "via": "fallback"})


# ── Tool: xray_skill_install ─────────────────────────────────

def xray_skill_install(args: dict, **kwargs) -> str:
    """Install skills from registry or git repo via bridge."""
    source = args.get("source", "")

    if not source:
        return json.dumps({"error": "No source specified for skill install"})

    bridge_result = _bridge_call({
        "command": "skill-install",
        "source": source,
    }, timeout=120)

    if "error" not in bridge_result:
        return json.dumps({
            "status": "ok",
            "source": source,
            "output": bridge_result.get("output", ""),
            "via": "bridge",
        })

    # Fallback to CLI
    result = _run_xray(["skill:install", source], timeout=120)
    try:
        parsed = json.loads(result)
        if "error" in parsed:
            return json.dumps(parsed)
    except json.JSONDecodeError:
        pass
    return json.dumps({
        "status": "ok",
        "source": source,
        "output": result.strip(),
        "via": "cli",
    })


# ── Tool: xray_skill_registry ───────────────────────────────

def xray_skill_registry(args: dict, **kwargs) -> str:
    """Manage skill registry sources via bridge."""
    action = args.get("action", "list")
    name = args.get("name", "")
    url = args.get("url", "")

    bridge_args = {"command": "skill-registry", "action": action}
    if name:
        bridge_args["source"] = name
    if url:
        bridge_args["url"] = url

    bridge_result = _bridge_call(bridge_args, timeout=30)

    if "error" not in bridge_result:
        return json.dumps({
            "status": "ok",
            "action": action,
            "output": bridge_result.get("output", ""),
            "via": "bridge",
        })

    # Fallback to CLI
    cli_args = ["skill:registry", action]
    if name:
        cli_args.extend(["--name", name])
    if url:
        cli_args.extend(["--url", url])
    result = _run_xray(cli_args, timeout=30)
    return json.dumps({
        "status": "ok",
        "action": action,
        "output": result.strip(),
        "via": "cli",
    })
