"""
Handler implementation for the web_search tool.

This tool searches the web for real-time information about any topic.
"""

from typing import List, Dict, Any
from datetime import datetime
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionHandler
from tools.tool_registry import register_tool_handler
from tools.tool_stubbing import create_stub_decorator
from services.search_service import SearchService
from database import get_db

# Singleton service instance
search_service = SearchService()

@create_stub_decorator("web_search")
async def handle_web_search(input: ToolExecutionInput) -> Dict[str, Any]:
    """
    Search the web for real-time information about any topic.
    
    Args:
        input: ToolExecutionInput containing:
            - search_term: The search term to look up on the web
            - num_results: Number of search results to return
            - date_range: Date range for search results
            - region: Geographic region for search results
            - language: Language for search results
            
    Returns:
        Dict containing:
            - search_results: List of web search results
            - search_metadata: Search metadata and statistics
    """
    # Extract parameters
    search_term = input.params.get("search_term")
    num_results = input.params.get("num_results", 10)
    date_range = input.params.get("date_range", "all")
    region = input.params.get("region", "global")
    language = input.params.get("language", "en")
    
    if not search_term:
        raise ValueError("search_term is required")
    
    try:
        # Authenticate with search service
        db = next(get_db())
        # Use user_id = 1 for now, should be extracted from context in real implementation
        await search_service.authenticate(1, db)
        
        # Perform search
        result = await search_service.search(
            search_term=search_term,
            num_results=num_results,
            date_range=date_range,
            region=region,
            language=language
        )
        
        return result
        
    except Exception as e:
        # Log error and return empty results
        print(f"Error performing web search: {e}")
        
        # Return empty results with error metadata
        return {
            "search_results": [],
            "search_metadata": {
                "query": search_term,
                "total_results": 0,
                "search_time": 0,
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        }

# Register the handler
register_tool_handler(
    "web_search",
    ToolExecutionHandler(
        handler=handle_web_search,
        description="Searches the web for real-time information about any topic"
    )
) 