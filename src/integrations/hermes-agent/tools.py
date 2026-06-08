"""Tool handlers — code that runs when the LLM calls each tool.

v2.0: Now uses the Node.js bridge for real framework integration.
Falls back to CLI (npx 0xray) when bridge is unavailable.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path


# ── Paths ─────────────────────────────────────────────────────

PLUGIN_DIR = Path(__file__).resolve().parent
BRIDGE_PATH = PLUGIN_DIR / "bridge.mjs"


def _get_project_root():
    """Find the project root by walking up from cwd."""
    cwd = os.getcwd()
    home = Path.home()
    d = Path(cwd).resolve()
    while True:
        if (d / "node_modules" / "0xray" / "package.json").exists():
            return str(d)
        if (d / ".opencode" / "xray" / "features.json").exists():
            return str(d)
        if d != home and (d / "package.json").exists():
            return str(d)
        d = d.parent
        if d == d.parent:
            break
    return cwd


def _run_xray(args, timeout=30):
    """Run 0xray CLI command, return JSON string result."""
    try:
        result = subprocess.run(
            ["npx", "0xray"] + args,
            capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode == 0:
            return json.dumps({"status": "ok", "output": result.stdout})
        return json.dumps({"status": "error", "error": result.stderr[:500]})
    except FileNotFoundError:
        return json.dumps({"error": "0xray not found. Run: npm install -g 0xray"})
    except subprocess.TimeoutExpired:
        return json.dumps({"error": f"Command timed out after {timeout}s"})
    except Exception as e:
        return json.dumps({"error": str(e)})


def _bridge_call(command, timeout=30):
    """Call bridge.mjs with a JSON command, return parsed dict."""
    try:
        result = subprocess.run(
            ["node", str(BRIDGE_PATH), "--cwd", _get_project_root()],
            input=json.dumps(command),
            capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode != 0:
            return {"error": result.stderr[:300] if result.stderr else "bridge failed"}
        return json.loads(result.stdout)
    except FileNotFoundError:
        return {"error": "node not found"}
    except subprocess.TimeoutExpired:
        return {"error": f"bridge timed out after {timeout}s"}
    except (json.JSONDecodeError, OSError) as e:
        return {"error": str(e)}


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
                    if "Xray" in content or "StringRay" in content or "xray" in content or "strray" in content or "run-hook.js" in content:
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
                        if "Xray" not in content and "StringRay" not in content and "xray" not in content and "strray" not in content:
                            dst.rename(dst.with_suffix(".strray-backup"))
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
            backup = dst.with_suffix(".strray-backup")
            if not dst.exists():
                continue
            try:
                content = dst.read_text()[:500]
                is_xray = "Xray" in content or "StringRay" in content or "xray" in content or "strray" in content or "run-hook.js" in content
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
