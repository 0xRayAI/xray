import * as fs from "fs";
import * as path from "path";

const START = "<!-- lessons -->";
const END = "<!-- /lessons -->";
const DEST = path.join(".xray", "state", "repertoire", "curated_signals.json");
const FLOOR = 0.55;

interface LessonLine {
  taskId: string;
  decision: string;
  text: string;
}

interface DestSignal {
  name?: string;
  definition?: string;
  lessons?: LessonLine[];
  observation_stats?: { avg_confidence?: number };
}

function aboveFloor(value: number | undefined): boolean {
  return typeof value === "number" && value > FLOOR && Math.abs(value - FLOOR) > 1e-4;
}

function lessonBlock(signals: DestSignal[]): string {
  const lines: string[] = ["## Lessons"];
  const graded = signals.filter((signal) =>
    typeof signal.name === "string"
    && aboveFloor(signal.observation_stats?.avg_confidence)
    && (signal.lessons?.length ?? 0) > 0
  );
  if (graded.length === 0) {
    lines.push("No graded lines above the floor.");
    return lines.join("\n");
  }
  for (const signal of graded) {
    lines.push(`### ${signal.name}`);
    if (typeof signal.definition === "string" && signal.definition.length > 0) {
      lines.push(signal.definition);
    }
    for (const lesson of signal.lessons ?? []) {
      const text = lesson.text.length > 0 ? lesson.text : "graded";
      lines.push(`- ${lesson.decision} \`${lesson.taskId}\` — ${text}`);
    }
  }
  return lines.join("\n");
}

/** Refresh the Station lessons section from dest. Leaves the rest of the card alone. */
export function writeLessonPickup(projectRoot: string): void {
  const stationPath = path.join(projectRoot, ".xray", "state", "STATION.md");
  if (!fs.existsSync(stationPath)) return;
  const destPath = path.join(projectRoot, DEST);
  let signals: DestSignal[] = [];
  if (fs.existsSync(destPath)) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(destPath, "utf-8"));
      if (parsed && typeof parsed === "object" && "signals" in parsed && Array.isArray(parsed.signals)) {
        signals = parsed.signals as DestSignal[];
      }
    } catch {
      signals = [];
    }
  }
  const section = `${START}\n${lessonBlock(signals)}\n${END}`;
  const current = fs.readFileSync(stationPath, "utf-8");
  const pattern = /<!-- lessons -->[\s\S]*?<!-- \/lessons -->/;
  const next = pattern.test(current)
    ? current.replace(pattern, section)
    : `${current.trimEnd()}\n\n${section}\n`;
  if (next !== current) fs.writeFileSync(stationPath, next);
}
