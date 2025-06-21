# Complete Mapping System Solution

## Problem Statement

The original system had ad-hoc mapping between internal entities (missions, hops, assets) and prompt-suitable formats. This led to:

1. **Inconsistent formatting** across different prompt types
2. **Code duplication** in asset and mission formatting
3. **Hard to maintain** mapping logic scattered across files
4. **No systematic approach** to handling different context types
5. **Limited asset categorization** and organization

## Solution Overview

We've created a comprehensive **Prompt Context Mapper System** that provides:

### 1. Systematic Entity Mapping
- **Structured approach** to converting internal state to prompt formats
- **Type-safe** with enums and dataclasses
- **Context-aware** formatting for different prompt types

### 2. Asset Categorization
- **Multi-dimensional categorization** by role, status, and type
- **Context-specific formatting** for different use cases
- **Automatic organization** of assets for better prompt clarity

### 3. Backward Compatibility
- **Legacy functions** continue to work
- **Gradual migration** path for existing code
- **No breaking changes** to existing interfaces

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Prompt Context Mapper                    │
├─────────────────────────────────────────────────────────────┤
│  PromptContextType (Enum)                                   │
│  ├── MISSION_DEFINITION                                     │
│  ├── HOP_DESIGN                                            │
│  ├── HOP_IMPLEMENTATION                                    │
│  ├── TOOL_EXECUTION                                        │
│  └── MISSION_REVIEW                                        │
├─────────────────────────────────────────────────────────────┤
│  PromptContext (Dataclass)                                  │
│  ├── context_type                                          │
│  ├── mission_summary                                       │
│  ├── available_assets                                      │
│  ├── asset_categories                                      │
│  ├── completed_hops                                        │
│  ├── current_hop                                           │
│  └── metadata                                              │
├─────────────────────────────────────────────────────────────┤
│  PromptContextMapper (Class)                                │
│  ├── create_context()                                      │
│  ├── _format_assets_for_*()                                │
│  ├── _format_mission_for_*()                               │
│  ├── _categorize_assets()                                  │
│  └── to_string_format()                                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. PromptContextType Enum
Defines different types of prompt contexts that require different asset presentations:

```python
class PromptContextType(Enum):
    MISSION_DEFINITION = "mission_definition"
    HOP_DESIGN = "hop_design" 
    HOP_IMPLEMENTATION = "hop_implementation"
    TOOL_EXECUTION = "tool_execution"
    MISSION_REVIEW = "mission_review"
```

### 2. PromptContext Dataclass
Structured container for all prompt context data:

```python
@dataclass
class PromptContext:
    context_type: PromptContextType
    mission_summary: Dict[str, Any]
    available_assets: List[Dict[str, Any]]
    asset_categories: Dict[str, List[Dict[str, Any]]]
    completed_hops: List[Dict[str, Any]]
    current_hop: Optional[Dict[str, Any]]
    metadata: Dict[str, Any]
```

### 3. PromptContextMapper Class
Main class that handles all mapping logic with context-specific formatters.

## Asset Categorization System

### By Role
- **inputs**: Mission input assets (user data, credentials)
- **outputs**: Mission output assets (final deliverables)
- **intermediate**: Processing assets (retrieved data, temporary results)

### By Status
- **ready**: Assets ready for use
- **pending**: Assets waiting for processing
- **failed**: Assets that failed to process

### Context-Specific Formatting

| Context Type | Asset Focus | Includes |
|--------------|-------------|----------|
| Mission Definition | Types, roles, requirements | Schema, external systems |
| Hop Design | Value previews, relevance | Status, mission outputs |
| Hop Implementation | Full values, schemas | Complete asset data |
| Tool Execution | Tool consumption | Values, schemas |
| Mission Review | Timestamps, progress | History, metrics |

## Usage Patterns

### 1. Basic Usage
```python
from utils.prompt_context_mapper import PromptContextType, create_prompt_context

context = create_prompt_context(
    context_type=PromptContextType.MISSION_DEFINITION,
    mission=mission,
    current_hop=current_hop
)
```

### 2. Advanced Usage with Categories
```python
from utils.message_formatter import format_context_for_prompt

formatted = format_context_for_prompt(
    context, 
    include_categories=True, 
    include_metadata=True
)
```

### 3. Legacy Compatibility
```python
from utils.message_formatter import format_mission_with_context

formatted = format_mission_with_context(
    mission=mission,
    context_type="hop_design",
    current_hop=current_hop
)
```

## Migration Benefits

### Before (Ad-hoc)
```python
# Scattered across files
assets_str = format_assets(available_assets)
mission_str = format_mission(mission)

# Different formatting for different contexts
if context_type == "hop_design":
    # Custom formatting logic
elif context_type == "implementation":
    # Different custom formatting logic
```

### After (Systematic)
```python
# Centralized, consistent approach
context = create_prompt_context(
    context_type=PromptContextType.HOP_DESIGN,
    mission=mission,
    additional_assets=available_assets
)

# Automatic context-specific formatting
formatted = format_context_for_prompt(context)
```

## Integration Points

### 1. Updated Message Formatter
- Added integration functions
- Maintained backward compatibility
- Added new formatting options

### 2. Updated Prompt Callers
- Example: `MissionDefinitionPromptCaller`
- Uses new system internally
- Provides legacy method for compatibility

### 3. New Utility Functions
- `create_prompt_context()`: Main entry point
- `format_context_for_prompt()`: Format for prompts
- `format_mission_with_context()`: Legacy compatibility

## Benefits Achieved

### 1. Consistency
- **Unified approach** to entity mapping
- **Standardized formatting** across all prompt types
- **Consistent asset presentation**

### 2. Maintainability
- **Centralized logic** in one place
- **Type-safe** with strong typing
- **Easy to extend** with new context types

### 3. Flexibility
- **Context-aware formatting** for different use cases
- **Rich asset categorization** for better organization
- **Extensible architecture** for future needs

### 4. Performance
- **Efficient caching** of formatter functions
- **Optimized asset categorization**
- **Deferred string formatting**

### 5. Developer Experience
- **Clear API** with good documentation
- **Backward compatibility** for gradual migration
- **Comprehensive examples** and usage patterns

## Future Extensibility

The system is designed to be easily extended:

1. **New Context Types**: Add enum values and implement formatters
2. **Custom Categories**: Extend asset categorization logic
3. **Plugin System**: Add custom formatters for specific needs
4. **Caching**: Implement intelligent caching strategies
5. **Validation**: Add schema validation for context data

## Conclusion

The Prompt Context Mapper System provides a complete, systematic solution for mapping internal entities to prompt-suitable formats. It replaces the previous ad-hoc approach with a structured, type-safe, and extensible system that maintains backward compatibility while providing significant improvements in consistency, maintainability, and flexibility.

The system is ready for immediate use and provides a clear migration path for existing code, making it easy to adopt incrementally while maintaining system stability. 