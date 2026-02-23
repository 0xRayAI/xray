/**
 * Test script to verify test auto-generation works
 * This simulates what happens when a new file is created
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🧪 Testing Test Auto-Generation Flow\n");
  
  const testDir = "/tmp/test-auto-gen-test";
  const sourceFile = "src/utils/math-helper.ts";
  const fullSourcePath = path.join(testDir, sourceFile);
  
  // Verify source file exists
  if (!fs.existsSync(fullSourcePath)) {
    console.error("❌ Source file not found:", fullSourcePath);
    process.exit(1);
  }
  
  console.log("📄 Source file exists:", sourceFile);
  
// Import the processor manager
const { importResolver } = await import("../dist/utils/import-resolver.js");
const { ProcessorManager } = await import("../dist/processors/processor-manager.js");
  
  const processorManager = new ProcessorManager();
  
  // Register the testAutoCreation processor (like the plugin does)
  processorManager.registerProcessor({
    name: "testAutoCreation",
    type: "post",
    priority: 50,
    enabled: true,
  });
  
  console.log("✅ Registered testAutoCreation processor");
  console.log("\n▶️ Running testAutoCreation processor...");
  
  // Execute the processor with correct context (our fix!)
  const result = await processorManager.executeProcessor("testAutoCreation", {
    tool: "write",
    operation: "commit",
    filePath: sourceFile,
    directory: testDir,
  });
  
  console.log("\n📊 Processor Result:");
  console.log("  Success:", result.success);
  console.log("  Duration:", result.duration, "ms");
  console.log("  Data:", JSON.stringify(result.data, null, 2));
  
  // Check if test file was created
  const testFilePath = fullSourcePath.replace(".ts", ".test.ts");
  
  if (fs.existsSync(testFilePath)) {
    console.log("\n✅ SUCCESS: Test file was auto-generated!");
    console.log("📄 Test file:", testFilePath);
    
    const testContent = fs.readFileSync(testFilePath, "utf8");
    console.log("\n📝 Test file preview (first 500 chars):");
    console.log(testContent.slice(0, 500));
  } else {
    console.log("\n❌ FAILURE: Test file was NOT generated");
    console.log("Expected:", testFilePath);
  }
}

main().catch(console.error);
