# Schema and Models Architecture - Source of Truth

## Design Philosophy

**Terminology:**
- **Logical Model** = Conceptual business entities and relationships
- **Database Model** = Relational implementation (SQLAlchemy)
- **Python Schema** = Business logic layer (Pydantic)
- **TypeScript Types** = Frontend representations

## 1. Logical Model

### Core Entities

**Mission**: A high-level goal requiring multiple execution steps
- Tracks overall progress through status transitions
- Maintains current_hop_id for active hop tracking
- Contains hop_history for all hops in sequence
- Assets scoped to mission level for persistent data

**Hop**: A single execution phase within a Mission
- Sequential execution unit with unique sequence_order
- Contains one or more tool_steps that execute as a chain
- Assets scoped to hop level for intermediate data
- Tracks resolution and completion state

**ToolStep**: An atomic unit of work using a specific tool
- References input and output assets directly by ID in parameter/result mappings
- Executes within hop context
- Creates/updates assets based on tool outputs

**Asset**: Data/content with lifecycle management and value representation
- Scoped to mission or hop level via scope_type/scope_id
- Has status (pending/ready/error) and role (input/output/intermediate)
- Uses value representation strategy for efficient display/LLM consumption
- Stores full content plus generated summary

### Key Relationships

```
Mission 1→1 Hop (current_hop_id)
Mission 1→* Hop (hop_history via mission_id)
Mission 1→* Asset (scope_type='mission', scope_id=mission.id)
Hop 1→* ToolStep (hop_id)
Hop 1→* Asset (scope_type='hop', scope_id=hop.id)
ToolStep references Asset (via parameter/result mappings)
```

## 2. Database Models (SQLAlchemy)

### Required Enums

```python
class MissionStatus(str, PyEnum):
    PROPOSED = "proposed"
    READY_FOR_NEXT_HOP = "ready_for_next_hop"
    BUILDING_HOP = "building_hop"
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute"
    EXECUTING_HOP = "executing_hop"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class HopStatus(str, PyEnum):
    PROPOSED = "proposed"
    READY_TO_RESOLVE = "ready_to_resolve"
    READY_TO_EXECUTE = "ready_to_execute"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ToolExecutionStatus(str, PyEnum):
    PROPOSED = "proposed"
    READY_TO_CONFIGURE = "ready_to_configure"
    READY_TO_EXECUTE = "ready_to_execute"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AssetStatus(str, PyEnum):
    PROPOSED = "proposed"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    READY = "ready"
    ERROR = "error"
    EXPIRED = "expired"

class AssetRole(str, PyEnum):
    INPUT = "input"
    OUTPUT = "output"
    INTERMEDIATE = "intermediate"

class AssetScopeType(str, PyEnum):
    MISSION = "mission"
    HOP = "hop"
```

### Mission Model

```python
class Mission(Base):
    __tablename__ = "missions"
    
    # Core fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    success_criteria = Column(JSON, nullable=True)  # List[str]
    status = Column(Enum(MissionStatus), nullable=False, default=MissionStatus.PROPOSED)
    
    # Current hop tracking
    current_hop_id = Column(String(36), ForeignKey("hops.id"), nullable=True)
    
    # Mission data
    mission_metadata = Column(JSON, nullable=True)  # Dict[str, Any]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="missions")
    current_hop = relationship("Hop", foreign_keys=[current_hop_id], post_update=True)
    hops = relationship("Hop", back_populates="mission", cascade="all, delete-orphan", 
                       order_by="Hop.sequence_order", foreign_keys="Hop.mission_id")
    # Asset relationships for mission_state access
    assets = relationship("Asset", 
                         primaryjoin="and_(Mission.id == foreign(Asset.scope_id), Asset.scope_type == 'mission')",
                         viewonly=True)
```

### Hop Model

