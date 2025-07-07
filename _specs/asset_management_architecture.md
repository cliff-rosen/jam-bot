# Asset Management Architecture Specification

## Overview

This document defines the architecture for asset management across the three-layer system: Frontend (FE), Backend Schema/Application Logic (BE), and Database Models (DB). The goal is to eliminate asset copying, reduce network traffic, and establish clear separation of concerns while providing rich asset metadata for UX and LLM consumption.

## Core Principles

1. **Single Source of Truth**: Assets live in the database, everything else uses references
2. **Relational Data Model**: Child entities point to parents via foreign keys  
3. **Self-Contained Schemas**: Business objects contain rich asset metadata without large content values
4. **Smart Content Loading**: Use value representations for display/LLM, full content on demand
5. **Lazy Asset Resolution**: Load full asset content only when actually needed by tools

## Asset Value Representation Strategy

Instead of eliminating asset content entirely, we use a **value representation** approach:

```python
class Asset(BaseModel):
    id: str
    name: str
    type: str
    status: AssetStatus
    role: AssetRole
    description: str
    schema_definition: SchemaType
    
    # Smart content loading
    value_representation: str   # Truncated/summarized version for UX/LLM
    # value: Any                # Full content - only included when explicitly requested
    
    asset_metadata: AssetMetadata

class AssetWithFullContent(Asset):
    """Asset with full content for tool execution"""
    value: Any                  # Full content included
```

### Value Representation Examples

```python
# Large email list
value_representation = "Array of 127 emails (2019-2024), preview: [{subject: 'Q4 Report', from: 'boss@company.com'}, {subject: 'Meeting Notes', from: 'team@company.com'}, ...]"

# Large document
value_representation = "Document: 'Project Proposal' (4,200 words), begins: 'Executive Summary: This proposal outlines our strategy for...'"

# Large dataset
value_representation = "CSV dataset: 15,340 rows × 8 columns (customer_id, name, email, purchase_date, amount, product, category, region)"
```

## Layer 1: Database Models (Relational)

### Asset Storage Strategy
```sql
-- Unified scope-based approach for mission and hop level assets
CREATE TABLE assets (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    scope_type VARCHAR(50) NOT NULL,     -- 'mission' or 'hop'
    scope_id VARCHAR(255) NOT NULL,      -- mission_id or hop_id
    asset_key VARCHAR(255) NOT NULL,     -- The key name within the scope
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    content JSON,                        -- Full content stored here
    content_summary TEXT,                -- Generated summary for value_representation
    status ENUM('pending', 'ready', 'error'),
    role ENUM('input', 'output', 'intermediate'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_scope_assets (scope_type, scope_id, status),
    INDEX idx_scope_role (scope_type, scope_id, role),
    UNIQUE KEY unique_asset_in_scope (scope_type, scope_id, asset_key)
);

CREATE TABLE tool_steps (
    id VARCHAR(36) PRIMARY KEY,
    hop_id VARCHAR(36) REFERENCES hops(id), -- Child points to parent
    tool_id VARCHAR(255) NOT NULL,
    parameter_mapping JSON NOT NULL,
    result_mapping JSON NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed'),
    created_at TIMESTAMP
);
```

### Mission Storage
```python
class Mission(Base):
    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    name = Column(String(255))
    description = Column(Text)
    goal = Column(Text)
    status = Column(Enum(MissionStatus))
    
    # JSON fields for complex data (no asset content)
    success_criteria = Column(JSON)  # List of strings
    current_hop = Column(JSON)       # Hop structure with asset keys only
    hop_history = Column(JSON)       # List of hop structures
    
    # Note: No direct asset relationship - assets link to missions via scope_type='mission', scope_id=mission.id
```

### Hop Storage (in Mission.current_hop JSON)
```json
{
  "id": "hop_123",
  "name": "Filter important emails",
  "hop_state_keys": [
    "emails",
    "important_emails", 
    "temp_filtered"
  ],
  "tool_steps": [
    {
      "id": "step_1",
      "tool_id": "email_filter",
      "parameter_mapping": {
        "emails": {"type": "asset_field", "state_asset": "emails"}
      },
      "result_mapping": {
        "filtered": {"type": "asset_field", "state_asset": "important_emails"}
      }
    }
  ]
}
```

