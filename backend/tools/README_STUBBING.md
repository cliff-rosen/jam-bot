# Tool Stubbing System

This document describes the tool stubbing system for JamBot, which allows tools to return predefined responses during testing and development instead of making actual external API calls.

## Overview

The tool stubbing system provides:
- **Non-intrusive testing**: Stub responses without modifying production code
- **Realistic simulation**: Sample responses that match actual tool output schemas
- **Flexible configuration**: Global and per-tool stubbing controls
- **Error simulation**: Test error handling with configurable failure rates
- **Development-friendly**: Easy setup for local development without external dependencies

## Quick Start

### Enable Stubbing

Set environment variables in your `.env` file:

```bash
# Enable tool stubbing
TOOL_STUBBING_ENABLED=true

# Stub all tools (options: "all", "external_only", "none")
TOOL_STUBBING_MODE=all

# Simulate realistic delays (milliseconds)
TOOL_STUBBING_DELAY_MS=500

# Simulate failures for error handling testing (0.0 to 1.0)
TOOL_STUBBING_FAILURE_RATE=0.0
```

### Run Tests

```bash
# Run the stubbing validation tests
cd backend
python tools/test_stubbing.py
```

## Configuration

### Environment Variables

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `TOOL_STUBBING_ENABLED` | Enable/disable stubbing globally | `false` | `true`, `false` |
| `TOOL_STUBBING_MODE` | Which tools to stub | `all` | `all`, `external_only`, `none` |
| `TOOL_STUBBING_DELAY_MS` | Simulated delay in milliseconds | `500` | Any positive integer |
| `TOOL_STUBBING_FAILURE_RATE` | Probability of simulated failures | `0.0` | `0.0` to `1.0` |

### Stubbing Modes

- **`all`**: Stub all tools that have stub configurations
- **`external_only`**: Only stub tools that make external API calls
- **`none`**: Disable stubbing (same as `TOOL_STUBBING_ENABLED=false`)

### Programmatic Configuration

```python
from tools.tool_stubbing import enable_stubbing, set_stubbing_mode, set_failure_rate

# Enable stubbing
enable_stubbing()

# Set mode
set_stubbing_mode("external_only")

# Set failure rate for testing error handling
set_failure_rate(0.1)  # 10% failure rate
```

## Tool Configuration

### Adding Stub Configuration to Tools

Tools are configured in `tools.json` with a `stub_config` section:

```json
{
  "id": "my_tool",
  "name": "My Tool",
  "description": "Example tool with stubbing",
  "parameters": [...],
  "outputs": [...],
  "stub_config": {
    "enabled": true,
    "default_scenario": "success",
    "requires_external_calls": true,
    "sample_responses": [
      {
        "scenario": "success",
        "outputs": {
          "result": "Sample successful result",
          "count": 1
        },
        "metadata": {
          "processing_time_ms": 150
        }
      },
      {
        "scenario": "empty",
        "outputs": {
          "result": null,
          "count": 0
        }
      },
      {
        "scenario": "error",
        "is_error": true,
        "error_message": "Sample error message",
        "outputs": {}
      }
    ]
  }
}
```

### Stub Configuration Fields

- **`enabled`**: Whether stubbing is enabled for this tool
- **`default_scenario`**: Default scenario to use when no specific scenario is requested
- **`requires_external_calls`**: Whether this tool makes external API calls (affects `external_only` mode)
- **`sample_responses`**: Array of sample response configurations

### Sample Response Fields

- **`scenario`**: Name of the scenario (e.g., "success", "empty", "error")
- **`outputs`**: Sample output data matching the tool's output schema
- **`metadata`**: Additional metadata for the response
- **`is_error`**: Whether this represents an error response (default: false)
- **`error_message`**: Error message if this is an error response

## Handler Integration

### Using the Stub Decorator

Apply the `@create_stub_decorator` to tool handlers:

```python
from tools.tool_stubbing import create_stub_decorator

@create_stub_decorator("my_tool")
async def handle_my_tool(input: ToolExecutionInput) -> Dict[str, Any]:
    """
    Tool handler with stubbing support.
    When stubbing is enabled, this function won't be called.
    """
    # Actual implementation here
    return {"result": "real_result"}
```

### Manual Stubbing Check

For more control, check stubbing manually:

```python
from tools.tool_stubbing import ToolStubbing
from tools.tool_registry import get_tool_definition

async def handle_my_tool(input: ToolExecutionInput) -> Dict[str, Any]:
    tool_def = get_tool_definition("my_tool")
    
    # Check if we should stub
    if ToolStubbing.should_stub_tool(tool_def):
        return await ToolStubbing.get_stub_response(tool_def, input)
    
    # Actual implementation
    return {"result": "real_result"}
```

