import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";

function bytesHash(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const JS_IMPORT_PATTERNS = [
  /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const JS_EXPORT_PATTERNS = [
  /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g,
  /export\s+{\s*([^}]+)\s*}/g,
  /export\s+default/g,
];

const PY_IMPORT_PATTERNS = [/from\s+([^\s]+)\s+import/g, /import\s+([^\s]+)/g];
const JAVA_IMPORT_PATTERN = /^import\s+([^;]+);/gm;
const JAVA_EXPORT_PATTERN = /(?:public\s+)?(?:class|interface|enum)\s+(\w+)/g;

const CONFIG_FILE_PATTERNS = [
  /package\.json$/,
  /tsconfig\.json$/,
  /webpack\.config\./,
  /\.eslintrc/,
  /\.prettierrc/,
  /Dockerfile/,
  /docker-compose\.yml/,
  /\.env/,
];

const IMPORT_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".py", ".java"];

const FRAMEWORK_NEEDLES: ReadonlyArray<readonly [string, string]> = [
  ["react", "React"],
  ["vue", "Vue.js"],
  ["angular", "Angular"],
  ["svelte", "Svelte"],
  ["express", "Express.js"],
  ["nestjs", "NestJS"],
  ["nextjs", "Next.js"],
  ["nuxt", "Nuxt.js"],
];

function countLines(content: string): number {
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) lines++;
  }
  return lines;
}

function resetAndCollect(pattern: RegExp, content: string, into: string[]): void {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (match[1]) into.push(match[1]);
  }
}

export interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  language: string;
  isSourceCode: boolean;
  linesOfCode: number;
  imports: string[];
  exports: string[];
  dependencies: string[];
  lastModified: Date;
  content?: string | undefined;
}

export interface ModuleInfo {
  name: string;
  path: string;
  files: FileInfo[];
  entryPoint?: string | undefined;
  dependencies: string[];
  dependents: string[];
  type: "source" | "config" | "docs" | "test" | "infrastructure";
}

export interface CodebaseStructure {
  rootPath: string;
  totalFiles: number;
  totalLinesOfCode: number;
  languages: Map<string, number>;
  modules: Map<string, ModuleInfo>;
  fileGraph: Map<string, FileInfo>;
  dependencyGraph: Map<string, Set<string>>;
  architecture: {
    framework: string[];
    patterns: string[];
    structure: "monolithic" | "modular" | "microservices";
    entryPoints: string[];
  };
}

export interface ContextMetrics {
  fileCount: number;
  linesOfCode: number;
  languages: string[];
  complexity: number;
  coupling: number;
  cohesion: number;
  testCoverage: number;
  architecturalPatterns: string[];
  qualityScore: number;
}

export interface CodebaseAnalysis {
  structure: CodebaseStructure;
  metrics: ContextMetrics;
  insights: string[];
  recommendations: string[];
  risks: string[];
  scannedAt: Date;
}

export interface MemoryConfig {
  maxFilesInMemory: number; // Maximum files to process simultaneously
  maxFileSizeBytes: number; // Maximum file size to load into memory (default: 1MB)
  enableStreaming: boolean; // Enable streaming for large files (default: true)
  batchSize: number; // Process files in batches (default: 20)
  enableCaching: boolean; // Cache analysis results (default: true)
  cacheTtlMs: number; // Cache TTL in milliseconds (default: 5 minutes)
  enableConcurrentProcessing?: boolean; // Enable concurrent file processing (default: true)
  concurrencyLimit?: number; // Maximum concurrent file operations (default: 10)
}

export interface CodebaseAnalysisCacheData {
  linesOfCode: number;
  imports: string[];
  exports: string[];
  content?: string;
  lastModified?: Date;
  size?: number;
  contentHash?: string;
  timestamp: number;
}

export class CodebaseContextAnalyzer {
  private projectRoot: string;
  private memoryConfig: MemoryConfig;
  private analysisCache = new Map<string, CodebaseAnalysisCacheData>();

