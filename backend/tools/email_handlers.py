"""Email-related tool handlers.

This module contains concrete implementations for tools that interact with
email data (currently Gmail search).
"""

from __future__ import annotations

from typing import Dict, Any, List

from database import get_db
from services.email_service import EmailService
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionHandler
from tools.tool_registry import register_tool_handler  # Updated import path

# Singleton service instance – reuse HTTP connections etc.
email_service = EmailService()


async def handle_email_search(input: ToolExecutionInput) -> Dict[str, Any]:
    """Execution logic for the *email_search* tool.

    Expects the following parameters (as defined in the tool schema):
        • query : str – Gmail search query
        • folder : str | None – label ID to search inside (optional, defaults to INBOX)
        • date_range : object | None – date range to search within
        • limit : int – maximum number of messages (1-500, defaults to 100)
        • include_attachments : bool – whether to include attachment data (defaults to false)
        • include_metadata : bool – include message metadata (defaults to true)

    Returns a mapping with keys exactly matching the tool's declared outputs:
        • emails – List[dict] – List of matching emails
        • count – int – Total number of matching emails
    """
    print("handle_email_search executing")

    try:
        print("Authenticating user")        
        db = next(get_db())
        await email_service.authenticate(1, db)
    except Exception as e:
        print(f"Error authenticating user: {e}")
        raise Exception(f"Error authenticating user: {e}")

    try:
        params = input.params

        # Transform inputs for EmailService API
        endpoint_params: Dict[str, Any] = {
            "db": db,
            "query_terms": [params["query"]],  # Convert single query to list
            "folders": [params.get("folder", "INBOX")] if params.get("folder") else None,  # Convert single folder to list
            "date_range": params.get("date_range"),
            "max_results": min(int(params.get("limit", 100)), 500),
            "include_attachments": bool(params.get("include_attachments", False)),
            "include_metadata": bool(params.get("include_metadata", True))
        }

        print("Authenticated user. Awaiting response")
        response = await email_service.get_messages_and_store(**endpoint_params)
        print("Response received")
        
        return {
            "emails": response.get("messages", []),
            "count": response.get("count", 0)
        }
    except Exception as e:
        print(f"Error executing email search: {e}")
        raise Exception(f"Error executing email search: {e}")

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