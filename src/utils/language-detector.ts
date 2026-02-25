/**
 * Language Detector Utility
 *
 * Detects project language and test framework from project files.
 * Supports: TypeScript, JavaScript, Python, Go, Rust, Java, C++, Ruby, PHP
 *
 * @version 1.0.0
 * @since 2026-02-25
 */

import * as fs from "fs";
import * as path from "path";

export interface ProjectLanguage {
  language: string;
  testFramework: string;
  testCommand: string;
  testFilePattern: string;
  configFiles: string[];
}

export interface LanguageConfig {
  language: string;
  extensions: string[];
  testFrameworks: {
    name: string;
    patterns: string[];
    testCommands: string[];
    configFiles: string[];
  }[];
}

// Supported languages and their configurations
export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    language: "TypeScript",
    extensions: [".ts", ".tsx"],
    testFrameworks: [
      {
        name: "Vitest",
        patterns: ["*.test.ts", "*.spec.ts", "**/*.test.ts", "**/*.spec.ts"],
        testCommands: ["vitest run", "npx vitest run", "npm test"],
        configFiles: ["vitest.config.ts", "vitest.config.js", "vitest.config.mts"],
      },
      {
        name: "Jest",
        patterns: ["*.test.ts", "*.spec.ts", "*.test.js", "*.spec.js"],
        testCommands: ["jest", "npx jest", "npm test"],
        configFiles: ["jest.config.js", "jest.config.ts", "jest.config.json"],
      },
      {
        name: "Mocha",
        patterns: ["*.test.ts", "*.spec.ts", "*.test.js"],
        testCommands: ["mocha", "npx mocha"],
        configFiles: [".mocharc.json", ".mocharc.js", "mocha.opts"],
      },
    ],
  },
  {
    language: "JavaScript",
    extensions: [".js", ".jsx", ".mjs"],
    testFrameworks: [
      {
        name: "Jest",
        patterns: ["*.test.js", "*.spec.js", "*.test.jsx", "*.spec.jsx"],
        testCommands: ["jest", "npx jest", "npm test"],
        configFiles: ["jest.config.js", "jest.config.json"],
      },
      {
        name: "Mocha",
        patterns: ["*.test.js", "*.spec.js"],
        testCommands: ["mocha", "npx mocha"],
        configFiles: [".mocharc.json", ".mocharc.js"],
      },
      {
        name: "Vitest",
        patterns: ["*.test.js", "*.spec.js"],
        testCommands: ["vitest run", "npx vitest run"],
        configFiles: ["vitest.config.js"],
      },
    ],
  },
  {
    language: "Python",
    extensions: [".py"],
    testFrameworks: [
      {
        name: "pytest",
        patterns: ["test_*.py", "*_test.py", "**/test_*.py"],
        testCommands: ["pytest", "python -m pytest", "python3 -m pytest"],
        configFiles: ["pytest.ini", "pyproject.toml", "setup.cfg", "conftest.py"],
      },
      {
        name: "unittest",
        patterns: ["test_*.py", "*_test.py"],
        testCommands: ["python -m unittest", "python3 -m unittest"],
        configFiles: [],
      },
      {
        name: "nose",
        patterns: ["test_*.py", "*_test.py"],
        testCommands: ["nosetests", "python -m nose"],
        configFiles: ["nose.cfg"],
      },
    ],
  },
  {
    language: "Go",
    extensions: [".go"],
    testFrameworks: [
      {
        name: "testing",
        patterns: ["*_test.go"],
        testCommands: ["go test", "go test -v", "go test ./..."],
        configFiles: ["go.mod"],
      },
    ],
  },
  {
    language: "Rust",
    extensions: [".rs"],
    testFrameworks: [
      {
        name: "cargo test",
        patterns: ["**/tests/**/*.rs", "**/*_test.rs", "**/src/**/*_test.rs"],
        testCommands: ["cargo test", "cargo test --lib", "cargo test --all"],
        configFiles: ["Cargo.toml"],
      },
    ],
  },
  {
    language: "Java",
    extensions: [".java"],
    testFrameworks: [
      {
        name: "JUnit",
        patterns: ["**/test/**/*.java", "**/*Test.java", "**/*Tests.java"],
        testCommands: ["mvn test", "gradle test", "./gradlew test"],
        configFiles: ["pom.xml", "build.gradle", "build.gradle.kts"],
      },
      {
        name: "TestNG",
        patterns: ["**/test/**/*.java", "**/*TestNG.java"],
        testCommands: ["mvn test", "gradle test"],
        configFiles: ["testng.xml", "pom.xml"],
      },
    ],
  },
  {
    language: "C#",
    extensions: [".cs"],
    testFrameworks: [
      {
        name: "xUnit",
        patterns: ["**/*Test.cs", "**/*Tests.cs"],
        testCommands: ["dotnet test", "dotnet test --verbosity normal"],
        configFiles: ["*.csproj", "*.sln"],
      },
      {
        name: "NUnit",
        patterns: ["**/*Test.cs", "**/*Tests.cs"],
        testCommands: ["dotnet test", "nunit3-console"],
        configFiles: ["*.csproj", "packages.config"],
      },
      {
        name: "MSTest",
        patterns: ["**/*Test.cs"],
        testCommands: ["dotnet test"],
        configFiles: ["*.csproj"],
      },
    ],
  },
  {
    language: "Ruby",
    extensions: [".rb"],
    testFrameworks: [
      {
        name: "RSpec",
        patterns: ["**/*_spec.rb", "spec/**/*.rb"],
        testCommands: ["rspec", "bundle exec rspec"],
        configFiles: [".rspec", "Gemfile", "rspec.yml"],
      },
      {
        name: "Minitest",
        patterns: ["test/**/*.rb", "**/*_test.rb"],
        testCommands: ["rake test", "ruby -Itest"],
        configFiles: ["Rakefile"],
      },
    ],
  },
  {
    language: "PHP",
    extensions: [".php"],
    testFrameworks: [
      {
        name: "PHPUnit",
        patterns: ["**/test/**/*.php", "**/*Test.php", "**/*Tests.php"],
        testCommands: ["phpunit", "./vendor/bin/phpunit", "composer test"],
        configFiles: ["phpunit.xml", "phpunit.xml.dist", "composer.json"],
      },
      {
        name: "Codeception",
        patterns: ["**/tests/**/*.php"],
        testCommands: ["codecept run", "./vendor/bin/codecept run"],
        configFiles: ["codeception.yml"],
      },
    ],
  },
  {
    language: "Shell",
    extensions: [".sh", ".bash", ".zsh"],
    testFrameworks: [
      {
        name: "bats",
        patterns: ["**/*.bats", "test/**/*.sh"],
        testCommands: ["bats", "bats test/", "npx bats"],
        configFiles: [".batsrc"],
      },
    ],
  },
];

