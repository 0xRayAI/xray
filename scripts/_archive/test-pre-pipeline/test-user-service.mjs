/**
 * User Service Test Script
 * Tests the code-review MCP functionality
 */

import { spawn } from 'child_process';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test directory
const TEST_DIR = join(__dirname, 'user-service-test-output');
const TEST_FILE = join(TEST_DIR, 'user-service.ts');

function setup() {
  console.log('🔧 Setting up user service test...');
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

function createUserServiceCode() {
  console.log('📝 Creating user service code...');
  
  const content = `
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "moderator";
}

export class UserService {
  private users: Map<string, User> = new Map();

  async createUser(userData: Omit<User, "id">): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = { id, ...userData };
    this.users.set(id, user);
    return user;
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }
}
`;

  writeFileSync(TEST_FILE, content);
  console.log('✅ User service code created:', TEST_FILE);
}

async function runCodeReview() {
  console.log('🔍 Running code review via MCP...');
  
  return new Promise((resolve) => {
    const input = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "code-review-test", version: "1.0" }
      }
    }) + '\n' + JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "analyze_code_quality",
        arguments: { 
          code: "// User service code",
          language: "typescript"
        }
      }
    }) + '\n';

    const proc = spawn('node', [
      join(__dirname, '../../dist/mcps/knowledge-skills/code-review.server.js')
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
      console.log('   Code review completed (code:', code, ')');
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
  console.log('👤 StringRay User Service Test Script');
  console.log('========================================\n');
  
  try {
    setup();
    createUserServiceCode();
    
    const result = await runCodeReview();
    
    console.log('\n========================================');
    console.log('📊 Results:');
    console.log('   User service code created: ✅');
    console.log('   Code review: ', result.code === 0 ? '✅' : '⚠️');
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
