# Complete Logical Schema

## Mission
```
Mission {
    id: UUID
    user_id: UUID
    name: String
    description: String
    goal: String
    status: Enum[pending, active, completed, failed, cancelled]
    success_criteria: String[]
    created_at: DateTime
    updated_at: DateTime
    
    // Relationships
    current_hop: Hop?
    hop_history: Hop[]
    assets: Asset[]  // scope_type='mission', scope_id=mission.id
}
```

## Hop
```
Hop {
    id: UUID
    mission_id: UUID
    name: String
    description: String
    status: Enum[pending, active, completed, failed, cancelled]
    created_at: DateTime
    updated_at: DateTime
    
    // Relationships
    tool_steps: ToolStep[]
    assets: Asset[]  // scope_type='hop', scope_id=hop.id
}
```

## ToolStep
```
ToolStep {
    id: UUID
    hop_id: UUID
    tool_id: String
    name: String
    description: String
    status: Enum[pending, running, completed, failed, cancelled]
    parameter_mapping: Map[String, ParameterMapping]
    result_mapping: Map[String, ResultMapping]
    created_at: DateTime
    updated_at: DateTime
    started_at: DateTime?
    completed_at: DateTime?
    error_message: String?
}

ParameterMapping {
    type: Enum[asset_field, literal_value, config_value]
    state_asset: UUID?     // asset_id when type=asset_field
    literal_value: Any?    // when type=literal_value
    config_key: String?    // when type=config_value
}

ResultMapping {
    type: Enum[asset_field, ignore]
    state_asset: UUID?     // asset_id when type=asset_field
}
```

## Asset
```
Asset {
    id: UUID
    user_id: UUID
    scope_type: Enum[mission, hop]
    scope_id: UUID         // mission_id or hop_id
    name: String
    description: String
    type: String
    subtype: String?
    role: Enum[input, output, intermediate]
    status: Enum[pending, ready, error]
    content: JSON          // Full data value
    content_summary: String // For value_representation
    asset_metadata: AssetMetadata
    created_at: DateTime
    updated_at: DateTime
}

AssetMetadata {
    creator: String?
    tags: String[]
    agent_associations: String[]
    version: Integer
    token_count: Integer
}
```

## Complete Hierarchy
```
User
├── Mission
│   ├── id, name, description, goal, status, success_criteria
│   ├── current_hop: Hop
│   ├── hop_history: Hop[]
│   ├── assets: Asset[] (scope_type='mission')
│   │   ├── Asset (role='input')
│   │   ├── Asset (role='output')
│   │   └── Asset (role='intermediate')
│   └── hops:
│       └── Hop
│           ├── id, name, description, status
│           ├── assets: Asset[] (scope_type='hop')
│           │   ├── Asset (role='input')
│           │   ├── Asset (role='output')
│           │   └── Asset (role='intermediate')
│           └── tool_steps: ToolStep[]
│               └── ToolStep
│                   ├── id, tool_id, name, status
│                   ├── parameter_mapping: Map[String, ParameterMapping]
│                   │   └── ParameterMapping
│                   │       ├── type, state_asset (→ Asset.id)
│                   │       └── literal_value, config_key
│                   └── result_mapping: Map[String, ResultMapping]
│                       └── ResultMapping
│                           ├── type, state_asset (→ Asset.id)
│                           └── ignore
```

## Key Relationships
- Mission.current_hop → Hop.id
- Hop.mission_id → Mission.id
- ToolStep.hop_id → Hop.id
- Asset.scope_id → Mission.id OR Hop.id (based on scope_type)
- ParameterMapping.state_asset → Asset.id
- ResultMapping.state_asset → Asset.id 