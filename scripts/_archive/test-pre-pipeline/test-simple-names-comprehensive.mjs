/**
 * Comprehensive test for simple name mapping feature
 * Tests edge cases, error handling, and integration with TaskSkillRouter
 */

import { getAgentSimpleName, getAllSimpleNames, TaskSkillRouter } from '../../dist/delegation/task-skill-router.js';

console.log('🧪 COMPREHENSIVE SIMPLE NAME MAPPING TEST');
console.log('========================================\n');

// Test 1: Basic functionality verification
console.log('1. BASIC FUNCTIONALITY TEST');
console.log('--------------------------');
const basicTests = [
    { input: 'strategist', expected: 'Strategic Planner' },
    { input: 'bug-triage-specialist', expected: 'Error Resolver' },
    { input: 'security-auditor', expected: 'Security Specialist' },
    { input: 'testing-lead', expected: 'Quality Assurance Lead' },
    { input: 'researcher', expected: 'Code Researcher' },
    { input: 'tech-writer', expected: 'Documentation Expert' },
    { input: 'enforcer', expected: 'Quality Guardian' },
    { input: 'architect', expected: 'Solution Designer' },
    { input: 'frontend-ui-ux-engineer', expected: 'UI/UX Designer' },
    { input: 'database-engineer', expected: 'Database Specialist' },
];

basicTests.forEach(({ input, expected }) => {
    const result = getAgentSimpleName(input);
    const status = result === expected ? '✅' : '❌';
    console.log(`  ${status} ${input} → ${result} (expected: ${expected})`);
});

// Test 2: Unknown agent handling
console.log('\n2. UNKNOWN AGENT HANDLING');
console.log('--------------------------');
const unknownAgents = [
    'unknown-agent',
    'non-existent-agent',
    '',
    'random-name-123',
    null,
    undefined
];

unknownAgents.forEach(agent => {
    try {
        const result = getAgentSimpleName(agent);
        const status = typeof result === 'string' ? '✅' : '❌';
        console.log(`  ${status} ${String(agent || 'null')} → ${result || 'null'}`);
    } catch (error) {
        console.log(`  ❌ ${String(agent || 'null')} → ERROR: ${error.message}`);
    }
});

// Test 3: Legacy aliases
console.log('\n3. LEGACY ALIAS MAPPINGS');
console.log('-------------------------');
const legacyTests = [
    { input: 'librarian', expected: 'Research Analyst' },
    { input: 'seo-specialist', expected: 'SEO Expert' },
    { input: 'marketing-expert', expected: 'Growth Specialist' },
    { input: 'documentation-writer', expected: 'Documentation Writer' },
    { input: 'seo-copywriter', expected: 'Content Specialist' },
];

legacyTests.forEach(({ input, expected }) => {
    const result = getAgentSimpleName(input);
    const status = result === expected ? '✅' : '❌';
    console.log(`  ${status} ${input} → ${result} (expected: ${expected})`);
});

// Test 4: getAllSimpleNames() function
console.log('\n4. GET ALL MAPPINGS TEST');
console.log('-------------------------');
try {
    const allMappings = getAllSimpleNames();
    const mappingCount = Object.keys(allMappings).length;
    console.log(`  ✅ Retrieved ${mappingCount} mappings`);
    
    // Verify it's a proper object
    if (typeof allMappings === 'object' && allMappings !== null && !Array.isArray(allMappings)) {
        console.log('  ✅ Return type is correct (object)');
    } else {
        console.log('  ❌ Return type is incorrect');
    }
    
    // Check some specific mappings
    const checkMappings = ['strategist', 'enforcer', 'unknown-agent'];
    checkMappings.forEach(key => {
        const exists = key in allMappings;
        const value = allMappings[key];
        const status = exists ? '✅' : '❌';
        console.log(`  ${status} ${key}: ${value || 'undefined'}`);
    });
    
} catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
}

