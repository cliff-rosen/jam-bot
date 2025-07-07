# Schema vs Database Model Discrepancy Analysis & Final Unified Design

## Identified Discrepancies

**Terminology Clarification:**
- **Schema** = Business logic layer (Pydantic models in `backend/schemas/workflow.py`)
- **Model** = Database layer (SQLAlchemy models, proposed in `complete_database_schema.md`)

### Mission: Schema vs Database Model

#### Missing Fields in Database Model (from Pydantic Schema)
- `metadata: Dict[str, Any]` - General purpose metadata field
- `inputs: List[Asset]` and `outputs: List[Asset]` - Separate arrays vs role-based filtering

#### Status Enum Differences
```python
# Pydantic Schema (workflow.py)
class MissionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active" 
    COMPLETE = "complete"  # ← Different

# Database Model (proposed)
ENUM('pending', 'active', 'completed', 'failed', 'cancelled')  # ← More statuses
```

### Hop: Schema vs Database Model

#### Fields to Evaluate
- `rationale: Optional[str]` - ✅ Keep: Explanation of why hop is needed
- `input_mapping: Dict[str, str]` - ❌ REMOVE: We decided against mappings, use direct asset IDs
- `output_mapping: Dict[str, str]` - ❌ REMOVE: We decided against mappings, use direct asset IDs  
- `hop_state: Dict[str, Asset]` - ❌ REMOVE: Assets stored in unified table with scope references
- `is_final: bool` - ✅ Keep: Whether this is the final hop
- `is_resolved: bool` - ✅ Keep: Whether hop tools have been resolved
- `error: Optional[str]` - ✅ Keep: Error message if hop failed

#### Status Enum Differences
```python
# Pydantic Schema (workflow.py)
class HopStatus(str, Enum):
    READY_TO_DESIGN = "ready_to_design"
    HOP_PROPOSED = "hop_proposed"  
    HOP_READY_TO_RESOLVE = "hop_ready_to_resolve"
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute"
    HOP_RUNNING = "hop_running"
    ALL_HOPS_COMPLETE = "all_hops_complete"

# Database Model (originally proposed)
ENUM('pending', 'active', 'completed', 'failed', 'cancelled')  # ← Generic statuses
```

### ToolStep: Schema vs Database Model

#### Missing Fields in Database Model (from Pydantic Schema)
- `resource_configs: Dict[str, Resource]` - Tool-specific resource configurations
- `validation_errors: Optional[List[str]]` - Validation error messages

#### Parameter/Result Mapping Structure Differences
```python
# Pydantic Schema (workflow.py) - Rich Pydantic models
class AssetFieldMapping(BaseModel):
    type: Literal["asset_field"] = "asset_field"
    state_asset: str
    path: Optional[str] = None  # ← Missing from DB schema

class LiteralMapping(BaseModel):
    type: Literal["literal"] = "literal"  # ← Different name
    value: Any

ParameterMappingValue = Union[AssetFieldMapping, LiteralMapping]

# Database Model (originally proposed) - Simple JSON
{
  "type": "asset_field" | "literal_value" | "config_value",  # ← Different names
  "state_asset": "asset_uuid",
  "literal_value": any,
  "config_key": "string"
}
```

### Asset Storage Architecture

#### Schema vs Model Approach Comparison
```python
# Pydantic Schema (workflow.py) - Hop contains assets directly
class Hop(BaseModel):
    hop_state: Dict[str, Asset]  # Assets embedded in hop
    input_mapping: Dict[str, str]  # Maps to mission assets
    output_mapping: Dict[str, str]  # Maps to mission assets

# Database Model (proposed) - Assets reference scope
CREATE TABLE assets (
    scope_type ENUM('mission', 'hop'),
    scope_id VARCHAR(36)  # References mission_id or hop_id
)
```

## Architectural Decision Points

### 1. Asset Storage Strategy
**✅ DECIDED:** Store all assets in unified table with scope references (Option B)
- Eliminates hop_state embedding
- Eliminates input_mapping/output_mapping
- Tools reference assets by ID directly

