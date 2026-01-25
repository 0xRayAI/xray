#!/usr/bin/env node

/**
 * StringRay AI v2.0.0 - Self-Direction Activation Script
 *
 * Initializes and activates the framework's autonomous self-direction capabilities.
 * This script brings the StringRay Framework from reactive tool to proactive intelligence.
 */

import { selfDirectionSystem } from './src/self-direction-activation.js';

async function main() {
  console.log('🚀 StringRay AI v2.0.0 - Self-Direction Activation');
  console.log('================================================');
  console.log('');

  try {
    console.log('📊 Current System Status:');
    const status = selfDirectionSystem.getStatus();
    console.log(`   Monitoring: ${status.activeMonitoring ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   Learning: ${status.activeLearning ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   Components: ${Object.keys(status.componentsHealth).length} registered`);
    console.log('');

    console.log('🔧 Phase 1: Activating Self-Monitoring Foundation...');
    await selfDirectionSystem.activateSelfMonitoring();
    console.log('');

    console.log('🧠 Phase 2: Activating Self-Evolution Learning...');
    await selfDirectionSystem.activateSelfEvolution();
    console.log('');

    console.log('📈 Final System Status:');
    const finalStatus = selfDirectionSystem.getStatus();
    console.log(`   Monitoring: ${finalStatus.activeMonitoring ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   Learning: ${finalStatus.activeLearning ? '✅ Active' : '❌ Inactive'}`);
    console.log('');

    console.log('🎉 Self-Direction Activation Complete!');
    console.log('');
    console.log('The StringRay Framework is now operating with autonomous capabilities.');
    console.log('Continuous self-monitoring, learning, and improvement are active.');
    console.log('');
    console.log('Monitor progress with: npm run self-direction:status');
    console.log('View metrics with: npm run self-direction:metrics');

  } catch (error) {
    console.error('❌ Self-Direction Activation Failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received shutdown signal...');
  await selfDirectionSystem.shutdown();
  console.log('✅ Self-direction system shutdown complete.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received termination signal...');
  await selfDirectionSystem.shutdown();
  console.log('✅ Self-direction system shutdown complete.');
  process.exit(0);
});

// Run the activation
main().catch((error) => {
  console.error('💥 Fatal error during activation:', error);
  process.exit(1);
});