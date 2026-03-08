/**
 * Test Auto-Creation Processor Direct Test
 * 
 * Tests the test auto-creation processor with a real source file
 */

import { testAutoCreationProcessor } from "../processors/test-auto-creation-processor.js";
import * as fs from "fs";
import * as path from "path";

const testDir = path.join(process.cwd(), "src/__tests__/temp");

async function createTestSourceFile(): Promise<string> {
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const sourceFilePath = path.join(testDir, "sample-calculator.ts");
  
  // Create a sample source file
  const sourceCode = `/**
 * Sample Calculator
 * A simple calculator for testing
 */
export class Calculator {
  /**
   * Add two numbers
   */
  add(a: number, b: number): number {
    return a + b;
  }
  
  /**
   * Subtract two numbers
   */
  subtract(a: number, b: number): number {
    return a - b;
  }
  
  /**
   * Multiply two numbers
   */
  multiply(a: number, b: number): number {
    return a * b;
  }
}`;

  fs.writeFileSync(sourceFilePath, sourceCode);
  console.log("Created source file:", sourceFilePath);
  
  return sourceFilePath;
}

async function testAutoCreation() {
  console.log("=".repeat(60));
  console.log("🧪 TEST AUTO-CREATION PROCESSOR TEST");
  console.log("=".repeat(60));

  try {
    // Create a sample source file
    const sourceFilePath = await createTestSourceFile();
    
    // Make the path relative to cwd
    const relativePath = path.relative(process.cwd(), sourceFilePath);
    console.log("Relative path:", relativePath);
    
    // Test the auto-creation with the file
    const result = await testAutoCreationProcessor.execute({
      tool: "write",
      operation: "create",
      filePath: relativePath,
      directory: process.cwd()
    });
    
    console.log("\nResult:", JSON.stringify(result, null, 2));
    
    // Check if test file was created (use the same logic as processor)
    const testFilePath = relativePath
      .replace(/\/src\//, "/src/__tests__/")
      .replace(/\.ts$/, ".test.ts");
    
    const fullTestPath = path.join(process.cwd(), testFilePath);
    console.log("\nExpected test file path:", fullTestPath);
    console.log("Test file exists:", fs.existsSync(fullTestPath));
    
    if (fs.existsSync(fullTestPath)) {
      console.log("\n✅ TEST AUTO-CREATION: WORKING - Test file created!");
      console.log("Test file content (first 500 chars):");
      console.log(fs.readFileSync(fullTestPath, "utf-8").slice(0, 500));
      
      // Clean up
      fs.unlinkSync(sourceFilePath);
      fs.unlinkSync(fullTestPath);
      fs.rmdirSync(testDir);
    } else {
      console.log("\n❌ TEST AUTO-CREATION: NOT WORKING - Test file not created");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  console.log("\n" + "=".repeat(60));
}

testAutoCreation();
