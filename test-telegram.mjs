#!/usr/bin/env node
import {SocksProxyAgent} from 'socks-proxy-agent';
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

// Setup proxy if configured
const fetchOptions = {};
if (SOCKS_PROXY) {
  try {
    fetchOptions.agent = new SocksProxyAgent(SOCKS_PROXY);
    console.log('✓ SOCKS5 proxy agent initialized');
  } catch (error) {
    console.error('❌ Failed to initialize proxy:', error.message);
    process.exit(1);
  }
}

// Test 1: Get bot info
console.log('\n--- Test 1: Get Bot Info ---');
try {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
    {...fetchOptions, signal: AbortSignal.timeout(10000)}
  );

  if (!response.ok) {
    console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
    process.exit(1);
  }

  const data = await response.json();

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

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        ...fetchOptions,
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error('   Response:', text);
      process.exit(1);
    }

    const data = await response.json();

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
