#!/usr/bin/env node

console.log('Testing basic functions...');

const log = (msg) => console.log(msg);
const error = (msg) => console.error(`❌ ${msg}`);

log('✅ log function works');
error('✅ error function works');

console.log('✅ Basic function test completed');