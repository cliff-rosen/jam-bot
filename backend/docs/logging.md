# Server-Side Logging System

This document describes the logging system implemented in the Orchestrator backend.

## Overview

The logging system is designed to provide comprehensive, structured logging with the following features:

- **Request ID Tracking**: Each request is assigned a unique ID that is propagated through all logs related to that request
- **Structured Logging**: Logs can be output in JSON format for easy parsing by log aggregation tools
- **Performance Monitoring**: Automatic tracking of slow operations and function execution times
- **Sensitive Data Masking**: Automatic masking of sensitive information in logs
- **Log Rotation**: Daily log rotation with configurable retention
- **Comprehensive Request/Response Logging**: Detailed logging of HTTP requests and responses

## Configuration

Logging configuration is managed through settings in `config/settings.py`:

| Setting | Description | Default |
|---------|-------------|---------|
| `LOG_LEVEL` | Minimum log level to record | `"DEBUG"` |
| `LOG_DIR` | Directory where logs are stored | `"logs"` |
| `LOG_FILENAME_PREFIX` | Prefix for log filenames | `"app"` |
| `LOG_BACKUP_COUNT` | Number of log files to retain | `10` |
| `LOG_FORMAT` | Log format (`"standard"` or `"json"`) | `"standard"` |
| `LOG_REQUEST_BODY` | Whether to log request bodies | `False` |
| `LOG_RESPONSE_BODY` | Whether to log response bodies | `False` |
| `LOG_SENSITIVE_FIELDS` | Fields to mask in logs | `["password", "token", "secret", "key", "authorization"]` |
| `LOG_PERFORMANCE_THRESHOLD_MS` | Threshold for slow operation warnings (ms) | `500` |

## Usage

### Basic Logging

```python
import logging

logger = logging.getLogger(__name__)

# Log levels
logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
logger.critical("Critical message")

# With extra context
logger.info("Message with context", extra={"user_id": 123, "action": "login"})
```

### Request ID Access

In route handlers, you can access the request ID from the request state:

```python
@router.get("/example")
async def example_route(request: Request):
    request_id = request.state.request_id
    logger.info("Processing example route", extra={"request_id": request_id})
    return {"message": "Example"}
```

### Performance Monitoring

#### Function Decorator

```python
from utils import performance_logger

@performance_logger
def my_function():
    # Function code here
    pass

@performance_logger
async def my_async_function():
    # Async function code here
    pass
```

#### Context Manager

```python
from utils import log_performance

def some_function():
    # Regular code
    
    with log_performance("database_operation", request_id="123"):
        # Code to measure performance
        result = db.execute_query()
    
    # More code
```

## Log Format

### Standard Format

When `LOG_FORMAT` is set to `"standard"`, logs are formatted as:

```
2025-03-05 12:34:56,789 - INFO - [request-id] - logger.name - Message
```

### JSON Format

When `LOG_FORMAT` is set to `"json"`, logs are formatted as JSON objects:

```json
{
  "timestamp": "2025-03-05 12:34:56,789",
  "level": "INFO",
  "logger": "logger.name",
  "request_id": "request-id",
  "message": "Message",
  "module": "module_name",
  "function": "function_name",
  "line": 123,
  "additional_field": "value"
}
```

## Best Practices

1. **Use Appropriate Log Levels**:
   - `DEBUG`: Detailed information for debugging
   - `INFO`: Confirmation that things are working as expected
   - `WARNING`: Indication that something unexpected happened, but the application is still working
   - `ERROR`: Due to a more serious problem, the application has not been able to perform a function
   - `CRITICAL`: A serious error indicating that the application itself may be unable to continue running

2. **Include Context**:
   - Always include relevant context in logs using the `extra` parameter
   - For user-related operations, include user identifiers
   - For database operations, include operation type and affected entities

3. **Sensitive Information**:
   - Never log sensitive information like passwords or tokens
   - Use the sensitive fields configuration to mask sensitive data

4. **Performance Logging**:
   - Use the performance utilities for any operation that might be slow
   - Set appropriate thresholds for your application's performance requirements

5. **Error Logging**:
   - Include detailed error information in logs
   - Use `logger.exception()` to automatically include stack traces for exceptions 