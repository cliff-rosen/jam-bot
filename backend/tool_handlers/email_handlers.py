"""Email-related tool handlers.

This module contains concrete implementations for tools that interact with
email data (currently Gmail search).
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional

from services.email_service import EmailService
from schemas.tools import register_tool_handler
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

    # For now we stub out the actual API call to keep the handler self-contained.
    # Replace the following block with a real call to email_service when wiring
    # up external credentials + OAuth flow.
    fake_response: Dict[str, Any] = {
        "messages": [
            {
                "id": "1234567890",
                "subject": "Test Email",
                "from": "test@example.com",
                "date": "2023-01-01",
                "body": "This is a test email",
            }
        ]
    }

    response = fake_response  # await email_service.get_messages_and_store(**endpoint_params)

    emails: List[Dict[str, Any]] = response["messages"]
    return {
        "emails": emails,
        "count": len(emails),
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