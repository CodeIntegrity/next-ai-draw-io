// Test script to verify newapi basic API (non-streaming)
// Usage: node test-newapi-basic.js

const https = require('https');

const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL || 'https://api.newapi.com/v1';
const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY || '';
const model = process.env.OPENAI_COMPATIBLE_MODEL || 'gpt-4o-mini';

if (!apiKey) {
  console.error('Error: OPENAI_COMPATIBLE_API_KEY environment variable is required');
  process.exit(1);
}

console.log('=== Testing newapi Basic API (Non-Streaming) ===');
console.log('Base URL:', baseUrl);
console.log('Model:', model);
console.log('API Key:', apiKey.substring(0, 10) + '...');
console.log('');

const url = new URL('/chat/completions', baseUrl);

const requestBody = JSON.stringify({
  model: model,
  messages: [
    { role: 'user', content: 'Say hello in one sentence.' }
  ],
  stream: false,
  temperature: 0.7
});

console.log('Request Body:');
console.log(requestBody);
console.log('');

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json'
  }
};

console.log('Making request to:', url.toString());
console.log('Request headers:', JSON.stringify(options.headers, null, 2));
console.log('');

const req = https.request(url, options, (res) => {
  console.log('=== Response Received ===');
  console.log('Status:', res.statusCode, res.statusMessage);
  console.log('All Response Headers:');
  Object.entries(res.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log('');

  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk.toString();
  });

  res.on('end', () => {
    console.log('=== Response Body ===');
    try {
      const parsed = JSON.parse(responseBody);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.choices && parsed.choices.length > 0) {
        console.log('');
        console.log('=== Success! ===');
        console.log('Response content:', parsed.choices[0].message.content);
      }
    } catch (e) {
      console.log('Raw response:', responseBody);
      console.error('Parse error:', e.message);
    }
  });

  res.on('error', (err) => {
    console.error('=== Response Error ===');
    console.error(err);
  });
});

req.on('error', (err) => {
  console.error('=== Request Error ===');
  console.error(err);
});

req.write(requestBody);
req.end();

// Timeout after 30 seconds
setTimeout(() => {
  console.log('');
  console.log('Test timeout after 30 seconds');
  process.exit(0);
}, 30000);
