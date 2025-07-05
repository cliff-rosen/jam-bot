"""
Handler implementation for the web_retrieve tool.

This tool retrieves and extracts content from webpages given their URLs.
"""

from typing import Dict, Any
from datetime import datetime
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionHandler, ToolExecutionResult
from schemas.canonical_types import CanonicalWebpage
from schemas.schema_utils import create_typed_response
from tools.tool_registry import register_tool_handler
from tools.tool_stubbing import create_stub_decorator
from services.web_retrieval_service import WebRetrievalService

# Singleton service instance
web_retrieval_service = WebRetrievalService()

@create_stub_decorator("web_retrieve")
async def handle_web_retrieve(input: ToolExecutionInput) -> ToolExecutionResult:
    """
    Retrieve and extract content from a webpage given its URL.
    
    Args:
        input: ToolExecutionInput containing:
            - url: The URL of the webpage to retrieve
            - extract_text_only: Whether to extract only text content or include HTML
            - timeout: Request timeout in seconds
            - user_agent: User agent string to use for the request
            
    Returns:
        ToolExecutionResult containing:
            - webpage: Retrieved webpage content (CanonicalWebpage object)
            - status_code: HTTP status code from the request
            - response_time: Response time in milliseconds
            - timestamp: Retrieval timestamp
    """
    # Extract parameters
    url = input.params.get("url")
    extract_text_only = input.params.get("extract_text_only", True)
    timeout = input.params.get("timeout", 30)
    user_agent = input.params.get("user_agent")
    
    if not url:
        raise ValueError("url is required")
    
    try:
        # Retrieve webpage
        result = await web_retrieval_service.retrieve_webpage(
            url=url,
            extract_text_only=extract_text_only,
            timeout=timeout,
            user_agent=user_agent
        )
        
        # Return properly typed canonical results
        # The service already returns CanonicalWebpage objects, maintaining full type safety
        return ToolExecutionResult(
            outputs={
                "webpage": result["webpage"],  # CanonicalWebpage
                "status_code": result["status_code"],
                "response_time": result["response_time"],
                "timestamp": result["timestamp"]
            }
        )
        
    except Exception as e:
        # Log error and return error webpage with error metadata
        print(f"Error retrieving webpage: {e}")
        
        # Create error webpage object
        error_webpage = CanonicalWebpage(
            url=url,
            title="Error",
            content=f"Error retrieving webpage: {str(e)}",
            html=None,
            last_modified=None,
            content_type="text/html",
            status_code=0,
            headers={},
            metadata={"error": str(e)}
        )
        
        return ToolExecutionResult(
            outputs={
                "webpage": error_webpage,
                "status_code": 0,
                "response_time": 0,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

# Register the handler
register_tool_handler(
    "web_retrieve",
    ToolExecutionHandler(
        handler=handle_web_retrieve,
        description="Retrieves and extracts content from webpages given their URLs"
    )
) 