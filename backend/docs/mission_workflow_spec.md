# Mission Execution Architecture

## Overview

Missions are high-level goals that transform input assets into output assets. This transformation is achieved through a series of **Hops** - coherent units of work that make progress toward the mission goal.

## Core Concepts

### Mission

A Mission represents a complete task with defined inputs and outputs:

```python
class Mission:
    id: str
    name: str
    description: str
    goal: str
    success_criteria: List[str]
    
    # Assets
    inputs: List[Asset]              # Starting assets
    outputs: List[Asset]             # Target assets to produce
    
    # Execution
    hops: List[Hop]                  # Sequence of hops to execute
    state: Dict[str, Asset]          # All assets available (inputs + hop outputs)
    
    # Status tracking
    status: WorkflowStatus
    current_hop_index: int
    
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
```

### Hop

A Hop is a coherent unit of work that transforms a set of input assets into output assets. A hop may be atomic (single tool/step) or composite (multiple tools/steps):

```python
class Hop:
    id: str
    name: str
    description: str
    
    # Asset mappings
    input_mapping: Dict[str, str]    # External asset IDs → Local state keys
    state: Dict[str, Asset]          # Local asset workspace
    output_mapping: Dict[str, str]   # Local state keys → External asset IDs
    
    # Tool chain (populated during resolution)
    steps: List[ToolStep]            # Tool executions that implement this hop
    
    # Status tracking
    status: HopStatus
    is_resolved: bool                # Whether the hop has been configured with tools
    current_step_index: int
    created_at: datetime
    updated_at: datetime
```

### ToolStep

A ToolStep represents an atomic unit of work - a single tool execution within a hop that updates the asset collection in editing an existing asset in state or generating a new one.

```python
class ToolStep:
    id: str
    tool_name: str
    description: str
    
    # Asset mappings within hop state
    parameter_mapping: Dict[str, Dict[str, Any]]  # Tool params → State assets
    result_mapping: Dict[str, Dict[str, Any]]     # Tool outputs → State assets
    
    status: ExecutionStatus
    error: Optional[str]
```

## Hop Resolution

A hop starts as a high-level intention and must be **resolved** into a concrete tool chain before execution.

### What is Resolution?

Resolution is the process of configuring a hop with a tool chain such that:
- The chain's inputs can be satisfied by the hop's input assets
- The chain's outputs produce the hop's required output assets
- Each tool in the chain is properly connected to the next

### Resolution Process

When resolving a hop, the system follows this decision process:

1. **Single Tool Solution**
   - Question: "Is there a single tool that can transform the input state directly into the desired output state?"
   - If yes: Create a single-step tool chain (atomic hop)
   - Example: `gmail_search` tool can directly convert search criteria into email results

2. **Multi-Tool Chain**
   - If no single tool suffices, design a chain of 2-4 tools
   - Each tool's output feeds into the next tool's input
   - The chain must form a valid path from inputs to outputs

### Example: Hop Resolution

Consider a mission "Analyze Customer Feedback" that needs to collect and analyze customer emails. The first hop might be:

**Unresolved Hop:**
```python
hop = Hop(
    name="Collect Customer Feedback",
    description="Gather all customer feedback emails into a searchable collection",
    input_mapping={"search_criteria": "mission_input_criteria"},
    output_mapping={"feedback_collection": "collected_emails_asset"}
)
```

**Resolution Analysis:**
- Input: Search criteria asset
- Desired output: Collection of feedback emails
- Single tool solution exists: `gmail_search`

**Resolved Hop (Atomic):**
```python
hop.steps = [
    ToolStep(
        tool_name="gmail_search",
        parameter_mapping={
            "query": {"state_asset": "search_criteria", "path": "content.query"},
            "max_results": {"literal": 1000}
        },
        result_mapping={
            "emails": {"state_asset": "feedback_collection", "path": "content"}
        }
    )
]
hop.is_resolved = True
```

**Alternative Multi-Step Resolution:**
If the emails need preprocessing before collection:

```python
hop.steps = [
    ToolStep(
        tool_name="gmail_search",
        parameter_mapping={"query": {"state_asset": "search_criteria", "path": "content"}},
        result_mapping={"emails": {"state_asset": "raw_emails", "path": "content"}}
    ),
    ToolStep(
        tool_name="email_extraction",
        parameter_mapping={
            "emails": {"state_asset": "raw_emails", "path": "content"},
            "schema": {"literal": {"sender": "string", "date": "date", "content": "string"}}
        },
        result_mapping={"data": {"state_asset": "structured_emails", "path": "content"}}
    ),
    ToolStep(
        tool_name="data_store_update",
        parameter_mapping={
            "store_name": {"literal": "customer_feedback"},
            "data": {"state_asset": "structured_emails", "path": "content"}
        },
        result_mapping={"success": {"state_asset": "feedback_collection", "path": "metadata.stored"}}
    )
]
```

## Execution Flow

### Mission Execution

1. **Initialize**: 
   - Load mission with input assets
   - Initialize mission state with input assets
2. **For each hop**:
   - Map required assets from mission state into hop state
   - Ensure hop is resolved (has tool chain)
   - Execute tool chain
   - Map output assets back to mission state
   - Update mission state with new assets
3. **Complete**: Verify all output assets are produced

### Hop Execution

1. **Setup**: Initialize hop state with mapped inputs
2. **For each tool step** (atomic execution):
   - Map parameters from hop state
   - Execute tool
   - Map results back to hop state
3. **Finalize**: Map outputs to mission state

## Asset Flow

```
Mission State (inputs + accumulated assets)
    ↓ (input mapping)
Hop State
    ↓ (tool step 1 - atomic work)
Hop State (updated)
    ↓ (tool step 2 - atomic work)
Hop State (updated)
    ↓ (output mapping)
Mission State (updated with new assets)
```

## Design Principles

1. **Coherent vs Atomic**: Hops are coherent units that may contain multiple atomic tool steps
2. **Isolation**: Each hop has its own state workspace
3. **Accumulation**: Mission state accumulates all assets (inputs + hop outputs)
4. **Resolution Before Execution**: Hops must be resolved to concrete tool chains
5. **Progressive Refinement**: Start with high-level hops, resolve to specific implementations