```python
class Hop(Base):
    __tablename__ = "hops"
    
    # Core fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    
    # Hop information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    success_criteria = Column(JSON, nullable=True)  # List[str]
    rationale = Column(Text, nullable=True)
    status = Column(Enum(HopStatus), nullable=False, default=HopStatus.PROPOSED)
    
    # Hop state
    is_final = Column(Boolean, nullable=False, default=False)
    is_resolved = Column(Boolean, nullable=False, default=False)
    error_message = Column(Text, nullable=True)
    hop_metadata = Column(JSON, nullable=True)  # Dict[str, Any]
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mission = relationship("Mission", back_populates="hops")
    user = relationship("User", back_populates="hops")
    tool_steps = relationship("ToolStep", back_populates="hop", cascade="all, delete-orphan", 
                            order_by="ToolStep.sequence_order")
    
    # Asset relationships for hop_state access
    assets = relationship("Asset",
                         primaryjoin="and_(Hop.id == foreign(Asset.scope_id), Asset.scope_type == 'hop')",
                         viewonly=True)
```

### ToolStep Model

```python
class ToolStep(Base):
    __tablename__ = "tool_steps"
    
    # Core fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    hop_id = Column(String(36), ForeignKey("hops.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    tool_id = Column(String(255), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    
    # Tool step information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ToolExecutionStatus), nullable=False, default=ToolExecutionStatus.PROPOSED)
    
    # Tool configuration
    parameter_mapping = Column(JSON, nullable=True)  # Dict[str, ParameterMapping]
    result_mapping = Column(JSON, nullable=True)     # Dict[str, ResultMapping]
    resource_configs = Column(JSON, nullable=True)   # Dict[str, Resource]
    
    # Execution data
    validation_errors = Column(JSON, nullable=True)  # List[str]
    execution_result = Column(JSON, nullable=True)   # Dict[str, Any]
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    hop = relationship("Hop", back_populates="tool_steps")
    user = relationship("User")
```

### Asset Model (Value Representation Strategy)

```python
class Asset(Base):
    __tablename__ = "assets"
    
    # Core fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    scope_type = Column(Enum(AssetScopeType), nullable=False)
    scope_id = Column(String(255), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(255), nullable=False)
    subtype = Column(String(255), nullable=True)
    
    # Asset lifecycle
    status = Column(Enum(AssetStatus), nullable=False, default=AssetStatus.PENDING)
    role = Column(Enum(AssetRole), nullable=False)
    
    # Content strategy
    content = Column(JSON, nullable=True)            # Full content
    content_summary = Column(Text, nullable=True)    # For value_representation
    db_entity_metadata = Column(JSON, nullable=True)
   
    # Metadata
    asset_metadata = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="assets")
    
    # Indexes
    __table_args__ = (
        Index('idx_assets_scope', 'scope_type', 'scope_id'),
        Index('idx_assets_role', 'role'),
        Index('idx_assets_status', 'status'),
    )
```

## 3. Python Schema (Pydantic)

### Asset Collection Philosophy

**Core Principle**: Mission and Hop state are represented as unified asset collections. Since each Asset has a `role` field (input/output/intermediate), we do NOT maintain separate `inputs` and `outputs` collections.

**Why This Approach:**
- **Single Source of Truth**: Asset role is stored once in the Asset.role field
- **No Duplication**: Eliminates redundant storage of asset references
- **Dynamic Filtering**: Can derive inputs/outputs on-demand by filtering assets by role
- **Maintainability**: Changes to asset roles automatically reflected in all queries
- **Consistency**: Same pattern for mission_state and hop_state

**Usage Pattern:**
```python
# Get inputs from mission_state
mission_inputs = [asset for asset in mission.mission_state.values() if asset.role == AssetRole.INPUT]

# Get outputs from hop_state  
hop_outputs = [asset for asset in hop.hop_state.values() if asset.role == AssetRole.OUTPUT]

# Get all assets regardless of role
all_mission_assets = list(mission.mission_state.values())
```

### Mission Schema

```python
class Mission(BaseModel):
    # Core fields
    id: str
    user_id: int
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    success_criteria: List[str] = Field(default_factory=list)
    status: MissionStatus = MissionStatus.PROPOSED
    
    # Current hop tracking
    current_hop_id: Optional[str] = None
    
    # Metadata
    mission_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships (populated by services)
    current_hop: Optional['Hop'] = None
    hops: List['Hop'] = Field(default_factory=list)  # hop_history
    
    # Asset collection - unified approach (filter by Asset.role for inputs/outputs)
    mission_state: Dict[str, 'Asset'] = Field(default_factory=dict)  # all mission assets by name
```

