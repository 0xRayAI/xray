/**
 * Security Module Test Script
 * Tests the security audit MCP functionality
 */

import { spawn } from 'child_process';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test directory
const TEST_DIR = join(__dirname, 'security-test-output');
const TEST_FILE = join(TEST_DIR, 'vulnerable-code.ts');

function setup() {
  console.log('🔧 Setting up security test...');
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

function createVulnerableCode() {
  console.log('📝 Creating vulnerable test code...');
  
  const content = `/**
 * Vulnerable code for security testing
 */

// SQL Injection vulnerability
function authenticateUser(username: string, password: string): boolean {
  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
  return query.length > 0;
}

// Hardcoded secret
const API_KEY = "sk-1234567890abcdef";

// XSS vulnerability  
function renderUserInput(input: string): string {
  return \`<div>\${input}</div>\`;
}

// Insecure random
function generateToken(): string {
  return Math.random().toString(36);
}

export { authenticateUser, API_KEY, renderUserInput, generateToken };
`;

  writeFileSync(TEST_FILE, content);
  console.log('✅ Vulnerable code created:', TEST_FILE);
}

async function runSecurityScan() {
  console.log('🔍 Running security scan via MCP...');
  
  return new Promise((resolve) => {
    const input = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "security-test", version: "1.0" }
      }
    }) + '\n' + JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "audit_security",
        arguments: { files: [TEST_FILE], includeDependencies: false }
      }
    }) + '\n';

    const proc = spawn('node', [
      join(__dirname, '../../dist/mcps/knowledge-skills/security-audit.server.js')
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      console.log('   Security scan completed (code:', code, ')');
      resolve({ stdout, stderr, code });
    });

    proc.stdin.write(input);
    proc.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      proc.kill();
      resolve({ stdout, stderr: 'Timeout', code: -1 });
    }, 10000);
  });
}

function cleanup() {
  console.log('🧹 Cleaning up...');
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function main() {
  console.log('\n========================================');
  console.log('🔒 StringRay Security Test Script');
  console.log('========================================\n');
  
  try {
    setup();
    createVulnerableCode();
    
    const result = await runSecurityScan();
    
    console.log('\n========================================');
    console.log('📊 Results:');
    console.log('   Vulnerable code created: ✅');
    console.log('   Security scan: ', result.code === 0 ? '✅' : '⚠️');
    console.log('========================================\n');
    
    cleanup();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    cleanup();
    process.exit(1);
  }
}

main();
