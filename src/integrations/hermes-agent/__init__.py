"""Xray Hermes Plugin — full framework pipeline integration.

Mirrors the OpenCode xray-codex-injection.ts behavior:
  1. Captures ALL tool calls and logs to disk
  2. Runs quality gates on code-producing tools
  3. Runs pre/post processors via Node.js bridge
  4. Persists activity to activity.log + plugin-tool-events.log
  5. Tracks session statistics

Bridge protocol: JSON over stdin/stdout to bridge.mjs (Node.js).
"""

import json
import logging
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from . import schemas, tools
except ImportError:
    # Standalone import (e.g., pytest discovery) — modules loaded separately
    import importlib
    import types
    _pkg_dir = Path(__file__).resolve().parent
    sys.path.insert(0, str(_pkg_dir))
    schemas = importlib.import_module("schemas")
    tools = importlib.import_module("tools")

logger = logging.getLogger("xray-hermes")

# ── Paths ─────────────────────────────────────────────────────

PLUGIN_DIR = Path(__file__).resolve().parent
BRIDGE_PATH = PLUGIN_DIR / "bridge.mjs"

# Project root: find the Xray project directory
# The plugin lives at ~/.hermes/plugins/ which is NOT inside any project tree,
# so walking up from PLUGIN_DIR will never find the project. Instead:
#   1. Check XRAY_PROJECT_ROOT env var (explicit override)
#   2. Walk up from cwd looking for node_modules/0xray (consumer install)

def _find_project_root():
    cwd = os.getcwd()
    home = Path.home()
    d = Path(cwd).resolve()
    while True:
        ...
        # node_modules/0xray — consumer install marker
        if (d / "node_modules" / "0xray" / "package.json").exists():
            return d
        # .opencode/xray — dev repo marker
        if (d / ".opencode" / "xray" / "features.json").exists():
            return d
        # package.json but not home dir
        if d != home and (d / "package.json").exists():
            return d
        d = d.parent
        if d == d.parent:
            break

    return cwd

PROJECT_ROOT = _find_project_root()
LOG_DIR = PROJECT_ROOT / "logs" / "framework"

# ── Constants ─────────────────────────────────────────────────

# Tools that produce/modify code — these get the full pipeline
_CODE_TOOLS = {"write_file", "patch", "execute_code", "write", "edit"}

# Map tool names to agent/skill for outcome tracking
_TOOL_AGENT_MAP = {
    "write_file":    ("code-reviewer", "write"),
    "patch":         ("code-reviewer", "patch"),
    "execute_code":  ("testing-lead",  "execution"),
    "write":         ("code-reviewer", "write"),
    "edit":          ("code-reviewer", "edit"),
    "terminal":      ("testing-lead",  "execution"),
    "search_files":  ("researcher",    "search"),
    "read_file":     ("researcher",    "read"),
    "browser_*":     ("researcher",    "browser"),
    "delegate_task": ("orchestrator",  "delegation"),
}

# Tools where Xray has a better alternative
# terminal: only nudge when the command looks lint/security/search related
_BETTER_WITH_XRAY = {
    "search_files": "Use mcp_xray_researcher_search_codebase for code pattern searches",
}

# Patterns that suggest the terminal command should use an MCP tool instead
_TERMINAL_NUDGE_PATTERNS = {
    "grep": "Use mcp_xray_researcher_search_codebase instead of grep",
    "rg ": "Use mcp_xray_researcher_search_codebase instead of ripgrep",
    "eslint": "Use mcp_xray_lint_lint instead of raw eslint",
    "npx eslint": "Use mcp_xray_lint_lint instead of raw eslint",
    "npm audit": "Use mcp_xray_security_scan_security_scan instead of npm audit",
    "yarn audit": "Use mcp_xray_security_scan_security_scan instead of yarn audit",
    "find ": "Use search_files(target='files') instead of find",
    "sed ": "Use patch tool instead of sed",
    "awk ": "Use patch tool instead of awk",
}

# ── Session stats ─────────────────────────────────────────────

_INFERENCE_TUNE_INTERVAL = 100
_last_tune_tool_call_count = 0