## Response Processing

The stubbing system can modify responses based on input parameters:

### Query Reflection
For search tools, query terms are reflected in response snippets:

```python
# Input: {"query": "machine learning"}
# Output: email snippets contain "...machine learning..."
```

### Parameter Respect
Parameters like `max_results` are respected:

```python
# Input: {"max_results": 5}
# Output: Arrays limited to 5 items
```

### Dynamic Metadata
Responses include stubbing metadata:

```python
{
  "outputs": {...},
  "_stubbed": true,
  "_scenario": "success",
  "_timestamp": "2024-01-15T10:30:00Z"
}
```

## Testing

### Running Tests

```bash
# Run all stubbing tests
python tools/test_stubbing.py

# Run specific backend tests
python -m pytest tests/ -k "stub"
```

### Test Scenarios

The system includes tests for:
- Basic stubbing functionality
- Different stubbing modes
- Error scenario handling
- Response processing
- Configuration management

### Writing Tests

```python
import pytest
from tools.tool_stubbing import enable_stubbing, set_stubbing_mode

@pytest.fixture
def stubbed_environment():
    """Setup stubbing for tests."""
    enable_stubbing()
    set_stubbing_mode("all")
    yield
    # Cleanup happens automatically

async def test_my_tool_with_stubbing(stubbed_environment):
    """Test tool with stubbing enabled."""
    # Your test code here
    pass
```

## Best Practices

### Tool Design

1. **Comprehensive Scenarios**: Include success, empty, error, and edge case scenarios
2. **Realistic Data**: Use realistic sample data that matches production patterns
3. **Schema Compliance**: Ensure sample responses match declared output schemas
4. **Error Coverage**: Include various error scenarios (auth, quota, network, etc.)

### Testing Strategy

1. **Isolated Testing**: Use stubbing to test business logic without external dependencies
2. **Error Handling**: Test error scenarios with different failure rates
3. **Performance Testing**: Use consistent delays to test timeout handling
4. **Integration Testing**: Disable stubbing for full integration tests

### Development Workflow

1. **Local Development**: Enable stubbing to avoid external API setup
2. **CI/CD**: Use stubbing in automated tests for reliability
3. **Staging**: Mix stubbing and real calls for comprehensive testing
4. **Production**: Always disable stubbing

## Extending the System

### Adding New Tools

1. **Define Output Schema**: Ensure tools have complete output schemas
2. **Create Sample Responses**: Add realistic sample responses for all scenarios
3. **Apply Decorator**: Use `@create_stub_decorator` on handlers
4. **Test Coverage**: Add tests for all scenarios

### Custom Response Processing

Extend `ToolStubbing._process_sample_outputs()` for custom response processing:

```python
@staticmethod
def _process_sample_outputs(sample_outputs, input_params, tool_def):
    processed = sample_outputs.copy()
    
    # Custom processing logic here
    if tool_def.id == "my_special_tool":
        # Special processing for this tool
        pass
    
    return processed
```

### New Stubbing Modes

Add new modes by extending `ToolStubbing.should_stub_tool()`:

```python
def should_stub_tool(tool_def: ToolDefinition) -> bool:
    # ... existing logic ...
    
    elif settings.TOOL_STUBBING_MODE == "my_custom_mode":
        return my_custom_logic(tool_def)
```

## Troubleshooting

### Common Issues

1. **Stubbing Not Working**
   - Check `TOOL_STUBBING_ENABLED=true`
   - Verify tool has `stub_config` in tools.json
   - Ensure handler uses `@create_stub_decorator`

2. **Schema Validation Errors**
   - Verify sample responses match output schemas
   - Check for missing required fields
   - Validate data types

3. **Import Errors**
   - Ensure tool registry is loaded: `refresh_tool_registry()`
   - Check module imports and paths

### Debug Mode

Enable debug logging to see stubbing decisions:

```python
import logging
logging.getLogger('tools.tool_stubbing').setLevel(logging.DEBUG)
```

## Future Enhancements

- **Scenario Selection**: Web UI for selecting scenarios during development
- **Response Recording**: Record real responses to generate sample data
- **Schema Validation**: Automatic validation of sample responses against schemas
- **Performance Profiling**: Detailed timing and performance metrics
- **Conditional Stubbing**: Stub based on input parameters or conditions

## Examples

See the test file `tools/test_stubbing.py` for comprehensive examples of using the stubbing system.

The `email_search` tool in `tools_with_samples.json` provides a complete example of stub configuration. 