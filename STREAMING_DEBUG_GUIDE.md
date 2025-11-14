# Streaming Response Debugging Guide

## Overview

This application uses Server-Sent Events (SSE) for streaming AI responses. This guide explains how the streaming works and how to debug issues.

## How Streaming Works

### Backend (Server-Side)

1. **Request Processing** (`app/api/chat/route.ts`)
   - Receives the chat request from the client
   - Validates OpenAI-compatible configuration
   - Calls `streamText()` from the AI SDK
   - Returns SSE stream via `toUIMessageStreamResponse()`

2. **AI SDK Provider** 
   - The `createOpenAI()` function creates a provider with custom fetch
   - Custom fetch logs all outgoing requests and incoming responses
   - The AI SDK automatically sets `stream: true` for streaming requests

3. **Streaming Response**
   - Siliconflow (and other OpenAI-compatible APIs) returns SSE format
   - Each chunk: `data: {json_object}\n\n`
   - Final chunk: `data: [DONE]\n\n`

### Frontend (Client-Side)

1. **useChat Hook** (`components/chat-panel.tsx`)
   - Uses `@ai-sdk/react`'s `useChat` hook
   - Automatically handles SSE stream parsing
   - Updates messages in real-time as chunks arrive

## Debugging Logs

### Server-Side Logs

When a request is made, you should see the following logs in sequence:

```
=== OpenAI-compatible configuration detected ===
Raw base URL: "https://api.siliconflow.cn/v1"
Processed base URL: "https://api.siliconflow.cn/v1"
...

=== Starting streamText call ===
Provider: OpenAI-compatible
Model: Qwen/Qwen2.5-7B-Instruct
...

=== Outgoing API Request ===
URL: https://api.siliconflow.cn/v1/chat/completions
Method: POST
Request Body: { model: '...', stream: true, messages: ..., temperature: 0 }
Stream parameter set to: true

=== API Response Received ===
Status: 200 OK
Content-Type: text/event-stream
Transfer-Encoding: chunked
Is streaming response: true
✓ Streaming response detected - processing SSE stream

=== Preparing to stream response ===
Converting streamText result to UI message stream response
✓ Stream response prepared and returning to client
```

### Client-Side Logs

In the browser console, you should see:

```
=== Sending Message ===
Input: "Create a flowchart"
Files attached: 0
Sending message to API...
✓ Message sent, waiting for stream...

=== Chat Status Changed ===
Status: submitted
✓ Request submitted, waiting for response

=== Stream Finished ===
Final message: { ... }

=== Chat Status Changed ===
Status: ready
✓ Ready - awaiting user message
```

Note: Response headers and status are logged on the server side. Check server console for those details.

## Common Issues and Solutions

### Issue 1: No Response from Server

**Symptoms:**
- No logs appear in server console
- Client shows "awaiting_message" but no streaming starts

**Debugging:**
1. Check if `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY`, and `OPENAI_COMPATIBLE_MODEL` are set correctly
2. Look for validation errors in server logs
3. Verify the API endpoint is accessible

**Solution:**
- Ensure all three environment variables are set
- Test the API endpoint directly using `test-siliconflow-stream.js`

### Issue 2: Stream Starts But No Data

**Symptoms:**
- Server logs show "Outgoing API Request" and "API Response Received"
- `Is streaming response: true` is logged
- But no data appears in the client

**Debugging:**
1. Check if `stream: true` is set in the request body log
2. Verify `Content-Type: text/event-stream` in response headers
3. Check for errors in the stream processing

**Solution:**
- Review the custom fetch implementation
- Check if the SSE stream is being properly parsed
- Look for JavaScript errors in browser console

### Issue 3: Stream Interrupted

**Symptoms:**
- Stream starts successfully
- Stops mid-response with an error

**Debugging:**
1. Look for "=== Stream Error Occurred ===" logs
2. Check the error details and stack trace
3. Verify network connectivity

**Solution:**
- Check for timeout settings (OPENAI_COMPATIBLE_TIMEOUT)
- Ensure stable network connection
- Review API rate limits

### Issue 4: 404 or Other API Errors

**Symptoms:**
- Server logs show "API error (404)" or similar
- No streaming occurs

**Debugging:**
1. Verify the base URL is correct (should end with `/v1`)
2. Check if the model name is valid
3. Verify API key is correct

**Solution:**
- Test the endpoint: `curl -H "Authorization: Bearer YOUR_KEY" https://api.siliconflow.cn/v1/models`
- Ensure the base URL includes the version path
- Verify the model name matches the provider's available models

## Testing Streaming Manually

Use the provided test script to verify streaming works with your API:

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.siliconflow.cn/v1 \
OPENAI_COMPATIBLE_API_KEY=your-api-key \
OPENAI_COMPATIBLE_MODEL=Qwen/Qwen2.5-7B-Instruct \
node test-siliconflow-stream.js
```

Expected output:
```
=== Testing Siliconflow Streaming API ===
Base URL: https://api.siliconflow.cn/v1
Model: Qwen/Qwen2.5-7B-Instruct
...

=== Response Received ===
Status: 200 OK
Headers:
  Content-Type: text/event-stream
  Transfer-Encoding: chunked

=== Streaming Data ===
Chunk 1: { id: 'chatcmpl-...', ... }
Chunk 2: { id: 'chatcmpl-...', ... }
...
[DONE] Stream completed

=== Stream Ended ===
Total chunks received: 25
```

## Verifying the Fix

To verify that streaming is working correctly:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open browser console (F12)**

3. **Send a test message** like "Create a simple flowchart with 3 steps"

4. **Check the logs:**
   - Server console should show all the "===" headers with progress
   - Browser console should show streaming status changes
   - You should see the AI response appear incrementally in real-time

5. **Expected behavior:**
   - No long pauses or frozen states
   - Text appears word-by-word or sentence-by-sentence
   - Tool calls (diagram generation) execute immediately when complete
   - Final "awaiting_message" status after completion

## Additional Notes

### SSE Format

Siliconflow and OpenAI-compatible APIs use this SSE format:

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"...","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"...","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"...","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### Special Fields

Some providers (like Siliconflow) may include additional fields:
- `reasoning_content`: Internal reasoning/thinking process
- `tool_calls`: Function/tool call requests

The AI SDK handles these automatically.

### Timeout Configuration

The streaming route no longer enforces a fixed timeout. Long-running streams will continue until the provider completes the response.

## Support

If you continue to experience issues:

1. Enable all logging as described above
2. Capture the full log output (server and client)
3. Test with the provided `test-siliconflow-stream.js` script
4. Check the API provider's status page
5. Open an issue with the logs and test results
