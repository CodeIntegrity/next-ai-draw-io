# newapi Integration Debugging Guide

## Overview

This guide provides step-by-step instructions for debugging and fixing the newapi integration issue where the frontend has no response after input.

## Problem Description

- **Symptoms**: Frontend input has no response, no error logs, no feedback
- **Expected**: newapi (https://api.newapi.com/v1) should work as an OpenAI-compatible API
- **Configuration**: Uses OPENAI_COMPATIBLE_* environment variables

## Debugging Steps

### Step 1: Verify API Connectivity

First, verify that the newapi API is accessible and working:

```bash
# Test basic (non-streaming) endpoint
OPENAI_COMPATIBLE_BASE_URL=https://api.newapi.com/v1 \
OPENAI_COMPATIBLE_API_KEY=your-api-key \
OPENAI_COMPATIBLE_MODEL=gpt-4o-mini \
node test-newapi-basic.js
```

Expected output:
- Status: 200 OK
- Response with content
- "Success!" message

If this fails:
- Check if the base URL is correct
- Verify the API key is valid
- Confirm the model name is supported

### Step 2: Test Streaming Endpoint

Test the streaming API specifically:

```bash
# Test streaming endpoint
OPENAI_COMPATIBLE_BASE_URL=https://api.newapi.com/v1 \
OPENAI_COMPATIBLE_API_KEY=your-api-key \
OPENAI_COMPATIBLE_MODEL=gpt-4o-mini \
node test-newapi-stream.js
```

Expected output:
- Status: 200 OK
- Content-Type: text/event-stream
- Multiple chunks received
- Stream completed with [DONE]

If this fails:
- Check if streaming is supported
- Verify the response format matches OpenAI SSE format
- Look for any special headers required

### Step 3: Run Development Server with Detailed Logging

Start the development server and monitor the logs:

```bash
# Set environment variables
export OPENAI_COMPATIBLE_BASE_URL=https://api.newapi.com/v1
export OPENAI_COMPATIBLE_API_KEY=your-api-key
export OPENAI_COMPATIBLE_MODEL=gpt-4o-mini

# Start dev server
npm run dev
```

### Step 4: Send Test Message and Analyze Logs

1. Open the application in your browser
2. Open browser console (F12)
3. Open terminal with server logs
4. Send a simple message like "Create a flowchart with 3 steps"

### Step 5: Analyze Server Logs

Look for these log sections in sequence:

#### A. Configuration Detection
```
OpenAI-compatible configuration detected
Raw base URL: "https://api.newapi.com/v1"
Processed base URL: "https://api.newapi.com/v1"
...
```

✓ **Good**: Configuration is detected and validated
✗ **Bad**: If missing, check environment variables

#### B. streamText Initialization
```
=== Starting streamText call ===
Provider: OpenAI-compatible
Model: gpt-4o-mini
Base URL: https://api.newapi.com/v1
...
Calling streamText()...
✓ streamText() called successfully
```

✓ **Good**: streamText is called without errors
✗ **Bad**: If error, check the error message

#### C. Outgoing API Request
```
=== Outgoing API Request ===
URL: https://api.newapi.com/v1/chat/completions
Method: POST
Headers: {...}
Request Body: { model: '...', stream: true, ... }
Stream parameter set to: true
Making fetch request...
```

✓ **Good**: Request is being made with correct parameters
✗ **Bad**: If URL or parameters are wrong, there's a configuration issue

#### D. API Response
```
=== API Response Received ===
Status: 200 OK
Content-Type: text/event-stream
All Response Headers:
  content-type: text/event-stream
  transfer-encoding: chunked
Is streaming response: true
✓ Streaming response detected - processing SSE stream
Stream reading started
```

✓ **Good**: Response is received and streaming is detected
✗ **Bad**: If status is not 200, check error body in logs

#### E. Stream Chunks
```
Chunk 1: data: {"id":"...","object":"chat.completion.chunk",...}
Chunk 2: data: {"id":"...","object":"chat.completion.chunk",...}
...
Stream complete. Total chunks: XX
```

✓ **Good**: Chunks are being received
✗ **Bad**: If no chunks, the stream is not working

#### F. Response Preparation
```
=== Preparing to stream response ===
Converting streamText result to UI message stream response
✓ toUIMessageStreamResponse() called successfully
✓ Stream response prepared and returning to client
```

✓ **Good**: Response is ready to send to client
✗ **Bad**: If error, check the error details

### Step 6: Analyze Browser Console Logs

Look for these messages:

```
=== Sending Message ===
Input: "Create a flowchart with 3 steps"
Sending message to API...
✓ Message sent, waiting for stream...

=== Chat Status Changed ===
Status: submitted
✓ Request submitted, waiting for response

=== Stream Finished ===
Final message: {...}

=== Chat Status Changed ===
Status: ready
✓ Ready - awaiting user message
```

## Common Issues and Solutions

### Issue 1: No Response from Server

**Symptoms:**
- Server logs stop after "Starting streamText call"
- No outgoing API request is made

**Possible Causes:**
- streamText() is hanging
- Network connectivity issue
- API endpoint is unreachable

**Solutions:**
1. Check network connectivity to newapi.com
2. Verify DNS resolution works
3. Check if there are any firewall rules blocking the connection
4. Try with a different network or VPN

### Issue 2: API Returns Error

**Symptoms:**
- Server logs show "Error Response"
- Status is not 200

**Possible Causes:**
- Invalid API key
- Invalid model name
- Rate limiting
- API is down

**Solutions:**
1. Verify API key is correct
2. Check if the model name is valid (try gpt-4o-mini, gpt-4o, gpt-3.5-turbo)
3. Check newapi status page
4. Try the test scripts to isolate the issue

### Issue 3: Stream Starts But No Data

**Symptoms:**
- Server logs show "Streaming response detected"
- No chunks are logged
- Browser shows "submitted" status indefinitely

**Possible Causes:**
- newapi's streaming format is different from expected
- The AI SDK is not parsing the chunks correctly
- There's a compatibility issue with the SSE format

**Solutions:**
1. Compare the raw chunk format from test script with expected format
2. Check if newapi uses a different SSE format (e.g., different delimiters)
3. Verify that the AI SDK version supports newapi

### Issue 4: Authentication or Header Issues

**Symptoms:**
- 401 Unauthorized error
- 403 Forbidden error

**Possible Causes:**
- API key is incorrect or expired
- Authorization header format is wrong
- Additional headers are required

**Solutions:**
1. Verify API key with test scripts
2. Check newapi documentation for required headers
3. Compare headers in test script (working) vs application (not working)

## Enhanced Logging

The application now includes comprehensive logging:

1. **Request Details**: Full request headers and body
2. **Response Details**: All response headers and status
3. **Stream Chunks**: Each chunk received from the stream
4. **Error Details**: Detailed error messages and stack traces

All logs are prefixed with `===` for easy filtering.

## Manual curl Test

You can also test newapi manually with curl:

```bash
curl -X POST https://api.newapi.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

This should return a stream of SSE events.

## Expected SSE Format

newapi (as an OpenAI-compatible API) should return SSE events in this format:

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4o-mini","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4o-mini","choices":[{"index":0,"delta":{"content":" there"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-4o-mini","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

## Next Steps

If the issue persists after following this guide:

1. Capture full server and client logs
2. Run all test scripts and capture output
3. Compare the working test script output with application behavior
4. Check if there are any differences in request/response format
5. Contact newapi support for any API-specific requirements

## Configuration Reference

Required environment variables:

```env
OPENAI_COMPATIBLE_BASE_URL=https://api.newapi.com/v1
OPENAI_COMPATIBLE_MODEL=gpt-4o-mini
OPENAI_COMPATIBLE_API_KEY=your-api-key-here
```

## Useful Commands

```bash
# Test basic connectivity
node test-newapi-basic.js

# Test streaming
node test-newapi-stream.js

# Run development server with logs
npm run dev

# Check environment variables
env | grep OPENAI_COMPATIBLE
```
