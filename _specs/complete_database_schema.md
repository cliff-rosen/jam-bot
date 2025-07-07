# Complete Database Schema for Mission System

## Tables Overview

```
users → missions → hops → tool_steps
  ↓
assets (scoped to mission or hop)
```

## User Table
```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email),
    INDEX idx_users_active (is_active)
);
```

## Mission Table
```sql
CREATE TABLE missions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal TEXT,
    status ENUM('pending', 'active', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    success_criteria JSON,  -- Array of strings
    current_hop_id VARCHAR(36),  -- Foreign key to hops table
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (current_hop_id) REFERENCES hops(id) ON DELETE SET NULL,
    
    INDEX idx_missions_user (user_id),
    INDEX idx_missions_status (status),
    INDEX idx_missions_user_status (user_id, status),
    INDEX idx_missions_current_hop (current_hop_id)
);
```

## Hop Table
```sql
CREATE TABLE hops (
    id VARCHAR(36) PRIMARY KEY,
    mission_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'active', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    sequence_order INT NOT NULL,  -- Order within mission (0, 1, 2, ...)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
    
    INDEX idx_hops_mission (mission_id),
    INDEX idx_hops_status (status),
    INDEX idx_hops_mission_status (mission_id, status),
    INDEX idx_hops_mission_order (mission_id, sequence_order),
    UNIQUE KEY uk_hops_mission_order (mission_id, sequence_order)
);
```

## ToolStep Table
```sql
CREATE TABLE tool_steps (
    id VARCHAR(36) PRIMARY KEY,
    hop_id VARCHAR(36) NOT NULL,
    tool_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    sequence_order INT NOT NULL,  -- Order within hop (0, 1, 2, ...)
    parameter_mapping JSON NOT NULL,  -- Map[String, ParameterMapping]
    result_mapping JSON NOT NULL,    -- Map[String, ResultMapping]
    execution_result JSON,           -- Tool execution results
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    
    FOREIGN KEY (hop_id) REFERENCES hops(id) ON DELETE CASCADE,
    
    INDEX idx_tool_steps_hop (hop_id),
    INDEX idx_tool_steps_status (status),
    INDEX idx_tool_steps_hop_status (hop_id, status),
    INDEX idx_tool_steps_hop_order (hop_id, sequence_order),
    UNIQUE KEY uk_tool_steps_hop_order (hop_id, sequence_order)
);
```

## Asset Table
```sql
CREATE TABLE assets (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    scope_type ENUM('mission', 'hop') NOT NULL,
    scope_id VARCHAR(36) NOT NULL,  -- mission_id or hop_id
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255) NOT NULL,
    subtype VARCHAR(255),
    role ENUM('input', 'output', 'intermediate') NOT NULL,
    status ENUM('pending', 'ready', 'error') NOT NULL DEFAULT 'pending',
    content JSON,                    -- Full data value
    content_summary TEXT,            -- For value_representation
    asset_metadata JSON NOT NULL DEFAULT '{}',  -- AssetMetadata object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_assets_user (user_id),
    INDEX idx_assets_scope (scope_type, scope_id),
    INDEX idx_assets_user_scope (user_id, scope_type, scope_id),
    INDEX idx_assets_status (status),
    INDEX idx_assets_role (role),
    INDEX idx_assets_type (type)
);
```

## ResourceCredentials Table (existing)
```sql
CREATE TABLE resource_credentials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    resource_id VARCHAR(50) NOT NULL,
    credentials JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_resource (user_id, resource_id)
);
```

## JSON Field Schemas

### ParameterMapping
```json
{
  "type": "asset_field" | "literal_value" | "config_value",
  "state_asset": "asset_uuid",     // when type=asset_field
  "literal_value": any,            // when type=literal_value
  "config_key": "string"           // when type=config_value
}
```

### ResultMapping
```json
{
  "type": "asset_field" | "ignore",
  "state_asset": "asset_uuid"      // when type=asset_field
}
```

### AssetMetadata
```json
{
  "creator": "string",
  "tags": ["string"],
  "agent_associations": ["string"],
  "version": 1,
  "token_count": 0
}
```

## Relationships Summary

### Foreign Key Relationships
- `missions.user_id` → `users.user_id`
- `missions.current_hop_id` → `hops.id`
- `hops.mission_id` → `missions.id`
- `tool_steps.hop_id` → `hops.id`
- `assets.user_id` → `users.user_id`
- `assets.scope_id` → `missions.id` OR `hops.id` (based on scope_type)

### Logical Relationships
- User has many Missions
- Mission has many Hops (ordered by sequence_order)
- Mission has current_hop (active hop)
- Hop has many ToolSteps (ordered by sequence_order)
- Mission has many Assets (where scope_type='mission')
- Hop has many Assets (where scope_type='hop')
- ToolStep references Assets via parameter_mapping and result_mapping

## Cascade Behavior
- Delete User → Delete all Missions, Assets, ResourceCredentials
- Delete Mission → Delete all Hops, Mission-scoped Assets
- Delete Hop → Delete all ToolSteps, Hop-scoped Assets
- Delete current_hop → Set mission.current_hop_id to NULL

## Performance Considerations

### Primary Indexes
- All tables have UUID primary keys for global uniqueness
- Sequence ordering for deterministic hop/step execution

### Query Optimization Indexes
- User-based queries: `idx_missions_user`, `idx_assets_user`
- Status-based queries: `idx_missions_status`, `idx_hops_status`, `idx_tool_steps_status`
- Scope-based queries: `idx_assets_scope`, `idx_assets_user_scope`
- Execution order: `idx_hops_mission_order`, `idx_tool_steps_hop_order`

### Unique Constraints
- Sequence ordering within parent: `uk_hops_mission_order`, `uk_tool_steps_hop_order`
- User resource uniqueness: `uk_user_resource`

## Data Integrity

### Referential Integrity
- All foreign keys with appropriate cascade/nullify behavior
- Scope validation enforced at application level (scope_id must exist)

### Business Logic Constraints
- Only one active hop per mission (enforced by current_hop_id)
- Sequential execution order within hops and tool steps
- Asset scope_id must match existing mission_id or hop_id

## Migration Strategy

### From Current Schema
1. Create new tables (hops, tool_steps)
2. Migrate missions.current_hop JSON → hops table + missions.current_hop_id
3. Migrate missions.hop_history JSON → hops table
4. Update assets table with new scope fields (already done)
5. Update application code to use relational queries
6. Drop old JSON fields from missions table 