  private ignorePatterns = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.next/,
    /\.nuxt/,
    /\.vuepress/,
    /\.cache/,
    /\.temp/,
    /coverage/,
    /\.nyc_output/,
    /logs/,
    /\.DS_Store/,
    /Thumbs\.db/,
  ];

  private supportedLanguages = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".php": "php",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".clj": "clojure",
    ".hs": "haskell",
    ".ml": "ocaml",
    ".fs": "fsharp",
    ".elm": "elm",
    ".dart": "dart",
    ".vue": "vue",
    ".svelte": "svelte",
    ".astro": "astro",
  };

  constructor(projectRoot?: string, memoryConfig?: Partial<MemoryConfig>) {
    this.projectRoot = projectRoot || process.cwd();

    // Default memory configuration for performance optimization
    this.memoryConfig = {
      maxFilesInMemory: 100, // Process max 100 files simultaneously
      maxFileSizeBytes: 1024 * 1024, // 1MB max file size to load
      enableStreaming: true, // Enable streaming for large files
      batchSize: 20, // Process 20 files per batch
      enableCaching: true, // Enable result caching
      cacheTtlMs: 5 * 60 * 1000, // 5 minute cache TTL
      enableConcurrentProcessing: true, // Enable concurrent processing
      concurrencyLimit: 10, // Max 10 concurrent file operations
      ...memoryConfig, // Override with user config
    };
  }

  /**
   * Perform comprehensive codebase analysis with memory optimization
   */
  async analyzeCodebase(): Promise<CodebaseAnalysis> {
    const jobId = `codebase-analysis-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    await frameworkLogger.log(
      "codebase-context-analyzer",
      "analysis-start",
      "info",
      {
        jobId,
        message: "Starting comprehensive codebase analysis",
        memoryConfig: this.memoryConfig,
      },
    );

    const startTime = Date.now();
    const initialMemoryUsage = process.memoryUsage().heapUsed;

    try {
      const structure = await this.buildCodebaseStructure(jobId);
      const metrics = this.calculateContextMetrics(structure);
      const insights = this.generateInsights(structure, metrics);
      const recommendations = this.generateRecommendations(structure, metrics);
      const risks = this.identifyRisks(structure, metrics);

      const analysis: CodebaseAnalysis = {
        structure,
        metrics,
        insights,
        recommendations,
        risks,
        scannedAt: new Date(),
      };

      const endTime = Date.now();
      const finalMemoryUsage = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemoryUsage - initialMemoryUsage;

      await frameworkLogger.log(
        "codebase-context-analyzer",
        "analysis-complete",
        "success",
        {
          jobId,
          files: structure.totalFiles,
          loc: structure.totalLinesOfCode,
          languages: Array.from(structure.languages.keys()),
          qualityScore: metrics.qualityScore,
          duration: endTime - startTime,
          memoryDeltaMB: Math.round((memoryDelta / 1024 / 1024) * 100) / 100,
          cacheHits: this.analysisCache.size,
        },
      );

      return analysis;
    } catch (error) {
      const endTime = Date.now();
      const finalMemoryUsage = process.memoryUsage().heapUsed;

      await frameworkLogger.log(
        "codebase-context-analyzer",
        "analysis-failed",
        "error",
        {
          jobId,
          error: error instanceof Error ? error.message : String(error),
          duration: endTime - startTime,
          finalMemoryMB:
            Math.round((finalMemoryUsage / 1024 / 1024) * 100) / 100,
        },
      );

      throw error;
    }
  }

  /**
   * Get cached analysis result with intelligent invalidation
   */
  private getCachedAnalysis(cacheKey: string): CodebaseAnalysisCacheData | null {
    if (!this.memoryConfig.enableCaching) return null;

    const cached = this.analysisCache.get(cacheKey);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.memoryConfig.cacheTtlMs) {
      this.analysisCache.delete(cacheKey);
      return null;
    }

    // Intelligent cache validation - check if file still exists and hasn't changed
    const filePath = this.extractFilePathFromCacheKey(cacheKey);
    if (filePath) {
      try {
        const currentStats = fs.statSync(filePath);
        const cachedMtime = cached.lastModified?.getTime();
        const sameMeta =
          cachedMtime !== undefined &&
          currentStats.mtime.getTime() === cachedMtime &&
          cached.size !== undefined &&
          currentStats.size === cached.size;

        if (!sameMeta) {
          this.analysisCache.delete(cacheKey);
          return null;
        }

        // mtime and size collided. Identity includes the bytes.
        const hash = bytesHash(fs.readFileSync(filePath, "utf8"));
        if (cached.contentHash !== hash) {
          this.analysisCache.delete(cacheKey);
          return null;
        }
      } catch (error) {
        // File no longer exists or inaccessible, remove from cache
        this.analysisCache.delete(cacheKey);
        return null;
      }
    }

    return cached;
  }

  /**
   * Set cached analysis result with size limits
   */
  private setCachedAnalysis(cacheKey: string, data: CodebaseAnalysisCacheData): void {
    if (!this.memoryConfig.enableCaching) return;

    // Prevent cache from growing too large (keep last 1000 entries)
    if (this.analysisCache.size >= 1000) {
      const oldestKey = Array.from(this.analysisCache.keys())[0];
      if (oldestKey) {
        this.analysisCache.delete(oldestKey);
      }
    }

    this.analysisCache.set(cacheKey, {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Extract file path from cache key for validation
   */
  private extractFilePathFromCacheKey(cacheKey: string): string | null {
    if (!cacheKey.startsWith("file:")) return null;
    const rest = cacheKey.slice("file:".length);
    const colon = rest.lastIndexOf(":");
    if (colon <= 0) return null;
    const mtime = rest.slice(colon + 1);
    if (!/^\d+$/.test(mtime)) return null;
    return rest.slice(0, colon);
  }

  /**
   * Stream file content for large files to reduce memory usage
   */
  private async streamFileContent(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      let size = 0;
      const stream = fs.createReadStream(filePath, { encoding: "utf8" });

      stream.on("data", (chunk) => {
        const text = typeof chunk === "string" ? chunk : String(chunk);
        size += text.length;
        // Prevent excessive memory usage during streaming
        if (size > this.memoryConfig.maxFileSizeBytes) {
          stream.destroy();
          reject(new Error("File too large for streaming"));
          return;
        }
        chunks.push(text);
      });

      stream.on("end", () => resolve(chunks.join("")));
      stream.on("error", reject);
    });
  }

  /**
   * Build complete codebase structure map with batching for memory efficiency
   */
  private async buildCodebaseStructure(
    jobId: string,
  ): Promise<CodebaseStructure> {
    const fileGraph = new Map<string, FileInfo>();
    const modules = new Map<string, ModuleInfo>();
    const dependencyGraph = new Map<string, Set<string>>();
    const languages = new Map<string, number>();

    const scanDirectory = async (
      dirPath: string,
      relativePath: string = "",
      checkModule = false,
    ): Promise<void> => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // Names decide module vs tree. Do not walk this snapshot.
        if (checkModule && this.isModuleNames(entries.map((entry) => entry.name))) {
          const moduleInfo = await this.analyzeModule(
            dirPath,
            relativePath,
            jobId,
          );
          modules.set(relativePath, moduleInfo);
          return;
        }

        // Process files in batches to control memory usage
        const fileEntries: Array<{ path: string; relativePath: string }> = [];
        const dirEntries: Array<{
          path: string;
          relativePath: string;
        }> = [];

        // Separate files and directories for batch processing
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry.name);
          const entryRelativePath = path.join(relativePath, entry.name);

          // Skip ignored patterns
          if (this.ignorePatterns.some((pattern) => pattern.test(entryPath))) {
            continue;
          }

          if (entry.isDirectory()) {
            dirEntries.push({
              path: entryPath,
              relativePath: entryRelativePath,
            });
          } else if (entry.isFile()) {
            fileEntries.push({
              path: entryPath,
              relativePath: entryRelativePath,
            });
          }
        }

        // Process directories first (may contain modules)
        for (const dirEntry of dirEntries) {
          await scanDirectory(dirEntry.path, dirEntry.relativePath, true);
        }

        // Process files with concurrent processing for better performance
        const concurrencyLimit = this.memoryConfig.enableConcurrentProcessing
          ? Math.min(
              this.memoryConfig.concurrencyLimit || 10,
              this.memoryConfig.maxFilesInMemory,
            )
          : 1; // Sequential processing if concurrent disabled

        for (let i = 0; i < fileEntries.length; i += concurrencyLimit) {
          const batch = fileEntries.slice(i, i + concurrencyLimit);

          // Process batch concurrently with controlled parallelism
          const batchPromises = batch.map(
            async ({ path: filePath, relativePath: fileRelativePath }) => {
              try {
                const fileInfo = await this.analyzeFile(
                  filePath,
                  fileRelativePath,
                  jobId,
                );
                if (fileInfo) {
                  fileGraph.set(fileRelativePath, fileInfo);

                  // Update language counts
                  const lang = fileInfo.language;
                  languages.set(lang, (languages.get(lang) || 0) + 1);
                }
              } catch (error) {
                await frameworkLogger.log(
                  "codebase-context-analyzer",
                  "batch-file-processing-error",
                  "info",
                  {
                    jobId,
                    filePath,
                    error:
                      error instanceof Error ? error.message : String(error),
                  },
                );
              }
            },
          );

          await Promise.all(batchPromises);

          // Yield control periodically to prevent blocking the event loop
          if (i + concurrencyLimit < fileEntries.length) {
            await new Promise((resolve) => setImmediate(resolve));
          }
        }
      } catch (error) {
        await frameworkLogger.log(
          "codebase-context-analyzer",
          "scan-directory-failed",
          "error",
          {
            jobId,
            dirPath,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    };

    await scanDirectory(this.projectRoot);

    // Build dependency relationships
    await this.buildDependencyGraph(fileGraph, dependencyGraph);

    const architecture = this.detectArchitecture(fileGraph, modules);

    return {
      rootPath: this.projectRoot,
      totalFiles: fileGraph.size,
      totalLinesOfCode: Array.from(fileGraph.values()).reduce(
        (sum, file) => sum + file.linesOfCode,
        0,
      ),
      languages,
      modules,
      fileGraph,
      dependencyGraph,
      architecture,
    };
  }

  /**
   * Analyze individual file for structure and dependencies with memory optimization
   */
  private async analyzeFile(
    filePath: string,
    relativePath: string,
    jobId: string,
  ): Promise<FileInfo | null> {
    try {
      const stats = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const language =
        this.supportedLanguages[
          extension as keyof typeof this.supportedLanguages
        ] || "other";
      const isSourceCode = language !== "other";

      if (!isSourceCode && !this.isConfigFile(relativePath)) {
        return null;
      }

      // Memory optimization: Check file size before loading
      if (stats.size > this.memoryConfig.maxFileSizeBytes) {
        await frameworkLogger.log(
          "codebase-context-analyzer",
          "large-file-skipped",
          "info",
          {
            jobId,
            filePath,
            size: stats.size,
            maxSize: this.memoryConfig.maxFileSizeBytes,
          },
        );

        // For large files, analyze metadata only (no content loading)
        return {
          path: filePath,
          relativePath,
          size: stats.size,
          extension,
          language,
          isSourceCode,
          linesOfCode: Math.floor(stats.size / 50), // Rough estimate
          imports: [],
          exports: [],
          dependencies: [],
          lastModified: stats.mtime,
        };
      }

      // Lazy load content only when needed and within memory limits
      let content: string | undefined;
      let linesOfCode = 0;
      let imports: string[] = [];
      let exports: string[] = [];

      try {
        // Same path and mtime still miss when size or bytes change.
        const cacheKey = `file:${filePath}:${stats.mtime.getTime()}`;
        const cached = this.getCachedAnalysis(cacheKey);
        if (cached) {
          return {
            path: filePath,
            relativePath,
            size: stats.size,
            extension,
            language,
            isSourceCode,
            linesOfCode: cached.linesOfCode,
            imports: cached.imports,
            exports: cached.exports,
            dependencies: cached.imports,
            lastModified: stats.mtime,
            content: cached.content ?? undefined,
          };
        }

        // Load content with streaming for large files if enabled
        content =
          this.memoryConfig.enableStreaming && stats.size > 100 * 1024
            ? await this.streamFileContent(filePath)
            : fs.readFileSync(filePath, "utf8");

        linesOfCode = countLines(content);
        const importExportData = await this.extractImportsExports(
          content,
          language,
          jobId,
        );
        imports = importExportData.imports;
        exports = importExportData.exports;

        // Cache the analysis result
        if (this.memoryConfig.enableCaching) {
          this.setCachedAnalysis(cacheKey, {
            linesOfCode,
            imports,
            exports,
            content,
            lastModified: stats.mtime,
            size: stats.size,
            contentHash: bytesHash(content),
            timestamp: Date.now(),
          });
        }
      } catch (contentError) {
        await frameworkLogger.log(
          "codebase-context-analyzer",
          "content-loading-failed",
          "info",
          {
            jobId,
            filePath,
            error:
              contentError instanceof Error
                ? contentError.message
                : String(contentError),
          },
        );
        // Continue with metadata-only analysis
      }

      const result: FileInfo = {
        path: filePath,
        relativePath,
        size: stats.size,
        extension,
        language,
        isSourceCode,
        linesOfCode,
        imports,
        exports,
        dependencies: imports, // For now, imports are dependencies
        lastModified: stats.mtime,
      };

      // Only set content if it was successfully loaded
      if (content !== undefined) {
        result.content = content;
      }

      return result;
    } catch (error) {
      await frameworkLogger.log(
        "codebase-context-analyzer",
        "file-analysis-failed",
        "error",
        {
          jobId,
          filePath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }

  /**
   * Analyze module directory structure
   */
  private async analyzeModule(
    dirPath: string,
    relativePath: string,
    jobId: string,
  ): Promise<ModuleInfo> {
    const files: FileInfo[] = [];
    const dependencies = new Set<string>();
    const dependents = new Set<string>();

    const scanModuleFiles = async (
      modulePath: string,
      moduleRelativePath: string,
    ): Promise<void> => {
      try {
        // List at the walk so a file created after classification is included.
        const entries = fs.readdirSync(modulePath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = path.join(modulePath, entry.name);
          const entryRelativePath = path.join(moduleRelativePath, entry.name);

          if (entry.isFile()) {
            const fileInfo = await this.analyzeFile(
              entryPath,
              entryRelativePath,
              jobId,
            );
            if (fileInfo) {
              files.push(fileInfo);
              fileInfo.imports.forEach((dep) => dependencies.add(dep));
              fileInfo.exports.forEach((exp) => dependents.add(exp));
            }
          } else if (
            entry.isDirectory() &&
            !this.ignorePatterns.some((pattern) => pattern.test(entry.name))
          ) {
            await scanModuleFiles(entryPath, entryRelativePath);
          }
        }
      } catch (error) {
        await frameworkLogger.log(
          "codebase-context-analyzer",
          "module-scan-failed",
          "error",
          {
            jobId,
            modulePath,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    };

    await scanModuleFiles(dirPath, relativePath);

    // Determine module type
    const moduleType = this.classifyModule(relativePath, files);

    // Find entry point
    const entryPoint = this.findEntryPoint(files);

    return {
      name: path.basename(relativePath),
      path: dirPath,
      files,
      entryPoint,
      dependencies: Array.from(dependencies),
      dependents: Array.from(dependents),
      type: moduleType,
    };
  }

  /**
   * Extract imports and exports from source code
   */
  private async extractImportsExports(
    content: string,
    language: string,
    jobId: string,
  ): Promise<{ imports: string[]; exports: string[] }> {
    const imports: string[] = [];
    const exports: string[] = [];

    try {
      switch (language) {
        case "typescript":
        case "javascript":
          return this.extractJsTsImportsExports(content);
        case "python":
          return this.extractPythonImportsExports(content);
        case "java":
          return this.extractJavaImportsExports(content);
        default:
          return { imports: [], exports: [] };
      }
    } catch (error) {
      await frameworkLogger.log(
        "codebase-context-analyzer",
        "import-export-extraction-failed",
        "error",
        {
          jobId,
          language,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return { imports: [], exports: [] };
    }
  }

  private extractJsTsImportsExports(content: string): {
    imports: string[];
    exports: string[];
  } {
    const imports: string[] = [];
    const exports: string[] = [];

    for (const pattern of JS_IMPORT_PATTERNS) {
      resetAndCollect(pattern, content, imports);
    }

    // Export patterns
    const exportPatterns = JS_EXPORT_PATTERNS;

    exportPatterns.forEach((pattern) => {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const exportsList = match[1]
            .split(",")
            .map((e) => {
              const trimmed = e.trim();
              const asSplit = trimmed.split(" as ");
              return asSplit[0] || trimmed;
            })
            .filter(Boolean);
          exports.push(...exportsList);
        } else {
          exports.push("default");
        }
      }
    });

    return {
      imports: Array.from(new Set(imports)),
      exports: Array.from(new Set(exports)),
    };
  }

  private extractPythonImportsExports(content: string): {
    imports: string[];
    exports: string[];
  } {
    const imports: string[] = [];
    const exports: string[] = [];

    for (const pattern of PY_IMPORT_PATTERNS) {
      resetAndCollect(pattern, content, imports);
    }

    // Export patterns (Python doesn't have explicit exports, but __all__ can indicate public API)
    const allMatch = content.match(/__all__\s*=\s*\[([^\]]+)\]/);
    if (allMatch && allMatch[1]) {
      const exportsList = allMatch[1]
        .split(",")
        .map((e) => e.trim().replace(/['"]/g, ""))
        .filter(Boolean);
      exports.push(...exportsList);
    }

    return {
      imports: Array.from(new Set(imports)),
      exports: Array.from(new Set(exports)),
    };
  }

  private extractJavaImportsExports(content: string): {
    imports: string[];
    exports: string[];
  } {
    const imports: string[] = [];
    const exports: string[] = [];

    resetAndCollect(JAVA_IMPORT_PATTERN, content, imports);
    resetAndCollect(JAVA_EXPORT_PATTERN, content, exports);

    return {
      imports: Array.from(new Set(imports)),
      exports: Array.from(new Set(exports)),
    };
  }

  /**
   * Build dependency graph between files
   */
  private async buildDependencyGraph(
    fileGraph: Map<string, FileInfo>,
    dependencyGraph: Map<string, Set<string>>,
  ): Promise<void> {
    const existsCache = new Map<string, boolean>();
    const fileExists = (absPath: string): boolean => {
      const cached = existsCache.get(absPath);
      if (cached !== undefined) return cached;
      const found = fs.existsSync(absPath);
      existsCache.set(absPath, found);
      return found;
    };

    for (const [filePath, fileInfo] of fileGraph) {
      const dependencies = new Set<string>();

      for (const importPath of fileInfo.imports) {
        // Resolve relative imports
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          try {
            const resolvedPath = path.resolve(
              path.dirname(fileInfo.path),
              importPath,
            );
            const resolvedRelative = path.relative(
              this.projectRoot,
              resolvedPath,
            );

            let foundFile = null;

            for (const ext of IMPORT_EXTENSIONS) {
              const testPath = resolvedRelative + ext;
              if (
                fileGraph.has(testPath) ||
                fileExists(path.join(this.projectRoot, testPath))
              ) {
                foundFile = testPath;
                break;
              }
            }

            if (foundFile) {
              dependencies.add(foundFile);
            }
          } catch (error) {
            // Import resolution failed, skip
          }
        } else {
          // External dependency, add to graph for tracking
          dependencies.add(importPath);
        }
      }

      dependencyGraph.set(filePath, dependencies);
    }
  }

  /**
   * Detect architectural patterns and framework usage
   */
  private detectArchitecture(
    fileGraph: Map<string, FileInfo>,
    modules: Map<string, ModuleInfo>,
  ): CodebaseStructure["architecture"] {
    const frameworks: string[] = [];
    const patterns: string[] = [];
    let structure: CodebaseStructure["architecture"]["structure"] =
      "monolithic";
    const entryPoints: string[] = [];

    const foundFrameworks = new Set<string>();
    let hasControllers = false;
    let hasModels = false;
    let hasViews = false;
    let hasRepository = false;
    let hasFactory = false;
    let hasObserver = false;
    let hasMicroservices = false;

    // One pass over paths and file text. Same booleans as the per-needle scans.
    for (const [filePath, fileInfo] of fileGraph) {
      if (!hasControllers && filePath.includes("controller")) hasControllers = true;
      if (!hasModels && filePath.includes("model")) hasModels = true;
      if (!hasViews && filePath.includes("view")) hasViews = true;
      if (!hasRepository && filePath.includes("repository")) hasRepository = true;
      if (!hasFactory && filePath.includes("factory")) hasFactory = true;
      if (
        !hasMicroservices &&
        (filePath.includes("docker") ||
          filePath.includes("kubernetes") ||
          filePath.includes("service"))
      ) {
        hasMicroservices = true;
      }

      const content = fileInfo.content;
      if (!content) continue;
      if (!hasObserver && (content.includes("subscribe") || content.includes("observe"))) {
        hasObserver = true;
      }
      if (foundFrameworks.size === FRAMEWORK_NEEDLES.length) continue;
      const lower = content.toLowerCase();
      for (const [needle, label] of FRAMEWORK_NEEDLES) {
        if (!foundFrameworks.has(label) && lower.includes(needle)) {
          foundFrameworks.add(label);
        }
      }
    }

    for (const [, label] of FRAMEWORK_NEEDLES) {
      if (foundFrameworks.has(label)) frameworks.push(label);
    }
    if (hasControllers && hasModels && hasViews) patterns.push("MVC");
    if (hasRepository) patterns.push("Repository");
    if (hasObserver) patterns.push("Observer");
    if (hasFactory) patterns.push("Factory");

    // Structure detection
    if (modules.size > 5 && hasMicroservices) {
      structure = "microservices";
    } else if (modules.size > 0) {
      structure = "modular";
    }

    // Entry points detection
    for (const [filePath, fileInfo] of Array.from(fileGraph)) {
      if (this.isEntryPoint(filePath, fileInfo)) {
        entryPoints.push(filePath);
      }
    }

    return {
      framework: frameworks,
      patterns,
      structure,
      entryPoints,
    };
  }

  /**
   * Calculate comprehensive context metrics
   */
  private calculateContextMetrics(
    structure: CodebaseStructure,
  ): ContextMetrics {
    const fileCount = structure.totalFiles;
    const linesOfCode = structure.totalLinesOfCode;
    const languages = Array.from(structure.languages.keys());

    // Calculate complexity based on various factors
    const complexity = this.calculateComplexityScore(structure);

    // Calculate coupling (interdependencies)
    const coupling = this.calculateCouplingScore(structure);

    // Calculate cohesion (internal dependencies within modules)
    const cohesion = this.calculateCohesionScore(structure);

    // Estimate test coverage (rough heuristic)
    const testCoverage = this.estimateTestCoverage(structure);

    // Architectural patterns
    const architecturalPatterns = structure.architecture.patterns;

    // Overall quality score
    const qualityScore = this.calculateQualityScore({
      fileCount,
      linesOfCode,
      complexity,
      coupling,
      cohesion,
      testCoverage,
      patterns: architecturalPatterns.length,
    });

    return {
      fileCount,
      linesOfCode,
      languages,
      complexity,
      coupling,
      cohesion,
      testCoverage,
      architecturalPatterns,
      qualityScore,
    };
  }

  private calculateComplexityScore(structure: CodebaseStructure): number {
    let score = 0;

    // File count factor
    score += Math.min(structure.totalFiles / 10, 20);

    // Language diversity factor
    score += Math.min(structure.languages.size * 5, 15);

    // Module complexity
    score += Math.min(structure.modules.size * 2, 20);

    // Dependency complexity
    const totalDeps = Array.from(structure.dependencyGraph.values()).reduce(
      (sum, deps) => sum + deps.size,
      0,
    );
    score += Math.min(totalDeps / 20, 25);

    // Framework complexity
    score += Math.min(structure.architecture.framework.length * 10, 20);

    return Math.min(Math.max(score, 0), 100);
  }

  private calculateCouplingScore(structure: CodebaseStructure): number {
    const totalDeps = Array.from(structure.dependencyGraph.values()).reduce(
      (sum, deps) => sum + deps.size,
      0,
    );
    const avgDeps = totalDeps / structure.totalFiles;

    // Normalize to 0-100 scale (higher coupling = higher score)
    return Math.min(avgDeps * 20, 100);
  }

  private calculateCohesionScore(structure: CodebaseStructure): number {
    let totalCohesion = 0;
    let moduleCount = 0;

    for (const module of Array.from(structure.modules.values())) {
      if (module.files.length > 1) {
        // Calculate internal dependencies within module
        const internalDeps = module.files.reduce((sum, file) => {
          const fileDeps =
            structure.dependencyGraph.get(file.relativePath) || new Set();
          const internalCount = Array.from(fileDeps).filter((dep) =>
            module.files.some((f) => f.relativePath === dep),
          ).length;
          return sum + internalCount;
        }, 0);

        const cohesion =
          internalDeps / (module.files.length * (module.files.length - 1));
        totalCohesion += Math.min(cohesion, 1);
        moduleCount++;
      }
    }

    return moduleCount > 0 ? (totalCohesion / moduleCount) * 100 : 50;
  }

  private estimateTestCoverage(structure: CodebaseStructure): number {
    const testFiles = Array.from(structure.fileGraph.values()).filter(
      (file) =>
        file.relativePath.includes("test") ||
        file.relativePath.includes("spec"),
    ).length;

    const srcFiles = Array.from(structure.fileGraph.values()).filter(
      (file) =>
        file.isSourceCode &&
        !file.relativePath.includes("test") &&
        !file.relativePath.includes("spec"),
    ).length;

    if (srcFiles === 0) return 0;

    // Rough heuristic: assume 1 test file covers 3-5 source files
    const estimatedCoverage = Math.min(((testFiles * 4) / srcFiles) * 100, 100);

    return Math.round(estimatedCoverage);
  }

  private calculateQualityScore(metrics: {
    fileCount: number;
    linesOfCode: number;
    complexity: number;
    coupling: number;
    cohesion: number;
    testCoverage: number;
    patterns: number;
  }): number {
    // Weighted scoring system
    const weights = {
      complexity: -0.2, // Lower complexity is better
      coupling: -0.25, // Lower coupling is better
      cohesion: 0.2, // Higher cohesion is better
      testCoverage: 0.25, // Higher coverage is better
      patterns: 0.1, // More patterns is better
    };

    let score = 50; // Base score

    score += weights.complexity * Math.min(metrics.complexity, 50);
    score += weights.coupling * (100 - metrics.coupling);
    score += weights.cohesion * metrics.cohesion;
    score += weights.testCoverage * metrics.testCoverage;
    score += weights.patterns * Math.min(metrics.patterns * 10, 20);

    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  /**
   * Generate insights based on analysis
   */
  private generateInsights(
    structure: CodebaseStructure,
    metrics: ContextMetrics,
  ): string[] {
    const insights: string[] = [];

    // Size insights
    if (structure.totalFiles > 1000) {
      insights.push(
        `Large codebase with ${structure.totalFiles} files - consider modularization`,
      );
    } else if (structure.totalFiles < 10) {
      insights.push("Small codebase - good candidate for rapid development");
    }

    // Language insights
    if (structure.languages.size > 3) {
      insights.push(
        `Polyglot codebase with ${structure.languages.size} languages`,
      );
    } else if (structure.languages.size === 1) {
      insights.push(
        "Single-language codebase - easier maintenance but potential skill limitations",
      );
    }

    // Architecture insights
    if (structure.architecture.framework.length > 0) {
      insights.push(
        `Uses ${structure.architecture.framework.join(", ")} framework(s)`,
      );
    }

    if (structure.architecture.patterns.length > 0) {
      insights.push(
        `Follows ${structure.architecture.patterns.join(", ")} architectural pattern(s)`,
      );
    }

    // Quality insights
    if (metrics.qualityScore > 80) {
      insights.push(
        "High-quality codebase with strong architectural foundations",
      );
    } else if (metrics.qualityScore < 40) {
      insights.push(
        "Codebase may benefit from refactoring and quality improvements",
      );
    }

    if (metrics.testCoverage > 80) {
      insights.push(
        "Excellent test coverage provides strong confidence in changes",
      );
    } else if (metrics.testCoverage < 20) {
      insights.push(
        "Low test coverage increases risk of undetected regressions",
      );
    }

    return insights;
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(
    structure: CodebaseStructure,
    metrics: ContextMetrics,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.testCoverage < 70) {
      recommendations.push("Increase test coverage to reduce regression risk");
    }

    if (metrics.coupling > 70) {
      recommendations.push(
        "Reduce coupling through better separation of concerns",
      );
    }

    if (metrics.cohesion < 30) {
      recommendations.push(
        "Improve cohesion by grouping related functionality",
      );
    }

    if (structure.modules.size === 0 && structure.totalFiles > 50) {
      recommendations.push(
        "Consider modularizing the codebase for better maintainability",
      );
    }

    if (
      structure.architecture.framework.length === 0 &&
      structure.totalFiles > 20
    ) {
      recommendations.push(
        "Consider adopting a framework to standardize development patterns",
      );
    }

    if (metrics.complexity > 80) {
      recommendations.push(
        "Consider breaking down complex components into smaller, focused units",
      );
    }

    return recommendations;
  }

  /**
   * Identify potential risks and issues
   */
  private identifyRisks(
    structure: CodebaseStructure,
    metrics: ContextMetrics,
  ): string[] {
    const risks: string[] = [];

    if (metrics.coupling > 80) {
      risks.push(
        "High coupling increases change risk and maintenance complexity",
      );
    }

    if (metrics.testCoverage < 30) {
      risks.push(
        "Low test coverage poses significant risk for safe refactoring",
      );
    }

    if (structure.dependencyGraph.size > 0) {
      // Check for circular dependencies (simplified check)
      const circularDeps = this.detectCircularDependencies(
        structure.dependencyGraph,
      );
      if (circularDeps.length > 0) {
        risks.push(
          `${circularDeps.length} potential circular dependencies detected`,
        );
      }
    }

    if (structure.languages.size > 5) {
      risks.push(
        "High language diversity may complicate team composition and maintenance",
      );
    }

    if (metrics.complexity > 90) {
      risks.push(
        "Very high complexity indicates potential maintainability issues",
      );
    }

    return risks;
  }

  // Helper methods

  private isModuleNames(names: readonly string[]): boolean {
    let hasSource = false;
    let hasMarker = false;
    for (const entry of names) {
      const ext = path.extname(entry);
      if (
        this.supportedLanguages[ext as keyof typeof this.supportedLanguages]
      ) {
        hasSource = true;
      }
      if (
        entry === "package.json" ||
        entry === "index.ts" ||
        entry === "index.js"
      ) {
        hasMarker = true;
      }
      if (hasSource && hasMarker) return true;
    }
    return false;
  }

  private isConfigFile(filePath: string): boolean {
    return CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
  }

  private classifyModule(
    relativePath: string,
    files: FileInfo[],
  ): ModuleInfo["type"] {
    if (relativePath.includes("test") || relativePath.includes("spec")) {
      return "test";
    }
    if (
      relativePath.includes("docs") ||
      files.some((f) => f.extension === ".md")
    ) {
      return "docs";
    }
    if (
      files.some((f) =>
        ["package.json", "Dockerfile", "docker-compose.yml"].includes(
          path.basename(f.relativePath),
        ),
      )
    ) {
      return "infrastructure";
    }
    if (
      files.some(
        (f) =>
          f.relativePath.includes("config") || f.relativePath.includes(".env"),
      )
    ) {
      return "config";
    }
    return "source";
  }

  private findEntryPoint(files: FileInfo[]): string | undefined {
    const entryCandidates = [
      "index.ts",
      "index.js",
      "main.ts",
      "main.js",
      "app.ts",
      "app.js",
    ];

    for (const candidate of entryCandidates) {
      const file = files.find(
        (f) => path.basename(f.relativePath) === candidate,
      );
      if (file) return file.relativePath;
    }

    // Fallback to first source file
    const sourceFile = files.find((f) => f.isSourceCode);
    return sourceFile?.relativePath;
  }

  private isEntryPoint(filePath: string, fileInfo: FileInfo): boolean {
    const entryIndicators = [
      "index.ts",
      "index.js",
      "main.ts",
      "main.js",
      "app.ts",
      "app.js",
      "server.ts",
      "server.js",
      "cli.ts",
      "cli.js",
    ];

    return (
      entryIndicators.includes(path.basename(filePath)) ||
      Boolean(fileInfo.content?.includes("#!/usr/bin/env")) ||
      Boolean(fileInfo.content?.includes("process.argv"))
    );
  }

  private detectCircularDependencies(
    dependencyGraph: Map<string, Set<string>>,
  ): string[] {
    const circularDeps: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const dependencies = dependencyGraph.get(node) || new Set();
      for (const dep of Array.from(dependencies)) {
        if (!visited.has(dep)) {
          if (dfs(dep)) {
            circularDeps.push(`${node} -> ${dep}`);
            return true;
          }
        } else if (recursionStack.has(dep)) {
          circularDeps.push(`${node} -> ${dep}`);
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of Array.from(dependencyGraph.keys())) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return circularDeps;
  }
}

// Export factory function for optimized analyzers
export const createCodebaseContextAnalyzer = (
  projectRoot?: string,
  memoryConfig?: Partial<MemoryConfig>,
): CodebaseContextAnalyzer => {
  return new CodebaseContextAnalyzer(projectRoot, memoryConfig);
};