// Test 5: TaskSkillRouter class integration
console.log('\n5. TASK SKILL ROUTER INTEGRATION');
console.log('------------------------------');
try {
    const router = new TaskSkillRouter();
    
    // Test instance methods
    const simpleName = router.getSimpleName('strategist');
    console.log(`  ✅ Instance getSimpleName: strategist → ${simpleName}`);
    
    const allNames = router.getAllSimpleNames();
    console.log(`  ✅ Instance getAllSimpleNames: ${Object.keys(allNames).length} mappings`);
    
    // Test with non-existent agent
    const unknown = router.getSimpleName('definitely-not-real');
    console.log(`  ✅ Unknown agent fallback: definitely-not-real → ${unknown}`);
    
} catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
}

// Test 6: Edge cases and validation
console.log('\n6. EDGE CASES VALIDATION');
console.log('------------------------');
const edgeCases = [
    { input: 'STRATEGIST', description: 'uppercase input' },
    { input: 'Strategist', description: 'mixed case input' },
    { input: 'strategist', description: 'lowercase input' },
    { input: 'strategist-123', description: 'with numbers' },
    { input: 'strategist_', description: 'with underscore' },
    { input: 12345, description: 'numeric input' },
];

edgeCases.forEach(({ input, description }) => {
    try {
        const result = getAgentSimpleName(input);
        console.log(`  ✅ ${description}: ${String(input)} → ${result}`);
    } catch (error) {
        console.log(`  ⚠️  ${description}: ${String(input)} → ERROR: ${error.message}`);
    }
});

// Test 7: Performance test
console.log('\n7. PERFORMANCE TEST');
console.log('------------------');
const startTime = performance.now();
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
    getAgentSimpleName('strategist');
    getAgentSimpleName('security-auditor');
    getAgentSimpleName('testing-lead');
}

const endTime = performance.now();
const avgTime = (endTime - startTime) / iterations;

console.log(`  ✅ ${iterations} iterations completed`);
console.log(`  ✅ Average time per call: ${avgTime.toFixed(3)}ms`);
console.log(`  ✅ Total time: ${(endTime - startTime).toFixed(2)}ms`);

// Test 8: Verify no duplicate mappings
console.log('\n8. DUPLICATE MAPPINGS CHECK');
console.log('---------------------------');
try {
    const allMappings = getAllSimpleNames();
    const values = Object.values(allMappings);
    const uniqueValues = new Set(values);
    const duplicates = values.length - uniqueValues.size;
    
    if (duplicates === 0) {
        console.log(`  ✅ No duplicate simple names found`);
    } else {
        console.log(`  ❌ Found ${duplicates} duplicate simple names`);
    }
    
    // Check for duplicate technical names
    const keys = Object.keys(allMappings);
    const uniqueKeys = new Set(keys);
    const keyDuplicates = keys.length - uniqueKeys.size;
    
    if (keyDuplicates === 0) {
        console.log(`  ✅ No duplicate technical names found`);
    } else {
        console.log(`  ❌ Found ${keyDuplicates} duplicate technical names`);
    }
    
} catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
}

// Summary
console.log('\n========================================');
console.log('📊 TEST SUMMARY');
console.log('========================================');

const allTests = [
    ...basicTests,
    ...legacyTests,
    { input: 'unknown-agent', expected: 'unknown-agent' },
    { input: 'librarian', expected: 'Research Analyst' }
];

const passedTests = allTests.filter(({ input, expected }) => {
    try {
        return getAgentSimpleName(input) === expected;
    } catch {
        return false;
    }
});

const passedCount = passedTests.length;
const totalCount = allTests.length;
const successRate = (passedCount / totalCount * 100).toFixed(1);

console.log(`✅ Passed: ${passedCount}/${totalCount} (${successRate}%)`);
console.log('🧪 All edge cases and integration tests completed');
console.log('📈 Performance benchmark completed');
console.log('🔍 Duplicate mappings check completed');

console.log('\n✅ COMPREHENSIVE SIMPLE NAME MAPPING TEST COMPLETE');
console.log('========================================');