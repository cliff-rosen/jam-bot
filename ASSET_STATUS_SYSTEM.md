# Asset Status System

## Overview

The asset status system tracks the lifecycle of assets from creation to completion, providing clear visibility into mission readiness and execution progress.

## Asset Status Types

### Core States

- **`PENDING`** - Asset defined but not yet available
  - Mission inputs: User hasn't provided data/credentials yet
  - Outputs: Haven't been generated yet
  - Intermediate: Waiting to be created by hop execution

- **`IN_PROGRESS`** - Asset is currently being created/processed
  - Tools are actively working on generating this asset
  - Shows real-time progress during hop execution

- **`READY`** - Asset is available and ready to use
  - Mission inputs: User has provided valid data/credentials
  - Outputs: Successfully generated final results
  - Intermediate: Successfully created by tools

- **`ERROR`** - Asset creation/provision failed
  - Mission inputs: Invalid credentials, corrupted files
  - Tool outputs: Tool execution failed
  - Includes error message for debugging

- **`EXPIRED`** - Asset (like credentials) has expired
  - OAuth tokens that need refresh
  - Time-sensitive data that's no longer valid

## Status Flow Examples

### Mission Input Asset (Gmail Credentials)
```
PENDING → (user provides OAuth token) → READY
PENDING → (user provides invalid token) → ERROR
READY → (token expires) → EXPIRED
```

### Mission Output Asset (Summary Report)
```
PENDING → (hop starts generating) → IN_PROGRESS → (generation completes) → READY
PENDING → (hop starts generating) → IN_PROGRESS → (generation fails) → ERROR
```

### Intermediate Asset (Retrieved Emails)
```
PENDING → (email tool starts) → IN_PROGRESS → (emails retrieved) → READY
PENDING → (email tool starts) → IN_PROGRESS → (API fails) → ERROR
```

## Mission Readiness Checking

The system automatically checks if a mission can proceed:

```typescript
// Check if all input assets are ready
const { ready, messages } = checkMissionReady(mission.inputs);

if (!ready) {
    console.log("Mission blocked:", messages);
    // ["Pending inputs from user: Gmail Credentials, Search Keywords"]
    // ["Failed inputs that need attention: Gmail Credentials"]
}
```

## Benefits

### 1. **Clear Progress Tracking**
- Users see exactly what they need to provide
- Real-time visibility into execution progress
- Clear indication when mission is ready to run

### 2. **Error Handling**
- Failed assets are clearly marked with error messages
- Users know exactly what went wrong and where
- System can retry or request new inputs

### 3. **Mission Readiness**
- Automatic blocking until all inputs are ready
- No wasted execution on incomplete missions
- Clear feedback on what's still needed

### 4. **UI/UX Benefits**
- Status indicators for each asset
- Progress bars during execution
- Error notifications with actionable messages

## Usage Examples

### Backend (Python)
```python
# Create pending asset
asset = convert_asset_lite_to_asset(asset_lite)
# asset.status == AssetStatus.PENDING

# Mark as ready when user provides data
asset.mark_ready(updated_by="user")
# asset.status == AssetStatus.READY
# asset.ready_at == datetime.utcnow()

# Mark as error if something fails
asset.mark_error("Invalid OAuth token", updated_by="email_tool")
# asset.status == AssetStatus.ERROR
# asset.error_message == "Invalid OAuth token"

# Check mission readiness
ready, messages = check_mission_ready(mission.inputs)
```

### Frontend (TypeScript)
```typescript
// Check asset availability
if (isAssetAvailable(asset)) {
    // Can use this asset
}

if (assetNeedsAttention(asset)) {
    // Show error to user
    console.log(asset.error_message);
}

// Update asset status
const updatedAsset = markAssetReady(asset, "user");
const errorAsset = markAssetError(asset, "File corrupted", "file_validator");

// Get assets by status
const pending = getPendingAssets(assets);
const failed = getFailedAssets(assets);
```

## Integration Points

### Mission Specialist
- Creates assets with `PENDING` status
- Input assets wait for user provision
- Output assets wait for generation

### Supervisor Node
- Checks input asset readiness before proceeding
- Blocks execution until all inputs are `READY`
- Provides clear feedback on pending/failed assets

### Hop Execution
- Marks intermediate assets as `IN_PROGRESS` when tools start
- Updates to `READY` on successful completion
- Sets `ERROR` status with message on failure
- **When hop completes successfully**: Automatically marks all hop output assets as `READY`

### UI Components
- Asset status indicators (pending, ready, error icons)
- Progress tracking during execution
- Error messages with resolution hints

## Hop Output Asset Flow

When a hop completes successfully:

1. **Frontend**: `COMPLETE_HOP_EXECUTION` action is dispatched
2. **Asset Update**: `markHopOutputsReady()` is called automatically
3. **Status Change**: All hop output assets transition from `PENDING` → `READY`
4. **Value Copy**: Asset values are copied from hop local state to mission state
5. **Mission Progress**: Mission can now proceed to next hop or completion

**Example Flow**:
```
Hop: "Retrieve Emails" completes successfully
├── Local Asset: "retrieved_emails" (READY) 
└── Mission Asset: "AI Newsletter Data" (PENDING → READY)
    └── Value copied from hop asset to mission asset
```

This ensures that when a hop finishes, its outputs are immediately available for subsequent hops or as final mission results.

## Future Enhancements

1. **Retry Logic** - Automatic retry for failed assets
2. **Dependency Tracking** - Asset dependencies and cascading status
3. **Expiration Handling** - Automatic refresh for expired credentials
4. **Status History** - Track status changes over time
5. **Notifications** - Real-time status change notifications

This status system provides the foundation for robust mission execution with clear visibility and error handling at every step. 