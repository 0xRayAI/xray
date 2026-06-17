import * as fs from "fs";
import * as path from "path";
import { resolveCodexPath } from "./plugin-modules.js";
import { PluginLogger } from "./plugin-logger.js";

export interface CodexContextEntry {
  id: string;
  source: string;
  content: string;
  priority: "critical" | "high" | "normal" | "low";
  metadata: {
    version: string;
    termCount: number;
    loadedAt: string;
  };
}

let cachedCodexContexts: CodexContextEntry[] | null = null;

async function getCodexFileLocations(directory?: string): Promise<string[]> {
  const root = directory || process.cwd();
  const resolved = await resolveCodexPath(root);
  resolved.push(
    path.join(root, ".opencode", "codex.codex"),
    path.join(root, ".xray", "agents_template.md"),
    path.join(root, "AGENTS.md"),
  );
  return resolved;
}

function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    const logger = new PluginLogger(process.cwd());
    logger.error(`Failed to read file ${filePath}`, error);
    return null;
  }
}

export function extractCodexMetadata(content: string): { version: string; termCount: number } {
  if (content.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(content);
      const version = parsed.version || "1.6.0";
      const terms = parsed.terms || {};
      const termCount = Object.keys(terms).length;
      return { version, termCount };
    } catch {
      // Not valid JSON, try markdown format
    }
  }

  const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
  const version = versionMatch?.[1] ?? "1.6.0";

  const termMatches = content.match(/####\s*\d+\.\s/g);
  const termCount = termMatches ? termMatches.length : 0;

  return { version, termCount };
}

export function createCodexContextEntry(filePath: string, content: string): CodexContextEntry {
  const metadata = extractCodexMetadata(content);

  return {
    id: `xray-codex-${path.basename(filePath)}`,
    source: filePath,
    content,
    priority: "critical",
    metadata: {
      version: metadata.version,
      termCount: metadata.termCount,
      loadedAt: new Date().toISOString(),
    },
  };
}

export async function loadCodexContext(directory: string): Promise<CodexContextEntry[]> {
  if (cachedCodexContexts) {
    return cachedCodexContexts;
  }

  const codexContexts: CodexContextEntry[] = [];

  const locations = await getCodexFileLocations(directory);
  for (const fileLocation of locations) {
    const fullPath = path.isAbsolute(fileLocation) ? fileLocation : path.join(directory, fileLocation);
    const content = readFileContent(fullPath);

    if (content && content.trim().length > 0) {
      const entry = createCodexContextEntry(fullPath, content);
      if (entry.metadata.termCount > 0) {
        codexContexts.push(entry);
      }
    }
  }

  cachedCodexContexts = codexContexts;

  if (codexContexts.length === 0) {
    const { getOrCreateLogger } = await import("./plugin-logger.js");
    void getOrCreateLogger(directory).then((l) =>
      l.error(`No valid codex files found. Checked: ${locations.join(", ")}`),
    );
  }

  return codexContexts;
}

export function formatCodexContext(contexts: CodexContextEntry[]): string {
  if (contexts.length === 0) {
    return "";
  }

  const parts: string[] = [];

  for (const context of contexts) {
    parts.push(
      `# 0xRay Codex Context v${context.metadata.version}`,
      `Source: ${context.source}`,
      `Terms Loaded: ${context.metadata.termCount}`,
      `Loaded At: ${context.metadata.loadedAt}`,
      "",
      context.content,
      "",
      "---",
      "",
    );
  }

  return parts.join("\n");
}
