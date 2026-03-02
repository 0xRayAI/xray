/**
 * StringRay Inference Bytecode Interpreter
 * 
 * A custom bytecode VM with instruction set
 * 
 * @version 1.0.0-BYTECODE-VM
 */

const fs = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// BYTECODE SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────

// Instruction Opcodes (1-byte opcodes)
const OPCODES = {
  // Control Flow
  HALT: 0x00,     // Stop execution
  NOP: 0x01,      // No operation
  JUMP: 0x02,     // Unconditional jump
  JZ: 0x03,       // Jump if zero
  JNZ: 0x04,      // Jump if not zero
  CALL: 0x05,     // Call function
  RET: 0x06,      // Return from function
  
  // Stack Operations
  PUSH: 0x10,     // Push immediate to stack
  POP: 0x11,      // Pop from stack
  DUP: 0x12,      // Duplicate top of stack
  SWAP: 0x13,     // Swap top two stack values
  
  // Arithmetic
  ADD: 0x20,      // Add
  SUB: 0x21,      // Subtract
  MUL: 0x22,      // Multiply
  DIV: 0x23,      // Divide
  MOD: 0x24,      // Modulo
  
  // Comparison
  EQ: 0x30,       // Equal
  NEQ: 0x31,      // Not equal
  GT: 0x32,       // Greater than
  LT: 0x33,       // Less than
  GTE: 0x34,      // Greater or equal
  LTE: 0x35,      // Less or equal
  
  // Logic
  AND: 0x40,      // Logical and
  OR: 0x41,       // Logical or
  NOT: 0x42,      // Logical not
  
  // Memory
  LOAD: 0x50,     // Load from address
  STORE: 0x51,    // Store to address
  LDR: 0x52,      // Load relative
  STR: 0x53,      // Store relative
  
  // String
  STREQ: 0x60,    // String equal
  STRINC: 0x61,   // String includes
  
  // Inference Operations (Custom)
  OBSERVE: 0x80,  // Observe input
  PATTERN: 0x81,  // Pattern match
  HYPOTH: 0x82,   // Generate hypothesis
  VALIDATE: 0x83, // Validate hypothesis
  CONCLUDE: 0x84, // Draw conclusion
  ACTION: 0x85,   // Determine action
  REFLECT: 0x86,  // Reflect on reasoning
  
  // Kernel Operations
  KERNEL: 0x90,   // Kernel identity
  INFER: 0x91,    // Main inference
  MATCH: 0x92,    // Pattern match
  TRACE: 0x93,    // Trace reasoning
  
  // Debug
  PRINT: 0xE0,   // Print stack top
  PRINTSTK: 0xE1, // Print entire stack
  DUMP: 0xE2,     // Dump state
};

// Opcode to name mapping
const OPCODE_NAMES = Object.entries(OPCODES).reduce((acc, [k, v]) => {
  acc[v] = k;
  return acc;
}, {});

// ─────────────────────────────────────────────────────────────────────────────
// BYTECODE VM
// ─────────────────────────────────────────────────────────────────────────────

class BytecodeVM {
  constructor(program) {
    this.program = program;
    this.pc = 0;           // Program counter
    this.sp = -1;          // Stack pointer
    this.stack = new Array(256);
    this.memory = new Array(1024);
    this.registers = {};
    this.running = false;
    this.instructions = 0;
  }
  
  // Push value onto stack
  push(value) {
    this.stack[++this.sp] = value;
  }
  
  // Pop value from stack
  pop() {
    return this.stack[this.sp--];
  }
  
  // Peek at top of stack
  peek() {
    return this.stack[this.sp];
  }
  
