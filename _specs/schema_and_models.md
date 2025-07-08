# Schema and Models Architecture

## Design Philosophy

**Terminology:**
- **Logic Model** = Conceptual business entities and their relationships
- **Database Model** = Relational implementation (SQLAlchemy)
- **Python Schema** = Business logic layer (Pydantic)
- **TypeScript Types** = Frontend representations

## 1. Logic Model

### Core Entities

**Mission**: A high-level goal that requires multiple steps to complete
- Has a goal and success criteria
- Composed of sequential Hops
- Tracks overall progress through status transitions
- **Design Decision**: Maintains `current_hop_id` to track active hop and `hop_history` for all hops

**Hop**: A single execution phase within a Mission
- Contains one or more ToolSteps that execute together
- Has its own goal and success criteria  
- Produces outputs that feed into next Hop

**ToolStep**: An atomic unit of work using a specific tool
- Maps inputs from available assets
- Executes tool with those inputs
- Maps outputs to create new assets

**Asset**: A piece of data/content with a specific role
- Can be `input` (available at start), `output` (produced by tools), or `intermediate` (temporary)
- Scoped to either Mission or Hop level
- Contains actual data/content plus metadata

### Key Relationships

```
Mission 1→* Hop 1→* ToolStep
Mission 1→1 Hop (current_hop_id → current hop)
Mission 1→* Asset (mission-scoped)
Hop 1→* Asset (hop-scoped)
ToolStep references Asset (via parameter/result mappings)
```

## 2. Database Implementation

### Relational Design

**Mission Table**: Includes `current_hop_id` for tracking active hop
- `current_hop_id` references `hops.id` (nullable - no current hop initially)
- `hops` relationship returns all hops ordered by sequence
- Enables efficient querying of current state

**Assets Table**: Single table for all assets with scope discriminator
- `scope_type` + `scope_id` identifies what owns the asset
- `role` determines if it's input, output, or intermediate
- No separate input/output ID arrays on Mission/Hop tables

**Why No Asset ID Arrays?**
- Eliminates data duplication
- Single source of truth for asset relationships
- Flexible querying by scope and role
- Easier to maintain consistency

**Query Pattern:**
```sql
-- Get mission inputs
SELECT * FROM assets WHERE scope_type='mission' AND scope_id=? AND role='input'

-- Get current hop
SELECT * FROM hops WHERE id = (SELECT current_hop_id FROM missions WHERE id=?)
```

### Foreign Keys & Constraints
- `missions.current_hop_id` → `hops.id` (nullable)
- `hops.mission_id` → `missions.id`
- `tool_steps.hop_id` → `hops.id`  
- `assets.scope_id` → `missions.id` OR `hops.id` (depending on scope_type)
- Unique constraints on sequence_order within parent scope

## 3. Python vs TypeScript Differences

### Python Schema (Pydantic)
**Purpose**: Business logic validation and API contracts
- Validates data types and business rules
- Handles serialization/deserialization
- Optional fields for API flexibility

**Current Hop Design:**
```python
class Mission(BaseModel):
    current_hop_id: Optional[str] = None  # Database field
    current_hop: Optional[Hop] = None     # Populated relationship
    hop_history: List[Hop] = []           # All hops (populated)
    # NO input_asset_ids or output_asset_ids fields
```

### TypeScript Types
**Purpose**: Frontend type safety and IDE support
- Mirrors backend structure for consistency
- Includes optional relationship fields for populated data
- Handles JSON serialization from API

**Current Hop Design:**
```typescript
interface Mission {
    current_hop_id?: string;     // Database field
    current_hop?: Hop;           // Populated relationship
    hops?: Hop[];                // hop_history equivalent
    // NO input_asset_ids or output_asset_ids fields
}
```

### State Management Differences

**Backend State**: Database-driven, always authoritative
- `current_hop_id` stored in database for persistence
- `current_hop` populated via JOIN when needed
- `hop_history` built from `hops` relationship ordered by sequence
- Assets queried on-demand by scope/role

**Frontend State**: Cached and denormalized for performance
- `current_hop_id` used to identify active hop in cached data
- `current_hop` populated by matching ID in hops array
- `hops` array contains full hop history for display
- Assets fetched separately and stored in state

## 4. Status Sequences

### Mission Status Flow
```
PROPOSED → READY_FOR_NEXT_HOP → BUILDING_HOP → HOP_READY_TO_EXECUTE → EXECUTING_HOP → [repeat or end]
                                                                                    ↓
                                                                              COMPLETED/FAILED/CANCELLED
```

**Status Meanings:**
- `PROPOSED`: Mission defined but not started
- `READY_FOR_NEXT_HOP`: Previous hop completed, ready to design next
- `BUILDING_HOP`: AI agent designing the next hop
- `HOP_READY_TO_EXECUTE`: Hop designed and validated, ready to run
- `EXECUTING_HOP`: Current hop is running
- `COMPLETED/FAILED/CANCELLED`: Terminal states

### Hop Status Flow
```
PROPOSED → READY_TO_RESOLVE → READY_TO_EXECUTE → EXECUTING → COMPLETED/FAILED/CANCELLED
```

**Status Meanings:**
- `PROPOSED`: Hop suggested but not finalized
- `READY_TO_RESOLVE`: Hop approved, ready for tool resolution
- `READY_TO_EXECUTE`: Tools mapped and validated
- `EXECUTING`: Tools are running
- `COMPLETED/FAILED/CANCELLED`: Terminal states

### Tool Execution Status Flow
```
PROPOSED → READY_TO_CONFIGURE → READY_TO_EXECUTE → EXECUTING → COMPLETED/FAILED/CANCELLED
```

## 5. Assets and Values

### Asset Content Strategy

**Why JSON Content Field?**
- Flexible schema - different asset types need different structures
- Avoids complex inheritance hierarchies
- Enables rapid prototyping of new asset types
- Simplifies serialization across layers

**Asset Types & Content:**
```python
# Text asset
{
    "type": "text",
    "content": {"text": "Hello world", "encoding": "utf-8"}
}

# File asset  
{
    "type": "file",
    "content": {"filename": "data.csv", "size": 1024, "mime_type": "text/csv"}
}

# API response asset
{
    "type": "api_response", 
    "content": {"data": {...}, "status_code": 200, "headers": {...}}
}
```

### Value Handling Philosophy

**Flexible Content**: Assets can contain any JSON-serializable data
- Enables tools to work with diverse data types
- Content validation happens at tool execution time
- Schema evolution doesn't require database migrations

**Metadata Separation**: 
- `content`: The actual data/value
- `asset_metadata`: System metadata (creation time, source, etc.)
- `db_entity_metadata`: Database-specific metadata

**Type Safety Strategy:**
- Loose typing in database (JSON)
- Strong typing in tool definitions
- Runtime validation during tool execution
- Clear error messages for type mismatches

This architecture provides flexibility while maintaining consistency across all layers. 