_session_stats = {
    "started_at": None,
    "session_id": None,
    "code_operations": 0,
    "total_tool_calls": 0,
    "xray_mcp_calls": 0,
    "native_tool_calls": 0,
    "quality_gate_runs": 0,
    "quality_gate_blocks": 0,
    "pre_processor_runs": 0,
    "post_processor_runs": 0,
    "bridge_calls": 0,
    "bridge_errors": 0,
    "subagent_dispatches": 0,
    "subagent_validations": 0,
    "subagent_blocks": 0,
}

# ── File logging ──────────────────────────────────────────────

def _ensure_log_dir():
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def _log_to_file(filename, message):
    """Append a timestamped line to a log file in logs/framework/."""
    try:
        _ensure_log_dir()
        log_path = LOG_DIR / filename
        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        entry = f"{timestamp} {message}\n"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(entry)
    except OSError:
        pass  # never break the agent over logging


def _log_tool_event(event_type, tool, args=None, duration=0, error=None):
    """Log tool events in the same format as the OpenCode plugin."""
    import random
    job_id = f"plugin-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{random.randint(100000, 999999)}"
    if event_type == "start":
        args_keys = list((args or {}).keys())
        msg = f"[{job_id}] [agent] tool-started - INFO | {{\"tool\":\"{tool}\",\"args\":{json.dumps(args_keys)}}}"
    else:
        level = "ERROR" if error else "SUCCESS"
        err_part = f",\"error\":\"{error}\"" if error else ""
        msg = f"[{job_id}] [agent] tool-complete - {level} | {{\"tool\":\"{tool}\",\"duration\":{duration}{err_part}}}"
    _log_to_file("plugin-tool-events.log", msg)


# ── Bridge calls ──────────────────────────────────────────────