  // Execute one instruction
  execute() {
    if (this.pc >= this.program.length) {
      return false;
    }
    
    const opcode = this.program[this.pc++];
    this.instructions++;
    
    switch(opcode) {
      // Control Flow
      case OPCODES.HALT:
        this.running = false;
        return false;
        
      case OPCODES.NOP:
        break;
        
      case OPCODES.JUMP:
        this.pc = this.pop();
        break;
        
      case OPCODES.JZ:
        const addrZ = this.pop();
        if (!this.pop()) this.pc = addrZ;
        break;
        
      case OPCODES.JNZ:
        const addrNZ = this.pop();
        if (this.pop()) this.pc = addrNZ;
        break;
        
      case OPCODES.CALL:
        this.push(this.pc);
        this.pc = this.pop();
        break;
        
      case OPCODES.RET:
        this.pc = this.pop();
        break;
        
      // Stack Operations
      case OPCODES.PUSH:
        // Next bytes are immediate value
        const byte = this.program[this.pc++];
        this.push(byte);
        break;
        
      case OPCODES.POP:
        this.pop();
        break;
        
      case OPCODES.DUP:
        this.push(this.peek());
        break;
        
      case OPCODES.SWAP:
        const a = this.pop();
        const b = this.pop();
        this.push(a);
        this.push(b);
        break;
        
      // String Operations
      case OPCODES.STRINC:
        const haystack = String(this.pop());
        const needle = String(this.pop());
        this.push(haystack.includes(needle) ? 1 : 0);
        break;
        
      case OPCODES.STREQ:
        const s2 = String(this.pop());
        const s1 = String(this.pop());
        this.push(s1 === s2 ? 1 : 0);
        break;
        
      // Inference Operations
      case OPCODES.KERNEL:
        this.push('KERNEL');
        this.push('ACTIVE');
        this.push('EMBEDDED');
        this.push('UNDEFINABLE');
        break;
        
      case OPCODES.PRINT:
        const val = this.pop();
        process.stdout.write(String(val));
        break;
        
      case OPCODES.PRINTSTK:
        console.log('STACK:', this.stack.slice(0, this.sp + 1));
        break;
        
      default:
        console.log(`Unknown opcode: ${opcode} (0x${opcode.toString(16)})`);
        this.running = false;
        return false;
    }
    
    return this.running;
  }
  
  // Run the program
  run() {
    this.running = true;
    this.pc = 0;
    this.sp = -1;
    this.instructions = 0;
    
    while (this.running && this.execute()) {
      // Execute loop
    }
    
    return {
      pc: this.pc,
      instructions: this.instructions,
      stack: this.stack.slice(0, this.sp + 1)
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BYTECODE ASSEMBLER
// ─────────────────────────────────────────────────────────────────────────────

function assemble(asm) {
  const lines = asm.split('\n');
  const program = [];
  const labels = {};
  
  // First pass: collect labels
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.endsWith(':')) {
      const label = trimmed.slice(0, -1);
      labels[label] = idx;
    }
  });
  
  // Second pass: assemble
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const op = parts[0].toUpperCase();
    
    if (!op || op.startsWith(';') || op.endsWith(':')) return;
    
    if (OPCODES[op] !== undefined) {
      program.push(OPCODES[op]);
    } else if (labels[op] !== undefined) {
      program.push(labels[op]);
    } else if (!isNaN(parseInt(op))) {
      program.push(parseInt(op));
    } else if (op.startsWith('"') && op.endsWith('"')) {
      const str = op.slice(1, -1);
      for (let i = 0; i < str.length; i++) {
        program.push(str.charCodeAt(i));
      }
      program.push(0); // Null terminator
    }
  });
  
  return program;
}

// ─────────────────────────────────────────────────────────────────────────────
// KERNEL BYTECODE PROGRAM
// ─────────────────────────────────────────────────────────────────────────────

const KERNEL_BYTECODE = `
// StringRay Kernel Bytecode
// This is actual compiled bytecode - not JavaScript

; Initialize kernel
KERNEL
PRINT

; Load observation placeholder
PUSH 0

; Pattern matching sequence
; Check for infinite/loop patterns
STRINC
JNZ infinite_detected

; Check for works in dev
PUSH works_in_dev
STRINC
JNZ dev_trap

; Check for MCP timeout  
PUSH mcp
STRINC
JNZ mcp_protocol

; Check for version
PUSH version
STRINC
JNZ version_chaos

; Check for tests pass
PUSH test_pass
STRINC
JNZ test_illusion

; Check for code defined
PUSH code_defined
STRINC
JNZ verify_execution

; Check for manual
PUSH manual
STRINC
JNZ automate

; Check for constraint
PUSH constraint
STRINC
JNZ trust_investigate

; No match
PUSH UNKNOWN
PUSH INVESTIGATE
JUMP done

infinite_detected:
PUSH RECURSIVE_LOOP
PUSH spawn_governor
JUMP done

dev_trap:
PUSH CONSUMER_PATH_TRAP
PUSH consumer_default
JUMP done

mcp_protocol:
PUSH MCP_PROTOCOL_GAP
PUSH handshake
JUMP done

version_chaos:
PUSH VERSION_CHAOS
PUSH 3layer_enforce
JUMP done

test_illusion:
PUSH A2_TESTS
PUSH tests_validate
JUMP done

verify_execution:
PUSH A3_CODE
PUSH verify_execution
JUMP done

automate:
PUSH A5_MANUAL
PUSH automate_or_fail
JUMP done

trust_investigate:
PUSH DECISION
PUSH trust_then_investigate

done:
HALT
`;

