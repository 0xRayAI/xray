import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { StorytellingTriggerProcessor } from "../../processors/implementations/storytelling-trigger-processor.js";

interface CommitView {
  hash: string;
  message: string;
  fileNames: string[];
  filesChanged: number;
  insertions: number;
  deletions: number;
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf-8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  });
}

function commitFile(cwd: string, name: string, message: string): void {
  fs.writeFileSync(path.join(cwd, name), `${message}\n`);
  git(cwd, ["add", name]);
  git(cwd, ["commit", "-m", message]);
}

/** Full newest-first history for root..HEAD, then slice — the same window -n must match. */
function slicedHistory(cwd: string, limit: number): Array<{ hash: string; files: string[] }> {
  const root = git(cwd, ["rev-list", "--max-parents=0", "HEAD"]).trim().split("\n")[0] ?? "";
  const hashes = git(cwd, ["log", `${root}..HEAD`, "--format=%H", "--no-merges"])
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .slice(0, limit);
  return hashes.map((hash) => {
    const listed = git(cwd, ["diff", "--name-only", `${hash}~1`, hash]).trim();
    const files = listed.length > 0 ? listed.split("\n").filter((line) => line.length > 0) : [];
    return { hash, files };
  });
}

function recentCommits(count: number): CommitView[] {
  const processor = new StorytellingTriggerProcessor();
  return (processor as unknown as { getRecentCommits(n: number): CommitView[] }).getRecentCommits(count);
}

describe("storytelling-trigger getRecentCommits", () => {
  let tmpDir = "";
  let originalCwd = "";

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = "";
    originalCwd = "";
  });

  it("keeps the file from the commit that follows an empty commit", () => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-story-commits-"));
    git(tmpDir, ["init", "-q", "-b", "main"]);
    git(tmpDir, ["commit", "--allow-empty", "-m", "root"]);

    // Older than the empty commit, so git log prints: empty header, then this header.
    // No shortstat on the empty commit used to glue those headers and drop bin.dat.
    commitFile(tmpDir, "p1.txt", "p1");
    fs.writeFileSync(path.join(tmpDir, "a.txt"), "a\n");
    fs.writeFileSync(path.join(tmpDir, "bin.dat"), "b\n");
    git(tmpDir, ["add", "a.txt", "bin.dat"]);
    git(tmpDir, ["commit", "-m", "add-bin"]);
    git(tmpDir, ["commit", "--allow-empty", "-m", "empty"]);
    for (let i = 1; i <= 10; i++) commitFile(tmpDir, `n${i}.txt`, `n${i}`);

    process.chdir(tmpDir);

    const newest = recentCommits(12);
    const bin = newest.find((commit) => commit.message === "add-bin");
    const empty = newest.find((commit) => commit.message === "empty");
    expect(bin?.fileNames).toContain("bin.dat");
    expect(empty?.fileNames).toEqual([]);
    expect(empty?.filesChanged).toBe(0);

    const window = slicedHistory(tmpDir, 12);
    expect(newest.map((commit) => commit.hash)).toEqual(window.map((commit) => commit.hash.slice(0, 7)));
    expect(newest.map((commit) => commit.fileNames)).toEqual(window.map((commit) => commit.files));

    const pastEnd = recentCommits(100);
    const whole = slicedHistory(tmpDir, 100);
    expect(pastEnd.map((commit) => commit.hash)).toEqual(whole.map((commit) => commit.hash.slice(0, 7)));
    expect(pastEnd.map((commit) => commit.fileNames)).toEqual(whole.map((commit) => commit.files));
    expect(pastEnd.some((commit) => commit.fileNames.includes("bin.dat"))).toBe(true);
  });
});
