"""Email-related tool handlers.

This module contains concrete implementations for tools that interact with
email data (currently Gmail search).
"""

from __future__ import annotations

from typing import Dict, Any, List
from schemas.base import SchemaType, ValueType

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
        • label_ids : List[str] | None – label IDs to search inside (optional)
        • max_results : int – maximum number of messages (1-500, defaults to 100)
        • include_spam_trash : bool – whether to include messages from SPAM and TRASH
        • page_token : str | None – token for retrieving the next page of results

    Returns a mapping with keys exactly matching the tool's declared outputs:
        • emails – List[dict] – List of matching emails
        • count – int – Total number of matching emails
        • next_page_token – str | None – Token for retrieving the next page
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
            "query": params.get("query", ""),  # Pass query string directly, default to empty string
            "label_ids": params.get("label_ids"),  # Use consistent parameter name
            "max_results": min(int(params.get("max_results", 100)), 500),
            "include_spam_trash": bool(params.get("include_spam_trash", False)),
            "page_token": params.get("page_token")
        }

        print("Authenticated user. Awaiting response")
        response = await email_service.get_messages_and_store(**endpoint_params)
        print("Response received")
        
        # Create the schema for the response
        schema = SchemaType(
            type="object",
            description="List of email messages with metadata",
            is_array=True,
            fields={
                "id": SchemaType(type="string", description="Email ID"),
                "thread_id": SchemaType(type="string", description="Thread ID"),
                "subject": SchemaType(type="string", description="Email subject"),
                "from": SchemaType(type="string", description="Sender email"),
                "to": SchemaType(type="string", description="Recipient emails", is_array=True),
                "date": SchemaType(type="string", description="Email date"),
                "snippet": SchemaType(type="string", description="Email preview"),
                "labels": SchemaType(type="string", description="Email labels", is_array=True)
            }
        )
        
        return {
            "value": response.get("messages", []),
            "schema": schema,
            "count": response.get("count", 0),
            "next_page_token": response.get("nextPageToken")  # Add pagination token to response
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