### Hop Schema

```python
class Hop(BaseModel):
    # Core fields
    id: str
    mission_id: str
    user_id: int
    sequence_order: int
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    success_criteria: List[str] = Field(default_factory=list)
    rationale: Optional[str] = None
    status: HopStatus = HopStatus.PROPOSED
    
    # Hop state
    is_final: bool = False
    is_resolved: bool = False
    error_message: Optional[str] = None
    hop_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships (populated by services)
    tool_steps: List['ToolStep'] = Field(default_factory=list)
    
    # Asset collections (all hop-scoped assets by name)
    hop_state: Dict[str, 'Asset'] = Field(default_factory=dict)
```

### ToolStep Schema

```python
class ToolStep(BaseModel):
    # Core fields
    id: str
    hop_id: str
    user_id: int
    tool_id: str
    sequence_order: int
    name: str
    description: Optional[str] = None
    status: ToolExecutionStatus = ToolExecutionStatus.PROPOSED
    
    # Tool configuration
    parameter_mapping: Dict[str, Any] = Field(default_factory=dict)  # ParameterMapping objects
    result_mapping: Dict[str, Any] = Field(default_factory=dict)     # ResultMapping objects
    resource_configs: Dict[str, Any] = Field(default_factory=dict)   # Resource objects
    
    # Execution data
    validation_errors: List[str] = Field(default_factory=list)
    execution_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
```

### Asset Schema (Value Representation)

```python
class Asset(BaseModel):
    """Asset with metadata and value representation (no full content)"""
    # Core fields
    id: str
    user_id: int
    name: str
    description: Optional[str] = None
    type: str
    subtype: Optional[str] = None
    
    # Scope information
    scope_type: AssetScopeType
    scope_id: str
    
    # Asset lifecycle
    status: AssetStatus = AssetStatus.PENDING
    role: AssetRole
    
    # Value representation (generated from content_summary)
    value_representation: str
    
    # Metadata
    asset_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AssetWithContent(Asset):
    """Asset with full content for tool execution"""
    content: Any  # Full content included
    content_summary: Optional[str] = None  # Generated summary for value_representation
```

## 4. TypeScript Types

### Enums

```typescript
export enum MissionStatus {
    PROPOSED = "proposed",
    READY_FOR_NEXT_HOP = "ready_for_next_hop",
    BUILDING_HOP = "building_hop",
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute",
    EXECUTING_HOP = "executing_hop",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

export enum HopStatus {
    PROPOSED = "proposed",
    READY_TO_RESOLVE = "ready_to_resolve",
    READY_TO_EXECUTE = "ready_to_execute",
    EXECUTING = "executing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

export enum ToolExecutionStatus {
    PROPOSED = "proposed",
    READY_TO_CONFIGURE = "ready_to_configure",
    READY_TO_EXECUTE = "ready_to_execute",
    EXECUTING = "executing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

export enum AssetStatus {
    PROPOSED = "proposed",
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    READY = "ready",
    ERROR = "error",
    EXPIRED = "expired"
}

export enum AssetRole {
    INPUT = "input",
    OUTPUT = "output",
    INTERMEDIATE = "intermediate"
}

export enum AssetScopeType {
    MISSION = "mission",
    HOP = "hop"
}
```

### Mission Interface

```typescript
export interface Mission {
    // Core fields
    id: string;
    user_id: number;
    name: string;
    description?: string;
    goal?: string;
    status: MissionStatus;
    success_criteria: string[];
    
    // Current hop tracking
    current_hop_id?: string;
    
    // Metadata
    mission_metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    
    // Relationships
    current_hop?: Hop;
    hops: Hop[];  // hop_history
    
    // Asset collection - unified approach (filter by Asset.role for inputs/outputs)
    mission_state: Record<string, Asset>;  // all mission assets by name
}
```

### Hop Interface

```typescript
export interface Hop {
    // Core fields
    id: string;
    mission_id: string;
    user_id: number;
    sequence_order: number;
    name: string;
    description?: string;
    goal?: string;
    success_criteria: string[];
    rationale?: string;
    status: HopStatus;
    
    // Hop state
    is_final: boolean;
    is_resolved: boolean;
    error_message?: string;
    hop_metadata: Record<string, any>;
    
    // Timestamps
    created_at: string;
    updated_at: string;
    
    // Relationships
    tool_steps: ToolStep[];
    
    // Asset collections (all hop-scoped assets by name)
    hop_state: Record<string, Asset>;
}
```

