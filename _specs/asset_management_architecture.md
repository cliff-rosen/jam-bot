# Asset Management Architecture Specification

## Overview

This document defines the architecture for asset management across the three-layer system: Frontend (FE), Backend Schema/Application Logic (BE), and Database Models (DB). The goal is to eliminate asset copying, reduce network traffic, and establish clear separation of concerns.

## Core Principles

1. **Single Source of Truth**: Assets live in the database, everything else uses references
2. **Relational Data Model**: Child entities point to parents via foreign keys  
3. **Self-Contained Schemas**: Business objects contain necessary metadata without requiring additional lookups
4. **Minimal Network Traffic**: Only send asset IDs and metadata, not full content
5. **Lazy Asset Resolution**: Load full asset content only when needed

## Layer 1: Database Models (Relational)

### Asset Storage Strategy
```sql
-- Child points to parent approach
CREATE TABLE assets (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    mission_id VARCHAR(36) REFERENCES missions(id), -- Child points to parent
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    content JSON,
    status ENUM('pending', 'ready', 'error'),
    role ENUM('input', 'output', 'intermediate'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_mission_assets (mission_id, status),
    INDEX idx_mission_role (mission_id, role)
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
    current_hop = Column(JSON)       # Hop structure with asset IDs only
    hop_history = Column(JSON)       # List of hop structures
    
    # Relationships (ORM convenience)
    assets = relationship("Asset", back_populates="mission")
```

### Hop Storage (in Mission.current_hop JSON)
```json
{
  "id": "hop_123",
  "name": "Filter important emails",
  "hop_state_asset_ids": {
    "emails": "mission_asset_abc123",
    "important_emails": "mission_asset_def456",
    "temp_filtered": "mission_asset_ghi789"
  },
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

**Key Decision**: No separate `input_mapping`/`output_mapping`. All assets referenced by hop-local keys in `hop_state_asset_ids`.

## Mapping Architecture: Simplified Approach

### Current Problem with Mappings
The traditional approach uses separate mapping objects:
```python
# Traditional (complex)
class Hop:
    input_mapping: Dict[str, str]   # hop_key -> mission_asset_id
    output_mapping: Dict[str, str]  # hop_key -> mission_asset_id  
    hop_state: Dict[str, AssetReference]
```

### Proposed Simplified Approach
```python
# Simplified (single state dict)
class Hop:
    hop_state: Dict[str, AssetReference]  # hop_key -> AssetReference (with mission_asset_id)
    
class AssetReference:
    id: str                    # Mission asset ID
    hop_local_key: str        # Local name within hop ("emails", "result")
    name: str                 # Display name
    type: str
    status: AssetStatus
    role: AssetRole           # input, output, intermediate (relative to hop)
```

### Benefits of Simplified Approach
1. **Single source of state**: No duplicate mapping information
2. **Role-based queries**: `get_input_assets()` filters by `role == 'input'`
3. **Direct tool execution**: Tools use hop_local_key directly
4. **Clearer semantics**: Each asset knows its role and local name

### Tool Execution with Simplified Approach
```python
# Tool parameter mapping
{
  "emails": {"type": "asset_field", "state_asset": "emails"}  # Uses hop_local_key
}

# Asset resolution
def resolve_asset_for_tool(hop_state, state_asset_key):
    asset_ref = hop_state[state_asset_key]  # Direct lookup by hop_local_key
    return asset_service.get_asset(asset_ref.id)  # Fetch full content by mission ID
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
    
    # Asset references with metadata for display
    inputs: List[AssetReference]    # Derived from assets where role='input'
    outputs: List[AssetReference]   # Derived from assets where role='output'
    
    # Hop data
    current_hop: Optional[Hop] = None
    hop_history: List[Hop] = []