### 2. Status Enum Complexity
**QUESTION:** Use domain-specific detailed statuses vs generic statuses?

### 3. Direct Asset References
**✅ DECIDED:** Tools reference assets by ID directly in parameter_mapping/result_mapping
- No separate mapping layers needed
- Simplified, direct approach

## Recommended Final Database Models & Business Schemas

### Database Model: Mission Table
```sql
CREATE TABLE missions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal TEXT,
    status ENUM('pending', 'active', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    success_criteria JSON,  -- Array of strings
    metadata JSON NOT NULL DEFAULT '{}',  -- General purpose metadata
    current_hop_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (current_hop_id) REFERENCES hops(id) ON DELETE SET NULL
);
```

### Database Model: Hop Table  
```sql
CREATE TABLE hops (
    id VARCHAR(36) PRIMARY KEY,
    mission_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('ready_to_design', 'hop_proposed', 'hop_ready_to_resolve', 
                'hop_ready_to_execute', 'hop_running', 'all_hops_complete') NOT NULL DEFAULT 'hop_proposed',
    sequence_order INT NOT NULL,
    rationale TEXT,  -- Why this hop is needed
    is_final BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
    UNIQUE KEY uk_hops_mission_order (mission_id, sequence_order)
);
```

### Database Model: ToolStep Table
```sql  
CREATE TABLE tool_steps (
    id VARCHAR(36) PRIMARY KEY,
    hop_id VARCHAR(36) NOT NULL,
    tool_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    status ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    sequence_order INT NOT NULL,
    parameter_mapping JSON NOT NULL,  -- Enhanced mapping structure
    result_mapping JSON NOT NULL,
    resource_configs JSON,  -- Tool-specific resource configurations
    execution_result JSON,
    error_message TEXT,
    validation_errors JSON,  -- Array of validation error strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    
    FOREIGN KEY (hop_id) REFERENCES hops(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tool_steps_hop_order (hop_id, sequence_order)
);
```

### Business Schema: Simplified Parameter/Result Mapping JSON
```json
// Parameter Mapping - Direct asset ID references
{
  "param_name": {
    "type": "asset_field",
    "state_asset": "asset_uuid"  // Direct reference to asset.id
  },
  "other_param": {
    "type": "literal",
    "value": "any_value"
  },
  "config_param": {
    "type": "config_value", 
    "config_key": "api_key"
  }
}

// Result Mapping - Direct asset ID references
{
  "result_name": {
    "type": "asset_field",
    "state_asset": "asset_uuid"  // Direct reference to asset.id
  },
  "ignored_result": {
    "type": "discard"
  }
}
```

### Database Model: Asset Table (Unified Approach)
```sql
CREATE TABLE assets (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL, 
    scope_type ENUM('mission', 'hop') NOT NULL,
    scope_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255) NOT NULL,
    subtype VARCHAR(255),
    role ENUM('input', 'output', 'intermediate') NOT NULL,
    status ENUM('pending', 'ready', 'error') NOT NULL DEFAULT 'pending',
    content JSON,
    content_summary TEXT,
    asset_metadata JSON NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_assets_scope (scope_type, scope_id),
    INDEX idx_assets_role (role)
);
```

## Key Decisions Made

1. **Keep domain-specific status enums** - More expressive than generic statuses
2. **Add useful fields only** - rationale, metadata, validation_errors, resource_configs  
3. **Unified asset storage** - All assets in one table with scope references
4. **Direct asset references** - Tools reference assets by ID, no mapping layers
5. **Simplified hop architecture** - Eliminated input_mapping/output_mapping/hop_state

## Migration Impact

This unified schema simplifies the architecture while providing the performance benefits of relational storage. The main changes from current implementation:

1. **Hops and tool_steps** moved from JSON to separate tables
2. **Assets** moved to unified scoped storage  
3. **Simplified mappings** - Direct asset ID references instead of mapping layers
4. **Enhanced tracking** - Added rationale, metadata, validation_errors
5. **Eliminated complexity** - No hop_state, input_mapping, output_mapping 