### ToolStep Interface

```typescript
export interface ToolStep {
    // Core fields
    id: string;
    hop_id: string;
    user_id: number;
    tool_id: string;
    sequence_order: number;
    name: string;
    description?: string;
    status: ToolExecutionStatus;
    
    // Tool configuration
    parameter_mapping: Record<string, any>;  // ParameterMapping objects
    result_mapping: Record<string, any>;     // ResultMapping objects  
    resource_configs: Record<string, any>;   // Resource objects
    
    // Execution data
    validation_errors: string[];
    execution_result?: Record<string, any>;
    error_message?: string;
    
    // Timestamps
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
}
```

### Asset Interface (Value Representation)

```typescript
export interface Asset {
    // Core fields
    id: string;
    user_id: number;
    name: string;
    description?: string;
    type: string;
    subtype?: string;
    
    // Scope information
    scope_type: AssetScopeType;
    scope_id: string;
    
    // Asset lifecycle
    status: AssetStatus;
    role: AssetRole;
    
    // Value representation
    value_representation: string;
    
    // Metadata
    asset_metadata: Record<string, any>;
    
    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface AssetWithContent extends Asset {
    content: any;  // Full content for tool execution
    content_summary?: string;  // Generated summary
}
```

## 5. Asset Query Patterns

### Mission Assets
```sql
-- Get mission inputs
SELECT * FROM assets WHERE scope_type='mission' AND scope_id=? AND role='input';

-- Get mission outputs  
SELECT * FROM assets WHERE scope_type='mission' AND scope_id=? AND role='output';
```

### Hop Assets
```sql
-- Get hop state assets
SELECT * FROM assets WHERE scope_type='hop' AND scope_id=?;

-- Get hop intermediates
SELECT * FROM assets WHERE scope_type='hop' AND scope_id=? AND role='intermediate';
```

### Current Hop
```sql
-- Get current hop
SELECT * FROM hops WHERE id = (SELECT current_hop_id FROM missions WHERE id=?);
```

## 6. Status Sequences

### Mission Status Flow
```
PROPOSED → READY_FOR_NEXT_HOP → BUILDING_HOP → HOP_READY_TO_EXECUTE → EXECUTING_HOP → [loop or end]
                                                                                     ↓
                                                                              COMPLETED/FAILED/CANCELLED
```

### Hop Status Flow
```
PROPOSED → READY_TO_RESOLVE → READY_TO_EXECUTE → EXECUTING → COMPLETED/FAILED/CANCELLED
```

### Asset Status Flow
```
PROPOSED → PENDING → IN_PROGRESS → READY → [ERROR/EXPIRED]
```

## 7. Value Representation Strategy

### Content Summary Generation
- **Small assets (< 1KB)**: Full content in `content_summary`
- **Large arrays**: "Array of N items, preview: [first 3 items]"
- **Large objects**: "Object with N fields: [key names]"
- **Large text**: "Text (N chars): [first 150 chars]..."

### Asset Loading Strategy
- **Default**: Asset with `value_representation` only
- **Tool execution**: Asset with full `content` loaded
- **Frontend**: Progressive disclosure - summary first, full content on demand

### Asset Collection Access Patterns

**Mission Assets:**
```python
# All mission assets
all_assets = list(mission.mission_state.values())

# Filter by role
inputs = [a for a in mission.mission_state.values() if a.role == AssetRole.INPUT]
outputs = [a for a in mission.mission_state.values() if a.role == AssetRole.OUTPUT]
```

**Hop Assets:**
```python
# All hop assets
all_assets = list(hop.hop_state.values())

# Filter by role
inputs = [a for a in hop.hop_state.values() if a.role == AssetRole.INPUT]
intermediates = [a for a in hop.hop_state.values() if a.role == AssetRole.INTERMEDIATE]
```

This architecture provides efficient asset management with rich metadata while maintaining a single source of truth for asset roles and eliminating redundant collections. 