/**
 * Detect the project language from directory contents
 */
export function detectProjectLanguage(cwd: string): ProjectLanguage | null {
  // Check for package.json (TypeScript/JavaScript)
  if (fs.existsSync(path.join(cwd, "package.json"))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
    
    // Check for TypeScript
    if (
      fs.existsSync(path.join(cwd, "tsconfig.json")) ||
      pkg.devDependencies?.typescript ||
      pkg.dependencies?.typescript
    ) {
      return detectTestFramework(cwd, "TypeScript");
    }
    
    // Check for JavaScript
    return detectTestFramework(cwd, "JavaScript");
  }
  
  // Check for go.mod (Go)
  if (fs.existsSync(path.join(cwd, "go.mod"))) {
    return detectTestFramework(cwd, "Go");
  }
  
  // Check for Cargo.toml (Rust)
  if (fs.existsSync(path.join(cwd, "Cargo.toml"))) {
    return detectTestFramework(cwd, "Rust");
  }
  
  // Check for pom.xml or build.gradle (Java)
  if (
    fs.existsSync(path.join(cwd, "pom.xml")) ||
    fs.existsSync(path.join(cwd, "build.gradle")) ||
    fs.existsSync(path.join(cwd, "build.gradle.kts"))
  ) {
    return detectTestFramework(cwd, "Java");
  }
  
  // Check for *.csproj or *.sln (C#)
  const csprojFiles = fs.readdirSync(cwd).filter(f => f.endsWith(".csproj"));
  if (csprojFiles.length > 0 || fs.existsSync(path.join(cwd, "*.sln"))) {
    return detectTestFramework(cwd, "C#");
  }
  
  // Check for Gemfile (Ruby)
  if (fs.existsSync(path.join(cwd, "Gemfile"))) {
    return detectTestFramework(cwd, "Ruby");
  }
  
  // Check for composer.json (PHP)
  if (fs.existsSync(path.join(cwd, "composer.json"))) {
    return detectTestFramework(cwd, "PHP");
  }
  
  // Check for pytest.ini, setup.py, or pyproject.toml (Python)
  if (
    fs.existsSync(path.join(cwd, "pytest.ini")) ||
    fs.existsSync(path.join(cwd, "setup.py")) ||
    fs.existsSync(path.join(cwd, "pyproject.toml"))
  ) {
    return detectTestFramework(cwd, "Python");
  }
  
  return null;
}

