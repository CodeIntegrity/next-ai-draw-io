# Logging Configuration

This application supports configurable logging through the `LOG_LEVEL` environment variable.

## Log Levels

The logging system supports four levels, listed from most to least verbose:

- **debug**: Shows all logs including detailed debugging information
- **info**: Shows info, warnings, and errors
- **warn**: Shows warnings and errors only
- **error**: Shows only errors (default)

## Configuration

Set the `LOG_LEVEL` environment variable in your `.env` file:

```bash
# Default - only show errors
LOG_LEVEL=error

# Show warnings and errors
LOG_LEVEL=warn

# Show info, warnings, and errors
LOG_LEVEL=info

# Show all logs including detailed debugging
LOG_LEVEL=debug
```

## Log Usage in Code

The application uses a unified logging system:

```typescript
import { logger } from '@/lib/logger';

// Error logs - always shown
logger.error('This is an error message');

// Warning logs - shown at warn level and above
logger.warn('This is a warning message');

// Info logs - shown at info level and above
logger.info('This is an info message');

// Debug logs - shown only at debug level
logger.debug('This is a debug message');
```

## What Gets Logged

### Error Level (always shown)
- API connection failures
- Configuration errors
- Application crashes
- Fatal errors

### Warning Level (warn and above)
- Missing configuration values
- API error responses
- Failed operations

### Info Level (info and above)
- Stream completion
- Provider selection
- Configuration detection
- Response preparation

### Debug Level (debug only)
- Detailed API request/response information
- Request headers and bodies
- Response headers and chunks
- Stream processing details
- Chat status changes
- Message sending details

## Default Behavior

By default (`LOG_LEVEL=error`), the application only outputs error messages, keeping the logs clean during normal operation. When debugging is needed, set `LOG_LEVEL=debug` to see comprehensive logging information.