### Asset Scoping Examples
```sql
-- Mission-level assets
INSERT INTO assets (id, user_id, scope_type, scope_id, asset_key, name, type, role, content) VALUES
('asset_abc123', 1, 'mission', 'mission_456', 'emails', 'Email Dataset', 'email', 'input', '[{...}]'),
('asset_def456', 1, 'mission', 'mission_456', 'important_emails', 'Important Emails', 'email', 'output', '[{...}]');

-- Hop-level assets (intermediate results)
INSERT INTO assets (id, user_id, scope_type, scope_id, asset_key, name, type, role, content) VALUES
('asset_ghi789', 1, 'hop', 'hop_123', 'temp_filtered', 'Temp Filtered Results', 'email', 'intermediate', '[{...}]');
```

## Layer 2: Backend Schema/Application Logic

### Mission Schema
```python
class Mission(BaseModel):
    id: str
    name: str
    description: str
    goal: str
    mission_status: MissionStatus
    success_criteria: List[str]
    
    # Asset collections with rich metadata
    inputs: List[Asset]                    # Assets with value_representation
    outputs: List[Asset]                   # Assets with value_representation
    mission_state: Dict[str, Asset]        # name -> Asset with value_representation
    
    # Hop data
    current_hop: Optional[Hop] = None
    hop_history: List[Hop] = []

class Asset(BaseModel):
    """Asset with metadata and value representation (no full content)"""
    id: str
    name: str
    type: str
    status: AssetStatus
    role: AssetRole                        # input, output, intermediate
    description: str
    schema_definition: SchemaType
    value_representation: str              # Truncated/summarized content for display/LLM
    asset_metadata: AssetMetadata
    
    # Full content excluded by default

class AssetWithContent(Asset):
    """Asset with full content for tool execution"""
    value: Any                             # Full content included for tools

class Hop(BaseModel):
    id: str
    name: str
    description: str
    hop_state: Dict[str, Asset]            # hop_key -> Asset with value_representation
    tool_steps: List[ToolStep]
    status: HopStatus
    
    # Convenience methods for role-based filtering
    def get_input_assets(self) -> Dict[str, Asset]:
        return {k: v for k, v in self.hop_state.items() if v.role == 'input'}
    
    def get_output_assets(self) -> Dict[str, Asset]:
        return {k: v for k, v in self.hop_state.items() if v.role == 'output'}
        
    def get_intermediate_assets(self) -> Dict[str, Asset]:
        return {k: v for k, v in self.hop_state.items() if v.role == 'intermediate'}
```

### Asset Summary Service
```python
class AssetSummaryService:
    """Generate intelligent value representations for assets"""
    
    def generate_value_representation(self, asset: AssetWithContent) -> str:
        """Generate a concise representation of asset content"""
        content = asset.value
        
        if content is None:
            return "No content"
            
        if isinstance(content, list):
            return self._summarize_array(content, asset.type)
        elif isinstance(content, dict):
            return self._summarize_object(content, asset.type)
        elif isinstance(content, str):
            return self._summarize_string(content)
        else:
            return f"{type(content).__name__}: {str(content)[:100]}..."
    
    def _summarize_array(self, content: list, asset_type: str) -> str:
        if len(content) == 0:
            return "Empty array"
        
        if asset_type == "email":
            preview = content[:2] if len(content) > 2 else content
            subjects = [item.get('subject', 'No subject') for item in preview if isinstance(item, dict)]
            return f"Array of {len(content)} emails, preview subjects: {subjects}"
        
        return f"Array of {len(content)} items, preview: {content[:3]}"
    
    def _summarize_object(self, content: dict, asset_type: str) -> str:
        keys = list(content.keys())[:5]
        return f"Object with {len(content)} fields: {keys}"
    
    def _summarize_string(self, content: str) -> str:
        if len(content) <= 200:
            return content
        return f"Text ({len(content)} chars): {content[:150]}..."
```

### Asset Service Interface
```python
class AssetService:
    """Service for managing assets with scope-based organization"""
    
    async def create_asset(
        self,
        user_id: int,
        name: str,
        type: str,
        content: Any,
        role: str,
        scope_type: str,
        scope_id: str,
        asset_key: str,
        subtype: Optional[str] = None,
        description: Optional[str] = None,
        asset_metadata: Optional[Dict[str, Any]] = None
    ) -> Asset:
        """Create asset with scope-based organization"""
        # Implementation creates asset with scope fields
        pass
    
    async def get_asset_by_scope(
        self,
        user_id: int,
        scope_type: str,
        scope_id: str,
        asset_key: str
    ) -> Optional[Asset]:
        """Get asset by scope and key"""
        # SELECT * FROM assets WHERE user_id = ? AND scope_type = ? AND scope_id = ? AND asset_key = ?
        pass
    
    async def get_assets_for_scope(
        self,
        user_id: int,
        scope_type: str,
        scope_id: str
    ) -> List[Asset]:
        """Get all assets for a given scope"""
        # SELECT * FROM assets WHERE user_id = ? AND scope_type = ? AND scope_id = ?
        pass
    
    async def get_asset_with_content(
        self,
        asset_id: str,
        user_id: int
    ) -> Optional[AssetWithContent]:
        """Get asset with full content loaded"""
        # Used for tool execution - includes full content
        pass
```

