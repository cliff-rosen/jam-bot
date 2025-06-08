from schemas.tool_registry import TOOL_REGISTRY

print("=== TOOL REGISTRY STATUS ===")
print(f"Total tools loaded: {len(TOOL_REGISTRY)}")
print(f"Tool IDs: {list(TOOL_REGISTRY.keys())}")

email_search_tool = TOOL_REGISTRY.get('email_search')
print(f"\nEmail search tool exists: {email_search_tool is not None}")

if email_search_tool:
    print(f"Email search tool name: {email_search_tool.name}")
    print(f"Email search tool description: {email_search_tool.description}")
    print(f"Email search tool has handler: {email_search_tool.execution_handler is not None}")
    if email_search_tool.execution_handler:
        print(f"Handler type: {type(email_search_tool.execution_handler)}")
    else:
        print("Handler is None")

print("\n=== IMPORTING EMAIL TOOL HANDLERS ===")
try:
    from tool_handlers import email_tool_handlers
    print("Email tool handlers imported successfully")
    
    # Check again after import
    email_search_tool_after = TOOL_REGISTRY.get('email_search')
    print(f"Email search tool has handler after import: {email_search_tool_after.execution_handler is not None}")
    if email_search_tool_after.execution_handler:
        print(f"Handler type after import: {type(email_search_tool_after.execution_handler)}")
        
except Exception as e:
    print(f"Error importing email tool handlers: {e}") 