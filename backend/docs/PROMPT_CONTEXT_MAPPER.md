# Prompt Context Mapper System

## Overview

The Prompt Context Mapper system provides a comprehensive and systematic approach to mapping internal entities (missions, hops, assets) to formats that are optimized for different types of prompts. This replaces the previous ad-hoc mapping approach with a structured, type-safe, and extensible system.

## Key Benefits

1. **Systematic Mapping**: Consistent approach to converting internal state to prompt-suitable formats
2. **Context-Aware**: Different formatting for different prompt types (mission definition, hop design, implementation, etc.)
3. **Asset Categorization**: Automatic categorization of assets by role, status, and type
4. **Backward Compatibility**: Legacy functions continue to work while using the new system internally
5. **Type Safety**: Strong typing with enums and dataclasses
6. **Extensible**: Easy to add new context types and formatting rules

## Architecture

### Core Components

1. **PromptContextType** (Enum): Defines different types of prompt contexts
2. **PromptContext** (Dataclass): Structured container for all prompt context data
3. **PromptContextMapper**: Main class that handles all mapping logic
4. **Integration Functions**: Helper functions in `message_formatter.py`

### Context Types

- `MISSION_DEFINITION`: For creating new missions
- `HOP_DESIGN`: For designing the next hop in a workflow
- `HOP_IMPLEMENTATION`: For implementing a specific hop
- `TOOL_EXECUTION`: For executing individual tools
- `MISSION_REVIEW`: For reviewing mission progress and results

## Usage Examples

### Basic Usage

```python
from utils.prompt_context_mapper import PromptContextType, create_prompt_context
from utils.message_formatter import format_context_for_prompt

# Create context for mission definition
context = create_prompt_context(
    context_type=PromptContextType.MISSION_DEFINITION,
    mission=mission,
    current_hop=current_hop
)

# Format for prompt variables
formatted = format_context_for_prompt(context, include_categories=True)
```

### Advanced Usage

```python
# Create context with custom parameters
context = create_prompt_context(
    context_type=PromptContextType.HOP_DESIGN,
    mission=mission,
    available_tools=["web_search", "email_reader"],
    include_performance_metrics=True
)

# Access structured data directly
ready_assets = context.asset_categories['ready']
mission_progress = context.metadata['mission_progress']
```

### Legacy Compatibility

```python
from utils.message_formatter import format_mission_with_context

# Use legacy function that internally uses the new system
formatted = format_mission_with_context(
    mission=mission,
    context_type="hop_design",
    current_hop=current_hop
)
```

## Asset Categorization

The system automatically categorizes assets into multiple dimensions:

### By Role
- `inputs`: Mission input assets
- `outputs`: Mission output assets  
- `intermediate`: Intermediate processing assets

### By Status
- `ready`: Assets ready for use
- `pending`: Assets waiting for processing
- `failed`: Assets that failed to process

### Context-Specific Formatting

Different context types format assets differently:

- **Mission Definition**: Focus on asset types, roles, and requirements
- **Hop Design**: Include value previews and mission relevance
- **Hop Implementation**: Include full values and schema definitions
- **Tool Execution**: Include complete asset data for tool consumption
- **Mission Review**: Include timestamps and progress information

## Integration with Existing Code

### Updating Prompt Callers

```python
# Old approach
assets_str = format_assets(available_assets)
mission_str = format_mission(mission)

# New approach
context = create_prompt_context(
    context_type=PromptContextType.MISSION_DEFINITION,
    mission=mission,
    additional_assets=available_assets
)
formatted = format_context_for_prompt(context)
```

### Maintaining Backward Compatibility

The system provides legacy functions that use the new mapper internally:

```python
# This still works but uses the new system
formatted = format_mission_with_context(mission, "hop_design")
```

## Extending the System

### Adding New Context Types

1. Add new enum value to `PromptContextType`
2. Implement asset formatter method in `PromptContextMapper`
3. Implement mission formatter method in `PromptContextMapper`
4. Update metadata builder if needed

### Adding Custom Asset Categories

```python
def _categorize_assets(self, assets, context_type):
    categories = super()._categorize_assets(assets, context_type)
    
    # Add custom categories
    categories["custom_category"] = [
        asset for asset in assets 
        if self._is_custom_category(asset)
    ]
    
    return categories
```

## Migration Guide

### Step 1: Update Imports

```python
# Add new imports
from utils.prompt_context_mapper import PromptContextType, create_prompt_context
from utils.message_formatter import format_context_for_prompt
```

### Step 2: Replace Direct Formatting

```python
# Before
assets_str = format_assets(available_assets)
mission_str = format_mission(mission)

# After
context = create_prompt_context(
    context_type=PromptContextType.HOP_DESIGN,
    mission=mission,
    additional_assets=available_assets
)
formatted = format_context_for_prompt(context)
```

### Step 3: Update Prompt Variables

```python
# Before
response = await super().invoke(
    messages=messages,
    mission=mission_str,
    available_assets=assets_str,
    **kwargs
)

# After
response = await super().invoke(
    messages=messages,
    mission=formatted["mission"],
    available_assets=formatted["available_assets"],
    **kwargs
)
```

## Best Practices

1. **Use Appropriate Context Types**: Choose the context type that matches your prompt's purpose
2. **Include Relevant Metadata**: Use `include_categories=True` and `include_metadata=True` for rich prompts
3. **Access Structured Data**: Use the structured `PromptContext` object for programmatic access
4. **Leverage Asset Categories**: Use categorized assets for better prompt organization
5. **Maintain Backward Compatibility**: Use legacy functions during migration

## Performance Considerations

- The mapper caches formatter functions for efficiency
- Asset categorization is done once per context creation
- String formatting is deferred until needed
- Large asset collections are handled efficiently

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all required modules are imported
2. **Type Errors**: Check that mission and hop objects match expected schemas
3. **Missing Assets**: Verify that assets exist in mission state or hop state
4. **Context Type Mismatch**: Ensure the context type matches your use case

### Debugging

```python
# Enable debug output
context = create_prompt_context(
    context_type=PromptContextType.MISSION_DEFINITION,
    mission=mission,
    debug=True
)

print(f"Context Type: {context.context_type}")
print(f"Available Assets: {len(context.available_assets)}")
print(f"Asset Categories: {context.asset_categories}")
print(f"Metadata: {context.metadata}")
```

## Future Enhancements

1. **Dynamic Context Types**: Runtime registration of new context types
2. **Custom Formatters**: Plugin system for custom asset formatters
3. **Caching**: Intelligent caching of formatted contexts
4. **Validation**: Schema validation for context data
5. **Metrics**: Performance metrics and usage analytics 