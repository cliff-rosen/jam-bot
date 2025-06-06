from typing import Dict, Any
from datetime import datetime

from services.email_service import EmailService

from schemas.workflow import ToolStep, Asset
from schemas.tool_utils import register_tool_handler, ToolExecutionHandler
from schemas.asset import AssetFieldMapping, LiteralMapping

from utils.asset_utils import get_nested_value

email_service = EmailService()

async def handle_email_search(step: ToolStep, hop_state: Dict[str, Asset]) -> Dict[str, Any]:
    """Handle execution of the email_search tool"""

    print(f"handle_email_search: {step}")

    # Map parameters from hop state
    params = {}
    for param_name, mapping in step.parameter_mapping.items():
        if isinstance(mapping, AssetFieldMapping):
            asset = hop_state.get(mapping.state_asset)
            if not asset:
                raise ValueError(f"Asset {mapping.state_asset} not found")
            # Get value from asset using path
            value = get_nested_value(asset.content, mapping.path)
            params[param_name] = value
        elif isinstance(mapping, LiteralMapping):
            params[param_name] = mapping.value
    
    # Transform parameters to match endpoint
    endpoint_params = {
        "folders": [params["folder"]] if "folder" in params else None,
        "query_terms": [params["query"]] if "query" in params else None,
        "max_results": min(params.get("limit", 100), 500),
        "include_attachments": params.get("include_attachments", False),
        "include_metadata": params.get("include_metadata", True),
        "date_range": params.get("date_range")
    }
    
    # Call endpoint
    # response = await email_service.get_messages_and_store(**endpoint_params)
    fake_response = {"messages": [], "stored_ids": [], "error": None}
    fake_response["messages"] = [
        {
            "id": "1234567890",
            "subject": "Test Email",
            "from": "test@example.com",
            "date": "2023-01-01",
            "body": "This is a test email"
        }
    ]
    response = fake_response
    
    # Return results in format expected by tool
    return {
        "emails": response["messages"],
        "count": len(response["messages"])
    }

# Register the handler
register_tool_handler("email_search", ToolExecutionHandler(
    handler=handle_email_search,
    description="Executes Gmail search and stores results"
)) 