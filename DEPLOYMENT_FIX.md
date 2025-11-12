# Deployment 404 Error Fix

## Problem Description

The application was encountering a 404 error when deployed, specifically:
```
Error [AI_APICallError]: 
statusCode: 404
url: 'https://api.ajrsoft.com/v1/responses'
responseBody: '{"error":{"message":"","type":"bad_response_status_code","param":"","code":"bad_response_status_code"}}'
```

## Root Cause

The deployment environment had OpenAI-compatible API configuration set with an invalid or inaccessible endpoint URL (`https://api.ajrsoft.com/v1`). The application was trying to use this endpoint instead of the default AWS Bedrock provider, resulting in 404 errors.

## Changes Made

### 1. Enhanced Configuration Validation (`app/api/chat/route.ts`)

Added comprehensive validation at the beginning of the POST handler:
- Validates that all required OpenAI-compatible variables are present together
- Checks URL format validity
- Returns clear error messages if configuration is incomplete
- Prevents initialization if API key is missing

### 2. Improved Error Handling

Enhanced the error handler to provide detailed information:
- Logs complete error details for debugging
- Detects 404 errors specifically
- Shows which provider (OpenAI-compatible or Bedrock) was being used
- Provides actionable error messages to users

### 3. Better Logging

Added logging to track which AI provider is being used:
- Logs the selected provider and model at request time
- Helps identify configuration issues in deployment logs
- Makes debugging easier in production environments

### 4. Documentation Updates (`README.md`)

Added comprehensive documentation:
- Clear instructions for OpenAI-compatible API configuration
- Requirements and prerequisites
- New troubleshooting section specifically for 404 errors
- Step-by-step debugging guide

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

### Option 2: Fix the OpenAI-Compatible Configuration

If you want to use `https://api.ajrsoft.com`:

1. Verify the endpoint is accessible:
   ```bash
   curl https://api.ajrsoft.com/v1/models
   ```

2. Ensure it supports OpenAI's API format (especially `/v1/chat/completions`)

3. Update your deployment environment variables:
   ```bash
   OPENAI_COMPATIBLE_BASE_URL="https://api.ajrsoft.com/v1"
   OPENAI_COMPATIBLE_MODEL="your-model-name"
   OPENAI_COMPATIBLE_API_KEY="your-api-key"
   ```

4. All three variables MUST be set for it to work

5. Redeploy and check the logs for confirmation

## Verification

After redeployment, check the logs for one of these messages:

**Using OpenAI-compatible:**
```
Using OpenAI-compatible provider: https://api.ajrsoft.com/v1 with model: model-name
```

**Using default (Bedrock):**
```
Using AWS Bedrock provider with Claude Sonnet 4.5
```

## Additional Notes

- The application will now fail fast with clear error messages if the OpenAI-compatible configuration is incomplete
- 404 errors will show which endpoint was being called
- If configuration issues persist, the app will provide helpful error messages in the UI
- You can test locally first by setting these variables in `.env.local`

## Support

If you continue to experience issues:
1. Check your deployment logs for the provider selection message
2. Verify all environment variables are set correctly
3. Test the API endpoint independently with curl or Postman
4. Review the troubleshooting section in README.md