def _call_bridge(command: dict, timeout: int = 10) -> dict:
    """Call bridge.mjs with a JSON command, return parsed response."""
    _session_stats["bridge_calls"] += 1
    try:
        result = subprocess.run(
            ["node", str(BRIDGE_PATH), "--cwd", str(PROJECT_ROOT)],
            input=json.dumps(command),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            _session_stats["bridge_errors"] += 1
            return {"error": result.stderr[:300] if result.stderr else "bridge failed"}
        return json.loads(result.stdout)
    except FileNotFoundError:
        _session_stats["bridge_errors"] += 1
        return {"error": "node not found"}
    except subprocess.TimeoutExpired:
        _session_stats["bridge_errors"] += 1
        return {"error": f"bridge timed out after {timeout}s"}
    except (json.JSONDecodeError, OSError) as e:
        _session_stats["bridge_errors"] += 1
        return {"error": str(e)}


# ── Hook: pre_tool_call ───────────────────────────────────────

def _is_xray_mcp(tool_name: str) -> bool:
    return tool_name.startswith("mcp_xray_")


def _on_pre_tool_call(tool_name: str, args: dict, task_id: str, **kwargs):
    """Fires before ANY tool executes.

    Pipeline:
      1. Track stats
      2. Log tool-start event to disk
      3. For code-producing tools: run quality gate + pre-processors via bridge
      4. For non-code tools: nudge if Xray alternative exists
    """
    _session_stats["total_tool_calls"] += 1

    # Log start event
    _log_tool_event("start", tool_name, args)

    # Xray MCP tools — track but don't interfere
    if _is_xray_mcp(tool_name):
        _session_stats["xray_mcp_calls"] += 1
        _log_to_file("activity.log", f"[quality-gate] SKIP (xray-mcp): {tool_name}")
        return

    # delegate_task: snapshot working tree so post_hook can validate changes
    if tool_name == "delegate_task":
        tid = kwargs.get("task_id", "") or args.get("task_id", "") or task_id
        if tid:
            _delegate_snapshots[tid] = _snapshot_working_tree()
        _session_stats["subagent_dispatches"] += 1
        _log_to_file("activity.log",
            f"[pre-tool] SUBAGENT DISPATCH: task_id={tid}")
        return

    _session_stats["native_tool_calls"] += 1

    # Code-producing tools get the full pipeline
    if tool_name in _CODE_TOOLS:
        _session_stats["code_operations"] += 1

        # Extract file path for logging
        file_path = None
        if isinstance(args, dict):
            file_path = args.get("path") or args.get("filePath")

        _log_to_file("activity.log",
            f"[pre-tool] CODE OPERATION: tool={tool_name} file={file_path}")

        # Run quality gate via bridge
        _session_stats["quality_gate_runs"] += 1
        bridge_result = _call_bridge({
            "command": "pre-process",
            "tool": tool_name,
            "args": args or {},
        }, timeout=15)

        if "error" not in bridge_result:
            quality = bridge_result.get("qualityGate", {})
            processors = bridge_result.get("processors", {})

            # Log quality gate results
            if quality.get("passed") is False:
                violations = quality.get("violations", [])
                _session_stats["quality_gate_blocks"] += 1
                violation_msg = "; ".join(violations)
                _log_to_file("activity.log",
                    f"[quality-gate] BLOCKED: tool={tool_name} violations={violation_msg}")
                logger.warning(
                    "[xray] Quality gate BLOCKED %s: %s",
                    tool_name, violation_msg,
                )
            else:
                _log_to_file("activity.log",
                    f"[quality-gate] PASSED: tool={tool_name}")

            # Log processor results
            if processors.get("ran"):
                _session_stats["pre_processor_runs"] += 1
                success = processors.get("success", True)
                count = processors.get("processorCount", 0)
                _log_to_file("activity.log",
                    f"[pre-processors] {'SUCCESS' if success else 'FAILED'}: "
                    f"{count} processors for {tool_name}")
                if processors.get("details"):
                    for detail in processors["details"]:
                        status = "OK" if detail.get("success") else f"FAILED: {detail.get('error')}"
                        _log_to_file("activity.log",
                            f"[pre-processor] {detail.get('name', 'unknown')}: {status}")
        else:
            _log_to_file("activity.log",
                f"[bridge] ERROR in pre-process: {bridge_result.get('error', 'unknown')}")
        return

    # Non-code tools: nudge for Xray alternatives
    if tool_name in _BETTER_WITH_XRAY:
        tip = _BETTER_WITH_XRAY[tool_name]
        logger.info("[xray] Tip: %s — %s", tool_name, tip)
        _log_to_file("activity.log",
            f"[nudge] {tool_name}: {tip}")

    # Terminal: smart nudge based on command content
    if tool_name == "terminal" and isinstance(args, dict):
        cmd = args.get("command", "")
        if isinstance(cmd, str):
            for pattern, tip in _TERMINAL_NUDGE_PATTERNS.items():
                if pattern in cmd:
                    logger.info(                    "[xray] Tip: %s — %s", tool_name, tip)
                    _log_to_file("activity.log",
                        f"[nudge] {tool_name}: {tip}")
                    break


# ── Hook: post_tool_call ──────────────────────────────────────

def _on_post_tool_call(tool_name: str, args: dict, result, task_id: str, **kwargs):
    """Fires after ANY tool returns.

    Pipeline:
      1. Log tool-complete event to disk
      2. Extract file info from write/patch operations
      3. For code-producing tools: run post-processors via bridge
      4. Track file modifications for session context
    """
    duration = 0

    # Extract file path — BUG FIX: only when path key exists with truthy value
    file_path = None
    if isinstance(args, dict) and tool_name in ("write_file", "patch"):
        file_path = args.get("path")
        if not file_path:
            # No path key or empty string — skip file logging
            pass

    # Extract duration from result if available
    if isinstance(result, dict):
        duration = result.get("duration", 0)

    # Log completion event
    error = None
    if isinstance(result, dict) and result.get("error"):
        error = result["error"]
    _log_tool_event("complete", tool_name, args, duration, error)

    # Record outcome for the inference feedback loop
    _record_tool_outcome(tool_name, args or {}, error is None)

    # delegate_task: validate all files the subagent changed
    if tool_name == "delegate_task":
        tid = kwargs.get("task_id", "") or args.get("task_id", "") or task_id
        if tid:
            _validate_subagent_changes(tid)
        return

    # Track file modifications
    if file_path:
        _log_to_file("activity.log",
            f"[post-tool] file-written: tool={tool_name} path={file_path}")

    # Code-producing tools get post-processors
    if tool_name in _CODE_TOOLS:
        # Run post-processors via bridge
        bridge_result = _call_bridge({
            "command": "post-process",
            "tool": tool_name,
            "args": args or {},
            "result": result,
            "error": error,
        }, timeout=15)

        if "error" not in bridge_result:
            processors = bridge_result.get("processors", {})
            if processors.get("ran"):
                _session_stats["post_processor_runs"] += 1
                success = processors.get("success", True)
                count = processors.get("processorCount", 0)
                _log_to_file("activity.log",
                    f"[post-processors] {'SUCCESS' if success else 'FAILED'}: "
                    f"{count} processors for {tool_name}")
                if processors.get("details"):
                    for detail in processors["details"]:
                        status = "OK" if detail.get("success") else f"FAILED: {detail.get('error')}"
                        _log_to_file("activity.log",
                            f"[post-processor] {detail.get('name', 'unknown')}: {status}")
        else:
            _log_to_file("activity.log",
                f"[bridge] ERROR in post-process: {bridge_result.get('error', 'unknown')}")

    # Auto inference tuning: every _INFERENCE_TUNE_INTERVAL tool calls,
    # shell out to the inference tuner to close the feedback loop.
    global _last_tune_tool_call_count
    calls = _session_stats["total_tool_calls"]
    if calls - _last_tune_tool_call_count >= _INFERENCE_TUNE_INTERVAL:
        _last_tune_tool_call_count = calls
        logger.info(
            "[xray] Triggering inference tuning cycle (tool call #%d)", calls
        )
        _log_to_file("activity.log",
            f"[inference-tune] auto-cycle at tool call #{calls}")
        try:
            _run_inference_tune()
        except Exception as e:
            logger.warning("[xray] Inference tuning failed: %s", e)


# ── Hook: session_start ───────────────────────────────────────

def _on_session_start(session_id: str, platform: str, **kwargs):
    """Fires when a new session starts. Resets stats, logs to disk."""
    _session_stats["started_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    _session_stats["session_id"] = session_id
    for key in ("code_operations", "total_tool_calls", "xray_mcp_calls",
                "native_tool_calls", "quality_gate_runs", "quality_gate_blocks",
                "pre_processor_runs", "post_processor_runs",
                "bridge_calls", "bridge_errors",
                "subagent_dispatches", "subagent_validations", "subagent_blocks"):
        _session_stats[key] = 0
    global _last_tune_tool_call_count
    _last_tune_tool_call_count = 0

    _ensure_log_dir()
    _log_to_file("activity.log",
        f"[session-start] session={session_id} platform={platform}")
    logger.info("[xray] Session %s started on %s", session_id, platform)


# ── Slash command ─────────────────────────────────────────────

def _xray_command(args: str) -> str:
    """Slash command handler: /xray [status|stats|help]"""
    cmd = (args or "status").strip().lower()

    if cmd == "stats":
        return (
            f"Xray Session Stats\n"
            f"  Session: {_session_stats['session_id'] or 'N/A'}\n"
            f"  Started: {_session_stats['started_at'] or 'N/A'}\n"
            f"  Tool calls: {_session_stats['total_tool_calls']}\n"
            f"  Code operations: {_session_stats['code_operations']}\n"
            f"  Xray MCP: {_session_stats['xray_mcp_calls']}\n"
            f"  Native tools: {_session_stats['native_tool_calls']}\n"
            f"  Quality gate runs: {_session_stats['quality_gate_runs']}\n"
            f"  Quality gate blocks: {_session_stats['quality_gate_blocks']}\n"
            f"  Pre-processor runs: {_session_stats['pre_processor_runs']}\n"
            f"  Post-processor runs: {_session_stats['post_processor_runs']}\n"
            f"  Bridge calls: {_session_stats['bridge_calls']}\n"
            f"  Bridge errors: {_session_stats['bridge_errors']}\n"
            f"  Subagent dispatches: {_session_stats['subagent_dispatches']}\n"
            f"  Subagent validations: {_session_stats['subagent_validations']}\n"
            f"  Subagent blocks: {_session_stats['subagent_blocks']}"
        )

    if cmd == "help":
        return (
            "Xray Commands:\n"
            "  /xray status — Plugin and framework health\n"
            "  /xray stats  — Session pipeline statistics\n"
            "  /xray help   — This message"
        )

    # Default: status (calls bridge health)
    bridge_result = _call_bridge({"command": "health"}, timeout=10)
    if "error" in bridge_result:
        return f"Xray plugin loaded. Bridge: {bridge_result['error']}"

    return (
        f"Xray Hermes Plugin Status\n"
        f"  Framework: {bridge_result.get('framework', 'unknown')}\n"
        f"  Version: {bridge_result.get('version', 'unknown')}\n"
        f"  Quality Gate: {'ready' if bridge_result.get('components', {}).get('qualityGate') else 'not loaded'}\n"
        f"  Processors: {'ready' if bridge_result.get('components', {}).get('processorManager') else 'not loaded'}\n"
        f"  Project: {bridge_result.get('projectRoot', 'unknown')}\n"
        f"  Bridge calls: {_session_stats['bridge_calls']} (errors: {_session_stats['bridge_errors']})"
    )


# ── Outcome tracking (feeds inference tuner) ──────────────────

_OUTCOMES_PATH = PROJECT_ROOT / "logs" / "framework" / "routing-outcomes.json"
_MAX_OUTCOMES = 1000


def _record_tool_outcome(tool_name: str, args: dict, success: bool):
    """Append a routing outcome to routing-outcomes.json.

    Writes directly to the JSON file (same format the TS outcome tracker uses)
    so both OpenCode and Hermes plugin outcomes are visible to the tuner.
    """
    call_num = _session_stats.get("total_tool_calls", 0)

    # Look up agent/skill mapping
    agent, skill = "direct", tool_name
    for pattern, mapped in _TOOL_AGENT_MAP.items():
        if pattern.endswith("*"):
            if tool_name.startswith(pattern[:-1]):
                agent, skill = mapped
                break
        elif tool_name == pattern:
            agent, skill = mapped
            break

    # Build description from args
    if isinstance(args, dict):
        content = args.get("content") or args.get("path") or args.get("filePath") or ""
        description = str(content)[:200] if content else f"tool call: {tool_name}"
    else:
        description = f"tool call: {tool_name}"

    outcome = {
        "taskId": f"hermes-{call_num}",
        "taskDescription": description,
        "routedAgent": agent,
        "routedSkill": skill,
        "confidence": 0.8 if agent != "direct" else 0.5,
        "success": success,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "routingMethod": "keyword" if agent != "direct" else "default",
    }

    try:
        _OUTCOMES_PATH.parent.mkdir(parents=True, exist_ok=True)
        if _OUTCOMES_PATH.exists():
            with open(_OUTCOMES_PATH, "r") as f:
                outcomes = json.load(f)
        else:
            outcomes = []

        outcomes.append(outcome)
        # Circular buffer — keep last N outcomes
        if len(outcomes) > _MAX_OUTCOMES:
            outcomes = outcomes[-_MAX_OUTCOMES:]

        with open(_OUTCOMES_PATH, "w") as f:
            json.dump(outcomes, f, indent=2)
    except Exception as e:
        logger.debug("[xray] outcome recording failed: %s", e)


# ── Inference tuning (auto-calibration) ────────────────────────

def _run_inference_tune():
    """Shell out to 0xray inference:tuner --run-once.

    Runs in a background thread so it doesn't block the tool call pipeline.
    The tuner reads routing outcomes, runs the analytics pipeline, and
    writes back refined keyword mappings to routing-mappings.json.
    """
    import threading

    def _tune():
        try:
            result = subprocess.run(
                ["npx", "0xray", "inference:tuner", "--run-once"],
                capture_output=True, text=True, timeout=30,
                cwd=os.getcwd(),
            )
            if result.returncode == 0:
                logger.info("[0xray] Inference tuning cycle completed")
                _log_to_file("activity.log",
                    "[inference-tune] cycle completed successfully")
            else:
                _log_to_file("activity.log",
                    f"[inference-tune] cycle failed (rc={result.returncode}): "
                    f"{result.stderr.strip()[:200]}")
        except subprocess.TimeoutExpired:
            _log_to_file("activity.log",
                "[inference-tune] cycle timed out after 30s")
        except Exception as e:
            _log_to_file("activity.log",
                f"[inference-tune] cycle error: {e}")

    threading.Thread(target=_tune, daemon=True).start()


# ── Registration ──────────────────────────────────────────────

# ── Subagent (delegate_task) enforcement ────────────────────
# Subagents bypass all Xray hooks because they run in isolated
# contexts. We enforce by snapshotting the working tree before dispatch
# and validating all changed files after return.

_delegate_snapshots: dict = {}  # task_id → set of (path, mtime)


def _snapshot_working_tree() -> dict:
    """Snapshot file mtimes under project root for subagent change detection."""
    try:
        result = subprocess.run(
            ["git", "-C", str(PROJECT_ROOT), "diff", "--name-only", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            changed = set(result.stdout.strip().split("\n")) if result.stdout.strip() else set()
        else:
            changed = set()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        changed = set()
    return {"changed_before": changed}


def _validate_subagent_changes(task_id: str, **kwargs):
    """After delegate_task returns, find what the subagent changed and validate."""
    snapshot = _delegate_snapshots.pop(task_id, None)
    if not snapshot:
        return

    before = snapshot.get("changed_before", set())

    try:
        result = subprocess.run(
            ["git", "-C", str(PROJECT_ROOT), "diff", "--name-only", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return
        after = set(result.stdout.strip().split("\n")) if result.stdout.strip() else set()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return

    new_changes = after - before
    if not new_changes:
        return

    # Filter to source files only (skip dist, node_modules, logs, etc.)
    source_files = sorted(f for f in new_changes if any(
        f.startswith(prefix) for prefix in ("src/", "dist/", "scripts/", ".opencode/plugins/")
    ) and not any(
        skip in f for skip in ("node_modules/", ".log", "__pycache__", ".map")
    ))

    if not source_files:
        return

    _session_stats["code_operations"] += len(source_files)
    _session_stats["subagent_validations"] += 1

    # Resolve to absolute paths for validation
    abs_files = [str(PROJECT_ROOT / f) for f in source_files]

    # Run validation on all changed files via bridge
    bridge_result = _call_bridge({
        "command": "validate",
        "files": abs_files,
        "operation": "modify",
    }, timeout=30)

    if "error" in bridge_result:
        _log_to_file("activity.log",
            f"[subagent-validate] BRIDGE ERROR: {bridge_result['error']}")
        return

    results = bridge_result.get("fileResults", bridge_result.get("results", {}))
    for rel_path in source_files:
        file_result = results.get(rel_path, results.get(str(PROJECT_ROOT / rel_path), {}))
        passed = file_result.get("passed", True)
        violations = file_result.get("violations", [])

        if not passed:
            _session_stats["quality_gate_blocks"] += 1
            _session_stats["subagent_blocks"] += 1
            _log_to_file("activity.log",
                f"[subagent-validate] BLOCKED: {rel_path} "
                f"violations={'; '.join(str(v) for v in violations[:3])}")
            logger.warning(
                "[xray] Subagent BLOCKED %s: %s",
                rel_path, violations[:3],
            )
        else:
            _log_to_file("activity.log",
                f"[subagent-validate] PASSED: {rel_path}")


def register(ctx):
    """Wire schemas to handlers and register lifecycle hooks."""
    # ── Register tools ────────────────────────────────────────
    ctx.register_tool(
        name="xray_validate",
        toolset="0xray-hermes",
        schema=schemas.XRAY_VALIDATE,
        handler=tools.xray_validate,
    )
    ctx.register_tool(
        name="xray_codex_check",
        toolset="0xray-hermes",
        schema=schemas.XRAY_CODEX_CHECK,
        handler=tools.xray_codex_check,
    )
    ctx.register_tool(
        name="xray_health",
        toolset="0xray-hermes",
        schema=schemas.XRAY_HEALTH,
        handler=tools.xray_health,
    )
    ctx.register_tool(
        name="xray_hooks",
        toolset="0xray-hermes",
        schema=schemas.XRAY_HOOKS,
        handler=tools.xray_hooks,
    )

    # ── Register hooks ────────────────────────────────────────
    ctx.register_hook("pre_tool_call", _on_pre_tool_call)
    ctx.register_hook("post_tool_call", _on_post_tool_call)

    # Try to register session hooks
    try:
        ctx.register_hook("on_session_start", _on_session_start)
    except (AttributeError, TypeError):
        logger.debug("[xray] on_session_start hook not yet available")

    # ── Register slash command ────────────────────────────────
    try:
        ctx.register_command(
            name="xray",
            handler=_xray_command,
            description="Xray status, stats, hooks, and enforcement info",
            args_hint="[status|stats|help]",
            aliases=("sr",),
        )
    except (AttributeError, TypeError):
        logger.debug("[xray] Slash command registration not yet available")

    # ── Bootstrap ─────────────────────────────────────────────
    _ensure_log_dir()
    _log_to_file("activity.log",
        f"[plugin-loaded] Xray Hermes Plugin v2.2 — "
        f"4 tools, 2 hooks, subagent enforcement, bridge={BRIDGE_PATH.exists()}")

    logger.info(
        "[xray] Plugin v2.2 loaded: 4 tools, 2 hooks, "
        "subagent enforcement active, bridge=%s",
        BRIDGE_PATH.exists(),
    )