### Tool Execution Interface
```python
@router.post("/tools/steps/{step_id}/execute")
async def execute_tool_step(
    step_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ToolExecutionResponse:
    """Execute a tool step. Everything derived from step_id."""
    
    # Derive context from step_id
    step = await get_tool_step(step_id, db)
    hop = await get_hop_containing_step(step_id, db) 
    mission = await get_mission_containing_hop(hop.id, db)
    
    # Resolve input assets - fetch FULL content for tool execution
    resolved_assets = {}
    for param_name, mapping in step.parameter_mapping.items():
        if mapping.type == "asset_field":
            asset_key = mapping.state_asset
            
            # First check hop-level assets
            hop_asset = await asset_service.get_asset_by_scope(
                user_id=current_user.user_id,
                scope_type="hop",
                scope_id=hop.id,
                asset_key=asset_key
            )
            
            if hop_asset:
                full_asset = await asset_service.get_asset_with_content(
                    hop_asset.id, current_user.user_id
                )
                resolved_assets[param_name] = full_asset.value
            else:
                # Fall back to mission-level assets
                mission_asset = await asset_service.get_asset_by_scope(
                    user_id=current_user.user_id,
                    scope_type="mission",
                    scope_id=mission.id,
                    asset_key=asset_key
                )
                if mission_asset:
                    full_asset = await asset_service.get_asset_with_content(
                        mission_asset.id, current_user.user_id
                    )
                    resolved_assets[param_name] = full_asset.value
    
    # Execute tool with full content
    result = await execute_tool(step.tool_id, resolved_assets, step.resource_configs)
    
    # Update/create output assets
    updated_asset_ids = []
    for output_name, mapping in step.result_mapping.items():
        if mapping.type == "asset_field":
            asset_key = mapping.state_asset
            
            # Check if asset already exists at hop level
            existing_asset = await asset_service.get_asset_by_scope(
                user_id=current_user.user_id,
                scope_type="hop",
                scope_id=hop.id,
                asset_key=asset_key
            )
            
            if existing_asset:
                # Update existing asset
                await asset_service.update_asset(
                    asset_id=existing_asset.id,
                    user_id=current_user.user_id,
                    updates={
                        "content": result[output_name], 
                        "status": "ready",
                        "content_summary": summary_service.generate_summary(result[output_name])
                    }
                )
                updated_asset_ids.append(existing_asset.id)
            else:
                # Create new hop-level asset
                asset = await asset_service.create_asset(
                    user_id=current_user.user_id,
                    name=f"hop_{hop.id}_{asset_key}",
                    type="intermediate",
                    content=result[output_name],
                    role="intermediate",
                    scope_type="hop",
                    scope_id=hop.id,
                    asset_key=asset_key
                )
                updated_asset_ids.append(asset.id)
    
    return ToolExecutionResponse(
        success=True,
        updated_asset_ids=updated_asset_ids
    )
```

## Layer 3: Frontend Schema

### Frontend Mission (Same as Backend)
```typescript
interface Mission {
  id: string
  name: string
  description: string
  goal: string
  mission_status: MissionStatus
  success_criteria: string[]
  
  // Asset collections with rich metadata
  inputs: Asset[]                        // Assets with value_representation
  outputs: Asset[]                       // Assets with value_representation  
  mission_state: Record<string, Asset>   // name -> Asset with value_representation
  
  // Hop data
  current_hop?: Hop
  hop_history: Hop[]
}

interface Asset {
  id: string
  name: string
  type: string
  status: AssetStatus
  role: AssetRole
  description: string
  schema_definition: SchemaType
  value_representation: string           // Rich preview for UX/display
  asset_metadata: AssetMetadata
  // value field excluded - fetch separately when needed
}

interface AssetWithContent extends Asset {
  value: any                             // Full content for tool execution
}

interface Hop {
  id: string
  name: string  
  description: string
  hop_state: Record<string, Asset>       // hop_key -> Asset with value_representation
  tool_steps: ToolStep[]
  status: HopStatus
}
```

