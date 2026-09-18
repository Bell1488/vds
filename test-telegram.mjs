#!/usr/bin/env node
import {SocksProxyAgent} from 'socks-proxy-agent';
import https from 'node:https';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

const SOCKS_PROXY = process.env.SOCKS5_PROXY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('=== Telegram Connection Test ===\n');

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

if (!CHAT_ID) {
  console.error('⚠️  TELEGRAM_CHAT_ID not set in .env (only bot info will be tested)');
}

console.log(`Using proxy: ${SOCKS_PROXY || 'NONE (direct connection)'}`);
console.log('');

// Setup proxy if configured. Native fetch does not understand Node's `agent`
// option, so use https.request below for SOCKS5 connections.
let proxyAgent;
if (SOCKS_PROXY) {
  try {
    proxyAgent = new SocksProxyAgent(SOCKS_PROXY);
    console.log('✓ SOCKS5 proxy agent initialized');
  } catch (error) {
    console.error('❌ Failed to initialize proxy:', error.message);
    process.exit(1);
  }
}

function telegramRequest(method, payload = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      agent: proxyAgent,
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)},
      timeout: 10000
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = JSON.parse(text); } catch { return reject(new Error(`Invalid response (${response.statusCode})`)); }
        if (response.statusCode < 200 || response.statusCode >= 300 || !data.ok) {
          return reject(new Error(`Telegram HTTP ${response.statusCode}: ${data.description || 'request failed'}`));
        }
        resolve(data);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Request timed out')));
    request.on('error', reject);
    request.end(body);
  });
}

// Test 1: Get bot info
console.log('\n--- Test 1: Get Bot Info ---');
try {
  const data = await telegramRequest('getMe');

  if (data.ok) {
    console.log('✅ Bot is accessible!');
    console.log(`   Bot: @${data.result.username}`);
    console.log(`   Name: ${data.result.first_name}`);
    console.log(`   ID: ${data.result.id}`);
  } else {
    console.error('❌ Telegram API returned error:', data);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  if (error.cause) {
    console.error('   Cause:', error.cause.message);
  }
  console.log('\nTroubleshooting:');
  console.log('1. Check that SOCKS5 proxy is running (if configured)');
  console.log('2. Verify BOT_TOKEN is correct');
  console.log('3. Test proxy: curl -x socks5h://127.0.0.1:1080 https://api.telegram.org');
  process.exit(1);
}

// Test 2: Send test message
if (CHAT_ID) {
  console.log('\n--- Test 2: Send Test Message ---');
  try {
    const message = '🧪 <b>Test message from VDS Logistic</b>\n\n' +
      'This is a test message to verify Telegram integration.\n' +
      `Time: ${new Date().toISOString()}`;

    const data = await telegramRequest('sendMessage', {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });

    if (data.ok) {
      console.log('✅ Test message sent successfully!');
      console.log(`   Message ID: ${data.result.message_id}`);
      console.log(`   Chat: ${data.result.chat.id}`);
    } else {
      console.error('❌ Failed to send message:', data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause.message);
    }
    process.exit(1);
  }
}

console.log('\n=== All Tests Passed! ===\n');
console.log('Your Telegram integration is working correctly.');
console.log('You can now start receiving leads from the website.\n');