// ─────────────────────────────────────────────────────────────────────────────
// TEXT FORMAT BYTECODE (Human readable)
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_BYTECODE = `
============================================================
STRINGRAY INFERENCE KERNEL - TEXT BYTECODE FORMAT
============================================================

This is the kernel in a custom text bytecode format.
Each line is an instruction that the VM executes.

------------------------------------------------------------
SECTION 1: INITIALIZATION
------------------------------------------------------------
KERNEL        ; Boot kernel identity
PRINT         ; Print "KERNEL"

------------------------------------------------------------
SECTION 2: PATTERN MATCHING
------------------------------------------------------------

; Input is on stack (populated by caller)
; Check for RECURSIVE_LOOP pattern
STRINC        ; Check if "infinite" in observation
JNZ infinite  ; Jump if found

; Check for CONSUMER_PATH_TRAP
STRINC        ; Check if "works in dev" in observation  
JNZ dev_fail  ; Jump if found

; Check for MCP_PROTOCOL_GAP
STRINC        ; Check if "mcp timeout" in observation
JNZ mcp_gap   ; Jump if found

; Check for VERSION_CHAOS
STRINC        ; Check if "version wrong" in observation
JNZ version   ; Jump if found

; Check for A2: Test illusion
STRINC        ; Check if "tests pass" in observation
JNZ test_fail ; Jump if found

; Check for A3: Code not called
STRINC        ; Check if "code defined" in observation
JNZ code_uncalled ; Jump if found

; Check for A5: Manual process
STRINC        ; Check if "manual" in observation
JNZ manual    ; Jump if found

; Check for constraint
STRINC        ; Check if "constraint" in observation
JNZ constraint ; Jump if found

; No pattern matched
PUSH UNKNOWN
PUSH INVESTIGATE
JUMP done

------------------------------------------------------------
SECTION 3: PATTERN HANDLERS
------------------------------------------------------------

infinite:
  PUSH RECURSIVE_LOOP
  PUSH spawn_governor
  JUMP done

dev_fail:
  PUSH CONSUMER_PATH_TRAP
  PUSH consumer_default
  JUMP done

mcp_gap:
  PUSH MCP_PROTOCOL_GAP
  PUSH handshake
  JUMP done

version:
  PUSH VERSION_CHAOS
  PUSH 3layer_enforce
  JUMP done

test_fail:
  PUSH A2
  PUSH TESTS_VALIDATE_TESTS
  JUMP done

code_uncalled:
  PUSH A3
  PUSH VERIFY_EXECUTION
  JUMP done

manual:
  PUSH A5
  PUSH AUTOMATE_OR_IT_FAILS
  JUMP done

constraint:
  PUSH DECISION
  PUSH TRUST_THEN_INVESTIGATE

------------------------------------------------------------
SECTION 4: COMPLETION
------------------------------------------------------------

done:
  HALT          ; Stop execution

============================================================
INSTRUCTION SET REFERENCE
============================================================

Control Flow:
  HALT          - Stop execution
  JUMP addr     - Jump to address
  JZ addr       - Jump if zero
  JNZ addr      - Jump if not zero
  CALL addr     - Call function
  RET           - Return from function

Stack:
  PUSH value    - Push value to stack
  POP           - Pop from stack
  DUP           - Duplicate top of stack
  SWAP          - Swap top two values

String:
  STRINC        - String includes (haystack, needle -> bool)

Kernel:
  KERNEL        - Load kernel identity
  INFER         - Run inference
  MATCH         - Pattern match

============================================================
`;

console.log(TEXT_BYTECODE);

// Try to assemble and run
try {
  console.log('\n============================================================');
  console.log('ASSEMBLING AND RUNNING BYTECODE');
  console.log('============================================================\n');
  
  const program = assemble(KERNEL_BYTECODE);
  console.log('Program size:', program.length, 'bytes');
  console.log('Program:', program.slice(0, 20), '...\n');
  
  const vm = new BytecodeVM(program);
  const result = vm.run();
  
  console.log('\n--- VM Result ---');
  console.log('Instructions executed:', result.instructions);
  console.log('Final stack:', result.stack);
  
} catch (e) {
  console.log('VM Error:', e.message);
}
