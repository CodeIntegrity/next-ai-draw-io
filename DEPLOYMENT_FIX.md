# Deployment Configuration Fix

## Problem Descriptions

### 1. 404 Error Issue
The application was encountering a 404 error when deployed, specifically:
```
Error [AI_APICallError]: 
statusCode: 404
url: 'https://api.ajrsoft.com/v1/responses'
responseBody: '{"error":{"message":"","type":"bad_response_status_code","param":"","code":"bad_response_status_code"}}'
```

Root Cause: The deployment environment had OpenAI-compatible API configuration set with an invalid or inaccessible endpoint URL (`https://api.ajrsoft.com/v1`). The application was trying to use this endpoint instead of the default AWS Bedrock provider, resulting in 404 errors.

### 2. URL Validation Issue
The application was incorrectly rejecting valid OpenAI-compatible base URLs, specifically reporting:
```
OpenAI-compatible API is misconfigured: Invalid base URL format
```

Root Cause: Environment variables may contain surrounding quotes or extra whitespace depending on how they are set in different deployment platforms. The URL validation was not handling these cases properly.

### 3. Model Name Truncation Issue
The application was truncating model names when they contained quotes, resulting in errors like:
```
Model does not exist: Qwen/Qwen3-VL-32B-Thinkin
```
(Note: "Thinking" was truncated to "Thinkin")

Root Cause: The `OPENAI_COMPATIBLE_MODEL` environment variable could contain surrounding quotes that were not properly removed, causing the model name to be truncated or incorrectly parsed.

## Changes Made

### 1. Environment Variable Sanitization (`app/api/chat/route.ts`)

Renamed `cleanUrl()` to `cleanEnvVar()` and expanded its scope to handle all OpenAI-compatible environment variables:
- Trims whitespace from both ends of the value
- Removes surrounding single or double quotes that may be added by some deployment platforms
- Ensures consistent format regardless of how environment variables are set
- Applied to `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL`, and `OPENAI_COMPATIBLE_API_KEY`
- Applied consistently at both module initialization and request validation stages

### 2. Enhanced Configuration Validation

Comprehensive validation at the beginning of the POST handler:
- Validates that all required OpenAI-compatible variables are present together
- Checks URL format validity using the standard `URL` constructor
- Validates protocol is HTTP or HTTPS
- Returns clear error messages if configuration is incomplete
- Prevents initialization if API key is missing

### 3. Improved Debug Logging

Added detailed logging to diagnose configuration issues:
- Logs raw environment variable values (with JSON.stringify to show hidden characters)
- Logs processed/cleaned values for URL, model name, and API key
- Logs value lengths to detect encoding or truncation issues
- Logs URL validation results including protocol, hostname, and pathname
- Logs model name to ensure it's not truncated
- Logs error details when validation fails

### 4. Better Error Messages

Enhanced error reporting:
- Shows both raw and processed URL values when validation fails
- Includes specific error details from the URL validation
- Logs complete error details for debugging
- Detects 404 errors specifically
- Shows which provider (OpenAI-compatible or Bedrock) was being used
- Provides actionable error messages to users

### 5. Documentation Updates

Updated documentation to reflect the fixes:
- Explained the URL validation improvements
- Added troubleshooting guidance for URL format issues
- Clarified environment variable configuration requirements

## How to Fix Your Deployment

### Option 1: Remove OpenAI-Compatible Configuration (Recommended)

If you're not intentionally using a custom OpenAI-compatible endpoint:

1. Go to your deployment platform (Vercel, etc.)
2. Remove or unset these environment variables:
   - `OPENAI_COMPATIBLE_BASE_URL`
   - `OPENAI_COMPATIBLE_MODEL`
   - `OPENAI_COMPATIBLE_API_KEY`
3. Redeploy the application
4. The app will automatically use AWS Bedrock (default provider)

### Option 2: Configure OpenAI-Compatible API Correctly

If you want to use an OpenAI-compatible API like SiliconFlow, DeepSeek, or others:

1. Verify the endpoint is accessible:
   ```bash
   curl https://api.siliconflow.cn/v1/models
   ```

2. Ensure it supports OpenAI's API format (especially `/v1/chat/completions`)

3. Update your deployment environment variables:
   ```bash
   OPENAI_COMPATIBLE_BASE_URL=https://api.siliconflow.cn/v1
   OPENAI_COMPATIBLE_MODEL=Qwen/Qwen2.5-7B-Instruct
   OPENAI_COMPATIBLE_API_KEY=your-api-key
   ```

4. **Important Notes:**
   - All three variables MUST be set for it to work
   - Do NOT include quotes in the variable values on most platforms (Vercel, Railway, etc.)
   - The URL cleaning logic will automatically handle quotes if they're present
   - Make sure the URL starts with `http://` or `https://`
   - The URL should be the base endpoint (typically ending in `/v1`)

5. Redeploy and check the logs for confirmation

### Example Configurations

#### SiliconFlow
```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_COMPATIBLE_MODEL=Qwen/Qwen2.5-7B-Instruct
OPENAI_COMPATIBLE_API_KEY=your-siliconflow-key
```

#### DeepSeek
```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
OPENAI_COMPATIBLE_MODEL=deepseek-chat
OPENAI_COMPATIBLE_API_KEY=your-deepseek-key
```

#### Local Ollama
```bash
OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434/v1
OPENAI_COMPATIBLE_MODEL=llama2
OPENAI_COMPATIBLE_API_KEY=dummy-key
```

## Verification

After redeployment, check the logs for one of these messages:

**Using OpenAI-compatible:**
```
OpenAI-compatible configuration detected
Raw base URL: "https://api.siliconflow.cn/v1"
Processed base URL: "https://api.siliconflow.cn/v1"
Base URL length: 29
Raw model name: "Qwen/Qwen3-VL-32B-Thinking"
Processed model name: "Qwen/Qwen3-VL-32B-Thinking"
Model name length: 28
URL validation successful: { protocol: 'https:', hostname: 'api.siliconflow.cn', pathname: '/v1' }
Using OpenAI-compatible provider: https://api.siliconflow.cn/v1 with model: Qwen/Qwen3-VL-32B-Thinking
```

**Using default (Bedrock):**
```
Using AWS Bedrock provider with Claude Sonnet 4.5
```

## Additional Notes

- The application will now fail fast with clear error messages if the OpenAI-compatible configuration is incomplete
- Environment variable validation now handles quotes and whitespace automatically for all values (URL, model name, API key)
- Detailed debug logs show both raw and processed values to help diagnose issues
- Model name truncation is prevented by removing surrounding quotes
- 404 errors will show which endpoint was being called
- If configuration issues persist, the app will provide helpful error messages in the UI
- You can test locally first by setting these variables in `.env.local`

## Debugging Configuration Issues

If you see "Invalid base URL format" or "Model does not exist" errors, check the logs for:

1. **Raw values**: Shows exactly what was read from environment variables
2. **Processed values**: Shows what the values look like after cleaning
3. **Value lengths**: Helps identify encoding or hidden character issues
4. **Error details**: Shows the specific validation error

Example log output for debugging:
```
OpenAI-compatible configuration detected
Raw base URL: "\"https://api.siliconflow.cn/v1\""
Processed base URL: "https://api.siliconflow.cn/v1"
Base URL length: 29
Raw model name: "\"Qwen/Qwen3-VL-32B-Thinking\""
Processed model name: "Qwen/Qwen3-VL-32B-Thinking"
Model name length: 28
URL validation successful: {...}
```

## Support

If you continue to experience issues:
1. Check your deployment logs for the provider selection message and URL validation details
2. Verify all environment variables are set correctly (without quotes on most platforms)
3. Test the API endpoint independently with curl or Postman
4. Review the troubleshooting section in README.md
5. Look for the detailed debug logs that show raw vs processed URL values
