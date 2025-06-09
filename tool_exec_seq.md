## Document: End-to-End Data Flow for Tool Execution

This document details the sequence of calls and the transformation of data when a `ToolStep` is executed within the system.

### Overview

The execution flow can be visualized as a "dive" from the high-level `Hop` execution down to the specific tool implementation, and a "return" back up, with data being packaged and unpackaged at each layer.

```mermaid
sequenceDiagram
    participant Hop Execution
    participant ToolStep.execute()
    participant ToolExecutionHandler
    participant Tool Function (e.g., email_service.get_messages)
    participant External API (e.g., Gmail API)

    Hop Execution->>+ToolStep.execute(): hop_state
    ToolStep.execute()->>+ToolExecutionHandler: execution_input (params)
    ToolExecutionHandler->>+Tool Function (e.g., email_service.get_messages): (params)
    Tool Function (e.g., email_service.get_messages)->>+External API (e.g., Gmail API): API Request
    External API (e.g., Gmail API)-->>-Tool Function (e.g., email_service.get_messages): API Response
    Tool Function (e.g., email_service.get_messages)-->>-ToolExecutionHandler: Raw Tool Result (dict)
    ToolExecutionHandler-->>-ToolStep.execute(): Raw Tool Result (dict)
    Note right of ToolStep.execute(): Update hop_state with results
    ToolStep.execute()-->>-Hop Execution: (errors, results)
```

### 1. The "Dive": From Hop to Tool Function

This phase involves validating the request, preparing the inputs, and calling the underlying tool function.

#### Layer 1: `Hop.execute()` (Conceptual)

The process begins when a "hop" (a logical collection of one or more tool steps) is executed. A `hop_state` dictionary, which contains all the `Asset` objects (inputs, outputs, and intermediate data), is the central data structure.

*   **Action**: Loop through each `ToolStep` in the hop and call its `execute` method.
*   **Data Passed Down**: The entire `hop_state` dictionary.

#### Layer 2: `ToolStep.execute()`

This is the orchestrator for a single tool execution. We recently modified this method.

*   **File**: `backend/schemas/tools.py`
*   **Action**:
    1.  Retrieves the `ToolDefinition` from the `TOOL_REGISTRY`.
    2.  Calls `_build_tool_inputs()` to resolve the `parameter_mapping` and extract concrete values from the `hop_state`.
    3.  Packages these values into a `ToolExecutionInput` object.
    4.  Calls the `handler` method on the tool's `execution_handler`.
*   **Data Passed Down (`execution_input`)**: A `ToolExecutionInput` object containing the parameters for the tool.

```python
# Example ToolExecutionInput passed to the handler
ToolExecutionInput(
    params={
        "folders": ["INBOX"],
        "query_terms": ["newsletter"],
        "max_results": 5
    },
    connection=None, # Or connection credentials
    step_id="step_123"
)
```

#### Layer 3: `ToolExecutionHandler.handler()`

This is a wrapper defined in `backend/schemas/tool_handler_schema.py`. It acts as a standardized interface between the `ToolStep` and the actual Python function that implements the tool's logic.

*   **File**: `backend/schemas/tool_handler_schema.py`
*   **Action**: Unpacks the `params` dictionary from the `ToolExecutionInput` object and calls the registered tool function with those parameters as keyword arguments.
*   **Data Passed Down**: The raw parameters needed by the tool function.

```python
# The handler calls the actual function like this:
# await self.fn(**execution_input.params)

# Which is equivalent to:
await email_service.get_messages(
    folders=["INBOX"],
    query_terms=["newsletter"],
    max_results=5
)
```

#### Layer 4: The Tool Function (`email_service.get_messages`)

This is the final destination in the "dive"—the code that performs the actual work.

*   **File**: `backend/services/email_service.py`
*   **Action**:
    1.  Authenticates with the external service (Gmail API).
    2.  Builds a query based on the input parameters.
    3.  Calls the external API to list messages.
    4.  Loops through the message list, calling `get_message()` for each one to fetch details.
    5.  Parses and cleans the message data.
    6.  Organizes the data into a final dictionary to be returned.

### 2. The "Return": From Tool Result to Hop State

This phase involves passing the raw result back up the call stack, where it is processed and integrated at each layer.

#### Layer 4: The Tool Function Return Value

The `get_messages` function returns a dictionary containing the fetched data and a count.

*   **File**: `backend/services/email_service.py`
*   **Return Value (`results`)**: A dictionary with a well-defined structure.

```python
# Example return value from email_service.get_messages
{
    'messages': [
        {
            'id': 'msg_abc123',
            'date': '1678886400000',
            'from': 'sender@example.com',
            'to': 'user@example.com',
            'subject': 'Your Newsletter',
            'body': {
                'html': '<h1>Hello</h1><p>This is the content.</p>',
                'plain': 'Hello\nThis is the content.'
            },
            'snippet': 'This is the content.'
        }
        # ... more messages
    ],
    'count': 1
}
```

#### Layer 3: `ToolExecutionHandler.handler()` Return Value

The handler does not modify the result; it simply passes it straight through.

*   **File**: `backend/schemas/tool_handler_schema.py`
*   **Return Value**: The exact dictionary returned by the tool function.

#### Layer 2: `ToolStep.execute()` Return Value

This method receives the raw results dictionary. Its primary job now is to map this data back into the `hop_state`.

*   **File**: `backend/schemas/tools.py`
*   **Action**:
    1.  Receives the `results` dictionary from the handler.
    2.  Iterates through its `result_mapping`. For example, a mapping might be `{"emails": "retrieved_emails_asset"}`.
    3.  It finds the `results['emails']` key (which corresponds to the `messages` key in our example if mapped that way) and updates the `value` of the `retrieved_emails_asset` `Asset` object in the `hop_state`.
    4.  It marks that asset as `READY`.
*   **Return Value**: A tuple `(errors, results)`.

```python
# Example return value from ToolStep.execute()
(
    [],  # Empty list for errors
    {    # The raw results dictionary from the tool
        'messages': [...],
        'count': 1
    }
)
```

#### Layer 1: `Hop.execute()` (Conceptual) Return Value

The hop execution logic receives the tuple from `ToolStep.execute()`.

*   **Action**:
    1.  Checks if the `errors` list is empty. If not, it can halt execution of the hop.
    2.  If successful, it can use the `results` dictionary for logging or other metadata purposes.
    3.  It continues to the next `ToolStep`, using the now-updated `hop_state` which contains the results from the previous step, making them available as inputs for subsequent steps.
*   **Final Result**: After all steps are complete, the hop execution layer will typically return the final `hop_state` or a specific subset of output assets to the original caller (e.g., an API route), which then formats the final JSON response to be sent back to the frontend. 