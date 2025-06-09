"""Email-related tool handlers.

This module contains concrete implementations for tools that interact with
email data (currently Gmail search).
"""

from __future__ import annotations

from typing import Dict, Any, List

from services.email_service import EmailService
from tools.tool_registry import register_tool_handler  # Updated import path
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionHandler

# Singleton service instance – reuse HTTP connections etc.
email_service = EmailService()


async def handle_email_search(input: ToolExecutionInput) -> Dict[str, Any]:
    """Execution logic for the *email_search* tool.

    Expects the following parameters (as defined in the tool schema):
        • folder : str | None – label ID to search inside (optional)
        • query  : str | None – free-text search query
        • limit  : int – maximum number of messages (<= 500)
        • include_attachments : bool – whether to include attachment data
        • include_metadata    : bool – include message metadata
        • date_range          : Any – optional structure understood by EmailService

    Returns a mapping with keys exactly matching the tool's declared outputs:
        • emails – List[dict]
        • count  – int
    """
    print("handle_email_search executing")

    params = input.params

    # Transform inputs for EmailService API
    endpoint_params: Dict[str, Any] = {
        "folders": [params["folder"]] if params.get("folder") else None,
        "query_terms": [params["query"]] if params.get("query") else None,
        "max_results": min(int(params.get("limit", 100)), 500),
        "include_attachments": bool(params.get("include_attachments", False)),
        "include_metadata": bool(params.get("include_metadata", True)),
        "date_range": params.get("date_range"),
    }

    # Call the EmailService to get messages and count
    # response = await email_service.get_messages_and_store(**endpoint_params)
    fake_response: Dict[str, Any] = {
        "messages": [
            {
                "id": "1234567890c",
                "subject": "Test Email",
                "from": "test@example.com",
                "date": "2023-01-01",
                "body": "This is a test email",
            }
        ],
        "count": 1,
        "stored_ids": [],
        "error": None
    }
    response = fake_response

    return {
        "emails": response.get("messages", []),
        "count": response.get("count", 0),
        "stored_ids": response.get("stored_ids", []),
        "error": response.get("error"),
    }


# ---------------------------------------------------------------------------
# Register the handler so the framework can invoke it.
# ---------------------------------------------------------------------------

register_tool_handler(
    "email_search",
    ToolExecutionHandler(
        handler=handle_email_search,
        description="Executes Gmail search and returns basic message metadata",
    ),
) 