/**
 * Detect the test framework for a given language
 */
function detectTestFramework(cwd: string, language: string): ProjectLanguage {
  const config = LANGUAGE_CONFIGS.find(c => c.language === language);
  
  if (!config) {
    return {
      language,
      testFramework: "unknown",
      testCommand: "npm test",
      testFilePattern: "*.test.*",
      configFiles: [],
    };
  }
  
  // Check each test framework's config files
  for (const framework of config.testFrameworks) {
    for (const configFile of framework.configFiles) {
      if (fs.existsSync(path.join(cwd, configFile))) {
        return {
          language,
          testFramework: framework.name,
          testCommand: framework.testCommands[0] || "npm test",
          testFilePattern: framework.patterns[0] || "*.test.*",
          configFiles: framework.configFiles,
        };
      }
    }
  }
  
  // Default to first framework if no config found
  const defaultFramework = config.testFrameworks[0];
  if (!defaultFramework) {
    return {
      language,
      testFramework: "unknown",
      testCommand: "npm test",
      testFilePattern: "*.test.*",
      configFiles: [],
    };
  }
  return {
    language,
    testFramework: defaultFramework.name,
    testCommand: defaultFramework.testCommands[0] || "npm test",
    testFilePattern: defaultFramework.patterns[0] || "*.test.*",
    configFiles: [],
  };
}

/**
 * Get the test file path for a given source file
 */
export function getTestFilePath(
  sourceFilePath: string,
  projectLanguage: ProjectLanguage
): string {
  const dir = path.dirname(sourceFilePath);
  const basename = path.basename(sourceFilePath);
  const ext = path.extname(sourceFilePath);
  const nameWithoutExt = basename.replace(ext, "");
  
  switch (projectLanguage.language) {
    case "TypeScript":
    case "JavaScript":
      // src/utils/helper.ts -> src/__tests__/utils/helper.test.ts
      return path.join(dir.replace("/src/", "/src/__tests__/"), `${nameWithoutExt}.test${ext}`);
    
    case "Python":
      // src/utils/helper.py -> tests/test_helper.py
      return path.join(dir.replace("/src/", "/tests/"), `test_${nameWithoutExt}.py`);
    
    case "Go":
      // internal/utils/helper.go -> internal/utils/helper_test.go
      return path.join(dir, `${nameWithoutExt}_test.go`);
    
    case "Rust":
      // src/utils/helper.rs -> src/utils/helper_test.rs
      return path.join(dir, `${nameWithoutExt}_test.rs`);
    
    case "Java":
      // src/com/pkg/Util.java -> test/com/pkg/UtilTest.java
      return path.join(dir.replace("/src/", "/test/"), `${nameWithoutExt}Test.java`);
    
    case "C#":
      // src/Util.cs -> tests/UtilTest.cs
      return path.join(dir.replace("/src/", "/tests/"), `${nameWithoutExt}Test.cs`);
    
    case "Ruby":
      // lib/helper.rb -> spec/lib/helper_spec.rb
      return path.join(dir.replace("/lib/", "/spec/"), `${nameWithoutExt}_spec.rb`);
    
    case "PHP":
      // src/Util.php -> tests/UtilTest.php
      return path.join(dir.replace("/src/", "/tests/"), `${nameWithoutExt}Test.php`);
    
    default:
      return path.join(dir, `${nameWithoutExt}.test${ext}`);
  }
}

/**
 * Build the test command for running specific tests
 */
export function buildTestCommand(
  projectLanguage: ProjectLanguage,
  testFilePath?: string
): string {
  const { testCommand, language } = projectLanguage;
  
  if (!testFilePath) {
    return testCommand;
  }
  
  // Language-specific test file targeting
  switch (language) {
    case "TypeScript":
    case "JavaScript":
      return `npx vitest run "${testFilePath}"`;
    
    case "Python":
      return `pytest "${testFilePath}"`;
    
    case "Go":
      return `go test -v ${testFilePath}`;
    
    case "Rust":
      return `cargo test --lib ${path.basename(testFilePath, ".rs")}`;
    
    case "Java":
      return `mvn test -Dtest=${path.basename(testFilePath, ".java")}`;
    
    case "C#":
      return `dotnet test --filter "FullyQualifiedName~${path.basename(testFilePath, ".cs")}"`;
    
    default:
      return `${testCommand} "${testFilePath}"`;
  }
}

// Export singleton for easy use
export const languageDetector = {
  detect: detectProjectLanguage,
  getTestFilePath,
  buildTestCommand,
};
