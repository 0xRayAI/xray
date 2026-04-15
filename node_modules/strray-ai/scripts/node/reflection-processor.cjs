/**
 * Reflection Post-Processor
 * 
 * Extracts patterns, code, and lessons from reflections
 * Feeds them to the kernel and learning engine
 * 
 * Run after any reflection is saved:
 *   node scripts/node/reflection-processor.js
 */

const fs = require('fs');
const path = require('path');

const REFLECTIONS_DIR = './docs/reflections';

// Extract patterns mentioned in reflection
function extractPatterns(content) {
  const patterns = [];
  
  // Common pattern references
  const patternKeywords = [
    'kernel', 'routing', 'learning', 'pattern', 'emergence',
    'feedback', 'loop', 'pipeline', 'delegate', 'agent',
    'confidence', 'inference', 'detection', 'assumption'
  ];
  
  for (const keyword of patternKeywords) {
    const regex = new RegExp(keyword, 'gi');
    const matches = content.match(regex);
    if (matches && matches.length > 2) {
      patterns.push(keyword);
    }
  }
  
  return [...new Set(patterns)];
}

// Extract code blocks for potential reuse
function extractCodeBlocks(content) {
  const codeBlocks = [];
  const regex = /```(?:typescript|javascript|bash|json)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    codeBlocks.push(match[1].trim());
  }
  
  return codeBlocks;
}

// Extract lessons (from "Deep Lessons" or "Key Learnings" sections)
function extractLessons(content) {
  const lessons = [];
  
  // Look for lesson-like content
  const lessonPatterns = [
    /### Lesson \d+: ([^\n]+)/g,
    /Ah-Ha Moment:? ([^\n]+)/g,
    /Deep Learning:? ([^\n]+)/g,
    /Key lesson:? ([^\n]+)/g,
  ];
  
  for (const pattern of lessonPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      lessons.push(...matches.slice(0, 5));
    }
  }
  
  return lessons.slice(0, 10);
}

// Extract executive summary
function extractExecutiveSummary(content) {
  const match = content.match(/### 1\. Executive Summary\n+([^\n#]+)/i);
  if (match) {
    return match[1].trim().slice(0, 200);
  }
  return '';
}

// Process a single reflection
function processReflection(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const stats = fs.statSync(filePath);
  
  return {
    file: path.basename(filePath),
    date: stats.mtime.toISOString().split('T')[0],
    executiveSummary: extractExecutiveSummary(content),
    patterns: extractPatterns(content),
    lessons: extractLessons(content),
    codeSnippets: extractCodeBlocks(content)
  };
}

// Generate kernel pattern suggestion from reflection
function generatePatternSuggestion(metadata) {
  if (metadata.patterns.length === 0) return '';
  
  const patterns = metadata.patterns.join(', ');
  return `
/**
 * Pattern extracted from reflection: ${metadata.file}
 * Date: ${metadata.date}
 * 
 * Executive Summary: ${metadata.executiveSummary}
 * 
 * Patterns detected: ${patterns}
 * Lessons: ${metadata.lessons.length}
 * Code examples: ${metadata.codeSnippets.length}
 */
`;
}

// Main processor
function main() {
  console.log('🔄 Reflection Post-Processor');
  console.log('============================');
  console.log('');
  
  // Get all reflection files
  if (!fs.existsSync(REFLECTIONS_DIR)) {
    console.log('❌ Reflections directory not found');
    process.exit(1);
  }
  
  const files = fs.readdirSync(REFLECTIONS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('TEMPLATE'))
    .map(f => path.join(REFLECTIONS_DIR, f));
  
  console.log(`📚 Found ${files.length} reflections to process`);
  console.log('');
  
  // Process each reflection
  const allMetadata = [];
  
  for (const file of files) {
    try {
      const metadata = processReflection(file);
      if (metadata) {
        allMetadata.push(metadata);
        console.log(`✅ ${metadata.file}`);
        console.log(`   Patterns: ${metadata.patterns.join(', ') || 'none'}`);
        console.log(`   Lessons: ${metadata.lessons.length}`);
        console.log(`   Code: ${metadata.codeSnippets.length} snippets`);
      }
    } catch (e) {
      console.log(`❌ Failed: ${path.basename(file)} - ${e}`);
    }
  }
  
  console.log('');
  console.log('📊 SUMMARY');
  console.log('==========');
  
  // Aggregate statistics
  const allPatterns = allMetadata.flatMap(m => m.patterns);
  const patternCounts = allPatterns.reduce((acc, p) => {
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Pattern frequency:');
  Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([p, count]) => {
      console.log(`  ${p}: ${count}`);
    });
  
  console.log('');
  console.log(`Total lessons extracted: ${allMetadata.reduce((sum, m) => sum + m.lessons.length, 0)}`);
  console.log(`Total code snippets: ${allMetadata.reduce((sum, m) => sum + m.codeSnippets.length, 0)}`);
  
  // Generate suggestions file
  console.log('');
  console.log('💾 Writing pattern suggestions...');
  
  const suggestions = allMetadata
    .filter(m => m.patterns.length > 0)
    .map(m => generatePatternSuggestion(m))
    .join('\n');
  
  const outputPath = path.join(REFLECTIONS_DIR, 'reflection-pattern-suggestions.md');
  fs.writeFileSync(outputPath, `# Pattern Suggestions from Reflections
  
Generated: ${new Date().toISOString()}

${suggestions || 'No patterns detected in current reflections.'}

---

## How to Use

1. Review patterns detected above
2. Add valid patterns to src/core/kernel-patterns.ts
3. Run tests to verify integration
4. Reflections → Kernel → Patterns → Learning

This is how the kernel grows from institutional knowledge.
`);

  console.log(`✅ Written to ${outputPath}`);
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Review: cat docs/reflections/reflection-pattern-suggestions.md');
  console.log('   2. Add patterns: Edit src/core/kernel-patterns.ts');
  console.log('   3. Test: npm test');
  console.log('   4. Commit: git add -A && git commit -m "docs: patterns from reflections"');
}

main();