### Frontend Asset Loading
```typescript
// Rich display using value_representation
const AssetViewer = ({ asset }: { asset: Asset }) => {
  const [fullAsset, setFullAsset] = useState<AssetWithContent | null>(null)
  const [loading, setLoading] = useState(false)
  
  const loadFullContent = async () => {
    setLoading(true)
    const assetWithContent = await assetApi.getAssetWithContent(asset.id)
    setFullAsset(assetWithContent)
    setLoading(false)
  }
  
  return (
    <div className="asset-viewer">
      <div className="asset-header">
        <h3>{asset.name}</h3>
        <span className={`status ${asset.status}`}>{asset.status}</span>
        <span className={`role ${asset.role}`}>{asset.role}</span>
      </div>
      
      <div className="asset-preview">
        <strong>Content Preview:</strong>
        <p>{asset.value_representation}</p>
      </div>
      
      <div className="asset-metadata">
        <p>Type: {asset.type}</p>
        <p>Created: {asset.asset_metadata.createdAt}</p>
        <p>Token Count: {asset.asset_metadata.token_count}</p>
      </div>
      
      {!fullAsset ? (
        <button onClick={loadFullContent} disabled={loading}>
          {loading ? 'Loading...' : 'Load Full Content'}
        </button>
      ) : (
        <AssetContentViewer asset={fullAsset} />
      )}
    </div>
  )
}
```

### Frontend Asset API
```typescript
export const assetApi = {
  // Get asset with value_representation (default)
  async getAsset(id: string): Promise<Asset> {
    const response = await api.get(`/api/assets/${id}`)
    return response.data
  },

  // Get asset with full content (for tools/detailed view)
  async getAssetWithContent(id: string): Promise<AssetWithContent> {
    const response = await api.get(`/api/assets/${id}/content`)
    return response.data
  },

  // Update mission/hop after tool execution
  async refreshAssetSummary(id: string): Promise<Asset> {
    const response = await api.get(`/api/assets/${id}/summary`)
    return response.data
  }
}
```

## Key Architecture Decisions

### 1. **Rich Asset Metadata**: Full Asset objects with smart content loading
- ✅ `mission_state` and `hop_state` contain full Asset objects (minus large values)
- ✅ `value_representation` provides rich preview for UX and LLM consumption
- ✅ Full content loaded on-demand for tool execution

### 2. **Database Models**: Scope-based approach with content summary
- ✅ `assets.scope_type` ('mission' or 'hop') and `assets.scope_id` define asset scope
- ✅ `assets.asset_key` defines the name within the scope
- ✅ `content` stores full data, `content_summary` for value_representation
- ✅ Asset `role` field indicates purpose within mission/hop
- ✅ Unique constraint on (scope_type, scope_id, asset_key) prevents duplicates

### 3. **Tool Execution**: Only step_id required, smart content loading
- ✅ `POST /tools/steps/{step_id}/execute`
- ✅ Fetch full content only for assets actually used by tools
- ✅ Return updated asset IDs, frontend refreshes summaries

### 4. **Hop State**: Single state dict with rich asset metadata
- ✅ `hop_state: Dict[str, Asset]` with value_representation
- ✅ Role-based filtering via convenience methods
- ✅ **Eliminated**: Separate input/output mappings

### 5. **Frontend**: Same schema as backend, lazy full content loading
- ✅ Rich asset previews immediately available

## Benefits of Scope-Based System

### 1. **Unified Asset Management**
- ✅ Single asset table handles both mission and hop level assets
- ✅ Consistent scoping mechanism across all asset types
- ✅ No separate mission_id/hop_id foreign keys needed

### 2. **Flexible Asset Resolution**
- ✅ Tool execution can check hop-level assets first, fall back to mission-level
- ✅ Asset keys can be reused across different scopes
- ✅ Natural hierarchy: hop assets override mission assets with same key

### 3. **Simplified Queries**
- ✅ Get all assets for a mission: `WHERE scope_type='mission' AND scope_id=mission_id`
- ✅ Get all assets for a hop: `WHERE scope_type='hop' AND scope_id=hop_id`
- ✅ Find specific asset: `WHERE scope_type=? AND scope_id=? AND asset_key=?`

### 4. **Database Efficiency**
- ✅ Unique constraint prevents duplicate asset keys within same scope
- ✅ Efficient indexes on (scope_type, scope_id) for fast scoped queries
- ✅ No need for complex foreign key relationships or junction tables
- ✅ Full content loaded only when explicitly requested
- ✅ Excellent UX with progressive disclosure

## Benefits of This Architecture

1. **Rich UX**: Immediate access to asset metadata and previews
2. **LLM-Friendly**: Value representations perfect for AI context
3. **Performance**: Large content only loaded when needed
4. **Simple**: Single state dicts, no complex mapping objects
5. **Maintainable**: Clear separation between summaries and full content

This architecture provides the best of both worlds: rich metadata for great UX while keeping network payloads reasonable through smart content loading. 