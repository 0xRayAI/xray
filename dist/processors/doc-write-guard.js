import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
const DOC_EXTENSIONS = [".md", ".mdx", ".txt"];
const DOC_DIRS = ["docs/", "docs/reflections/", "docs/reflections/deep/"];
export class DocWriteGuard {
    static async append(filePath, content) {
        if (!DocWriteGuard.isDocFile(filePath)) {
            throw new Error(`DocWriteGuard: ${filePath} is not a doc file`);
        }
        if (!fs.existsSync(filePath)) {
            throw new Error(`DocWriteGuard: ${filePath} does not exist — use createIfMissing() instead`);
        }
        fs.appendFileSync(filePath, content);
        frameworkLogger.log("doc-write-guard", "append", "info", {
            filePath,
            contentLength: content.length,
        });
    }
    static async createIfMissing(filePath, content) {
        if (!DocWriteGuard.isDocFile(filePath)) {
            throw new Error(`DocWriteGuard: ${filePath} is not a doc file`);
        }
        if (fs.existsSync(filePath)) {
            frameworkLogger.log("doc-write-guard", "create-skipped-exists", "info", { filePath });
            return;
        }
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, "utf-8");
        frameworkLogger.log("doc-write-guard", "create", "info", {
            filePath,
            contentLength: content.length,
        });
    }
    static isDocFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return DOC_EXTENSIONS.includes(ext);
    }
    static isDocPath(filePath) {
        const normalized = filePath.replace(/\\/g, "/");
        return DOC_DIRS.some((dir) => normalized.startsWith(dir));
    }
}
//# sourceMappingURL=doc-write-guard.js.map