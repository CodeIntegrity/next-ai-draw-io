// Test script to verify Siliconflow streaming API
// Usage: node test-siliconflow-stream.js

const https = require('https');

const baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL || 'https://api.siliconflow.cn/v1';
const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY || '';
const model = process.env.OPENAI_COMPATIBLE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

if (!apiKey) {
  console.error('Error: OPENAI_COMPATIBLE_API_KEY environment variable is required');
  process.exit(1);
}

console.log('=== Testing Siliconflow Streaming API ===');
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
  stream: true,
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
    'Accept': 'text/event-stream'
  }
};

console.log('Making request to:', url.toString());
console.log('');

const req = https.request(url, options, (res) => {
  console.log('=== Response Received ===');
  console.log('Status:', res.statusCode, res.statusMessage);
  console.log('Headers:');
  console.log('  Content-Type:', res.headers['content-type']);
  console.log('  Transfer-Encoding:', res.headers['transfer-encoding']);
  console.log('');

  if (res.statusCode !== 200) {
    console.error('Error: Non-200 status code');
    res.on('data', (chunk) => {
      console.error('Error body:', chunk.toString());
    });
    return;
  }

  console.log('=== Streaming Data ===');
  let buffer = '';
  let chunkCount = 0;

  res.on('data', (chunk) => {
    const text = chunk.toString();
    buffer += text;

    // Process complete SSE messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        if (data === '[DONE]') {
          console.log('[DONE] Stream completed');
        } else {
          try {
            const parsed = JSON.parse(data);
            chunkCount++;
            console.log(`Chunk ${chunkCount}:`, {
              id: parsed.id,
              created: parsed.created,
              model: parsed.model,
              choices: parsed.choices?.map(c => ({
                index: c.index,
                delta: c.delta,
                finish_reason: c.finish_reason
              }))
            });
          } catch (e) {
            console.log('Raw data:', data);
          }
        }
      }
    }
  });

  res.on('end', () => {
    console.log('');
    console.log('=== Stream Ended ===');
    console.log('Total chunks received:', chunkCount);
  });

  res.on('error', (err) => {
    console.error('=== Stream Error ===');
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
