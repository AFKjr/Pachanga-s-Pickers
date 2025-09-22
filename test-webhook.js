// test-webhook.js
// Simple test script for the FTN webhook

import fetch from 'node-fetch';

const WEBHOOK_URL = 'http://localhost:3001';
const API_KEY = process.env.RELEVANCE_API_KEY || 'your-relevance-api-key-here';

async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await fetch(`${WEBHOOK_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check response:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testFTNTest() {
  console.log('🧪 Testing FTN test endpoint...');
  try {
    const response = await fetch(`${WEBHOOK_URL}/api/ftn-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    console.log('📊 FTN test response:', data);
    return data.success;
  } catch (error) {
    console.error('❌ FTN test failed:', error.message);
    return false;
  }
}

async function testWebhook() {
  console.log('🔗 Testing webhook endpoint...');
  try {
    const response = await fetch(`${WEBHOOK_URL}/api/ftn-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        dataType: 'injuries',
        week: '3'
      })
    });
    const data = await response.json();
    console.log('📋 Webhook response:', data);
    return data.success;
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting webhook tests...\n');
  
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (healthOk) {
    const ftnTestOk = await testFTNTest();
    console.log('');
    
    if (ftnTestOk) {
      await testWebhook();
    } else {
      console.log('⚠️ Skipping webhook test due to FTN test failure');
    }
  } else {
    console.log('⚠️ Server not responding, skipping other tests');
  }
  
  console.log('\n✅ Test suite completed');
}

runTests();