class AssetReference(BaseModel):
    """Lightweight asset reference for business logic"""
    id: str                     # Mission asset ID
    hop_local_key: str         # Local name within hop context
    name: str                  # Display name
    type: str
    status: AssetStatus
    role: AssetRole            # input, output, intermediate (context-dependent)
    description: Optional[str] = None
    # NO content field - must be fetched separately when needed

class Hop(BaseModel):
    id: str
    name: str
    description: str
    hop_state: Dict[str, AssetReference]  # hop_local_key -> AssetReference
    tool_steps: List[ToolStep]
    status: HopStatus
    
    # Convenience methods
    def get_input_assets(self) -> Dict[str, AssetReference]:
        return {k: v for k, v in self.hop_state.items() if v.role == 'input'}
    
    def get_output_assets(self) -> Dict[str, AssetReference]:
        return {k: v for k, v in self.hop_state.items() if v.role == 'output'}
        
    def get_intermediate_assets(self) -> Dict[str, AssetReference]:
        return {k: v for k, v in self.hop_state.items() if v.role == 'intermediate'}
```

### Tool Execution Interface
```python
@router.post("/tools/steps/{step_id}/execute")
async def execute_tool_step(
    step_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ToolExecutionResponse:
    """
    Execute a tool step. Everything derived from step_id.
    
    Args:
        step_id: Unique identifier for the tool step
        
    Returns:
        Response with updated asset IDs only
    """
    
    # Derive everything from step_id
    step = await get_tool_step(step_id, db)
    hop = await get_hop_containing_step(step_id, db) 
    mission = await get_mission_containing_hop(hop.id, db)
    
    # Resolve input assets through hop_state
    resolved_assets = {}
    for param_name, mapping in step.parameter_mapping.items():
        if mapping.type == "asset_field":
            # Direct lookup by hop_local_key
            asset_ref = hop.hop_state.get(mapping.state_asset)
            if asset_ref:
                asset = await asset_service.get_asset(asset_ref.id, current_user.user_id)
                resolved_assets[param_name] = asset.value
    
    # Execute tool
    result = await execute_tool(step.tool_id, resolved_assets, step.resource_configs)
    
    # Update/create output assets
    updated_asset_ids = []
    for output_name, mapping in step.result_mapping.items():
        if mapping.type == "asset_field":
            asset_ref = hop.hop_state.get(mapping.state_asset)
            
            if asset_ref:
                # Update existing asset
                await asset_service.update_asset(
                    asset_id=asset_ref.id,
                    user_id=current_user.user_id,
                    updates={"content": result[output_name], "status": "ready"}
                )
                updated_asset_ids.append(asset_ref.id)
            else:
                # Create new intermediate asset
                asset = await asset_service.create_asset(
                    user_id=current_user.user_id,
                    mission_id=mission.id,
                    name=f"hop_{hop.id}_{mapping.state_asset}",
                    type="intermediate",
                    content=result[output_name],
                    role="intermediate"
                )
                
                # Add to hop_state
                new_asset_ref = AssetReference(
                    id=asset.id,
                    hop_local_key=mapping.state_asset,
                    name=asset.name,
                    type=asset.type,
                    status=AssetStatus.READY,
                    role=AssetRole.INTERMEDIATE
                )
                
                await update_hop_state(hop.id, mapping.state_asset, new_asset_ref)
                updated_asset_ids.append(asset.id)
    
    return ToolExecutionResponse(
        success=True,
        updated_asset_ids=updated_asset_ids
    )
```

## Layer 3: Frontend Schema

### Frontend Mission
```typescript
interface Mission {
  id: string
  name: string
  description: string
  goal: string
  mission_status: MissionStatus
  success_criteria: string[]
  
  // Asset references (derived from hop states and database)
  inputs: AssetReference[]    // All assets with role='input' across hops
  outputs: AssetReference[]   // All assets with role='output' across hops
  
  // Hop data
  current_hop?: Hop
  hop_history: Hop[]
}

interface AssetReference {
  id: string                 // Mission asset ID
  hop_local_key: string     // Local name within hop context
  name: string              // Display name
  type: string
  status: AssetStatus
  role: AssetRole           // input, output, intermediate
  description?: string
  // NO content - fetch separately via assetApi.getAsset(id) when needed
}

interface Hop {
  id: string
  name: string
  description: string
  hop_state: Record<string, AssetReference>  // hop_local_key -> AssetReference
  tool_steps: ToolStep[]
  status: HopStatus
}
```

### Frontend Asset Loading
```typescript
// Lazy loading pattern
const AssetViewer = ({ assetRef }: { assetRef: AssetReference }) => {
  const [fullAsset, setFullAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(false)
  
  const loadAsset = async () => {
    setLoading(true)
    const asset = await assetApi.getAsset(assetRef.id)  // Fetch full content
    setFullAsset(asset)
    setLoading(false)
  }
  
  return (
    <div>
      <div>
        Local Key: {assetRef.hop_local_key} | 
        Name: {assetRef.name} | 
        Role: {assetRef.role} |
        Status: {assetRef.status}
      </div>
      {!fullAsset ? (
        <button onClick={loadAsset}>Load Content</button>
      ) : (
        <AssetContentViewer asset={fullAsset} />
      )}
    </div>
  )
}
```

### Frontend Tool Execution
```typescript
const executeToolStep = async (stepId: string) => {
  // Send only step ID - everything else derived on backend
  const result = await toolsApi.executeToolStep(stepId)
  
  if (result.success) {
    // Refresh affected asset references (metadata only)
    for (const assetId of result.updated_asset_ids) {
      await refreshAssetReference(assetId)
    }
    
    // Refresh hop state
    await refreshCurrentHop()
  }
}

const refreshAssetReference = async (assetId: string) => {
  const assetRef = await assetApi.getAssetReference(assetId)  // Get metadata only
  // Update local state with new AssetReference
  updateAssetReferenceInState(assetId, assetRef)
}
```

## Key Architecture Decisions

### 1. **Database Models**: Relational approach with child → parent FKs
- ✅ `assets.mission_id` points to mission
- ✅ All assets belong to mission, even intermediates
- ✅ Asset `role` field indicates purpose within mission/hop

### 2. **Backend Schema**: Self-contained with AssetReferences
- ✅ Mission contains derived `inputs`/`outputs` lists for convenience
- ✅ Hop contains `hop_state` with `AssetReference` for all assets
- ✅ No full asset content in business objects
- ✅ **Simplified**: No separate input/output mappings

### 3. **Tool Execution**: Only step_id required
- ✅ `POST /tools/steps/{step_id}/execute`
- ✅ Derive hop, mission, assets from step_id
- ✅ Direct asset lookup via hop_local_key
- ✅ Return only `updated_asset_ids`

### 4. **Hop State**: Single state dict with role-based filtering
- ✅ `hop_state: Dict[str, AssetReference]` for all assets
- ✅ Input assets: `role == 'input'`
- ✅ Output assets: `role == 'output'` 
- ✅ Intermediate assets: `role == 'intermediate'`
- ✅ **Eliminated**: Separate `input_mapping` and `output_mapping`

### 5. **Frontend**: Mirrors backend schema
- ✅ Same `AssetReference` structure with hop_local_key
- ✅ Lazy loading for full asset content
- ✅ Role-based asset organization
- ✅ Small differences allowed (e.g., local caching, UI state)

## Benefits of This Architecture

1. **Reduced Complexity**: Single state dict instead of multiple mapping objects
2. **Better Performance**: No asset copying, lazy loading, minimal network traffic
3. **Clear Semantics**: Each asset knows its role and local context
4. **Maintainable**: Self-contained objects with clear relationships
5. **Scalable**: Database-driven with proper indexing and foreign keys

This architecture eliminates asset copying, reduces network traffic, and provides a clean separation of concerns while maintaining the flexibility needed for complex workflow execution. 