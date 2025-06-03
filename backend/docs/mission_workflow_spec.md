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
    input_mapping: Dict[str, str]    # {local_key: external_asset_id}
    state: Dict[str, Asset]          # Local asset workspace
    output_mapping: Dict[str, str]   # {local_key: external_asset_id}
    
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
    parameter_mapping: Dict[str, Dict[str, Any]]  # {tool_param: {"state_asset": local_key, "path": "..."}}
    result_mapping: Dict[str, Dict[str, Any]]     # {tool_output: {"state_asset": local_key, "path": "..."}}
    
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

### Example: Complete Mission

Let's look at a complete mission "Analyze Customer Feedback" and how it decomposes into hops:

**Mission Definition:**
```python
mission = Mission(
    name="Analyze Customer Feedback",
    description="Collect and analyze customer feedback emails to identify key themes",
    inputs=[
        Asset(id="search_criteria", content={"query": "label:customer-feedback", "date_range": "last_30_days"})
    ],
    outputs=[
        Asset(id="feedback_report", type=AssetType.REPORT)
    ]
)
```

**Mission Decomposition:**

This mission elegantly resolves into 3 hops:

### Hop 1: Gather Feedback (Atomic)
```python
hop1 = Hop(
    name="Gather Customer Feedback",
    description="Collect all customer feedback emails",
    input_mapping={
        "criteria": "search_criteria"  # local 'criteria' ← mission state 'search_criteria'
    },
    output_mapping={
        "emails": "raw_feedback_emails"  # local 'emails' → mission state 'raw_feedback_emails'
    }
)

# Resolution: Single tool is sufficient
hop1.steps = [
    ToolStep(
        tool_name="gmail_search",
        parameter_mapping={
            "query": {"state_asset": "criteria", "path": "content.query"},
            "date_filter": {"state_asset": "criteria", "path": "content.date_range"}
        },
        result_mapping={
            "emails": {"state_asset": "emails", "path": "content"}
        }
    )
]
```

### Hop 2: Process Feedback (Multi-Step)
```python
hop2 = Hop(
    name="Process Feedback",
    description="Extract and structure feedback data",
    input_mapping={
        "raw_emails": "raw_feedback_emails"  # local 'raw_emails' ← mission state 'raw_feedback_emails'
    },
    output_mapping={
        "processed_data": "structured_feedback"  # local 'processed_data' → mission state 'structured_feedback'
    }
)

# Resolution: Multiple tools needed
hop2.steps = [
    ToolStep(
        tool_name="email_extraction",
        description="Extract structured data from emails",
        parameter_mapping={
            "emails": {"state_asset": "raw_emails", "path": "content"},
            "extraction_schema": {"literal": {
                "customer_id": "string",
                "sentiment": "string",
                "issue_category": "string",
                "feedback_text": "string"
            }}
        },
        result_mapping={
            "extracted_data": {"state_asset": "extracted_feedback", "path": "content"}
        }
    ),
    ToolStep(
        tool_name="data_store_update",
        description="Store structured feedback for analysis",
        parameter_mapping={
            "store_name": {"literal": "feedback_analysis"},
            "data": {"state_asset": "extracted_feedback", "path": "content"}
        },
        result_mapping={
            "store_ref": {"state_asset": "processed_data", "path": "content"}
        }
    )
]
```

### Hop 3: Summarize Feedback (Multi-Step)
```python
hop3 = Hop(
    name="Summarize Feedback",
    description="Generate insights report from processed feedback",
    input_mapping={
        "feedback_data": "structured_feedback"  # local 'feedback_data' ← mission state 'structured_feedback'
    },
    output_mapping={
        "report": "feedback_report"  # local 'report' → mission state 'feedback_report' (final output)
    }
)

# Resolution: Multiple tools for comprehensive analysis
hop3.steps = [
    ToolStep(
        tool_name="data_store_summarize",
        description="Generate statistical summary",
        parameter_mapping={
            "store_name": {"state_asset": "feedback_data", "path": "content.store_name"},
            "summarization_type": {"literal": "statistical"},
            "group_by": {"literal": ["issue_category", "sentiment"]}
        },
        result_mapping={
            "summary": {"state_asset": "stats_summary", "path": "content"}
        }
    ),
    ToolStep(
        tool_name="report_generator",
        description="Create final report",
        parameter_mapping={
            "stats": {"state_asset": "stats_summary", "path": "content"},
            "raw_data": {"state_asset": "feedback_data", "path": "content"},
            "template": {"literal": "customer_feedback_template"}
        },
        result_mapping={
            "report": {"state_asset": "report", "path": "content"}
        }
    )
]
```

**Key Points:**
- **Hop 1** is atomic - a single gmail_search tool suffices
- **Hop 2** requires multiple steps - extraction then storage
- **Hop 3** requires multiple steps - analysis then report generation
- Each hop maintains its own state workspace
- Mission state accumulates all assets as hops complete

## Tool Chain Visualization

The resolved hops form a complete tool chain that transforms mission inputs into outputs:

| Hop | Step | Tool | Inputs | Outputs | Data Flow |
|-----|------|------|--------|---------|-----------|
| **1: Gather** | 1 | gmail_search | search_criteria (mission input) | raw_feedback_emails | Mission Input → Emails |
| **2: Process** | 1 | email_extraction | raw_feedback_emails | extracted_feedback | Emails → Structured Data |
| | 2 | data_store_update | extracted_feedback | structured_feedback | Structured Data → Stored Data |
| **3: Summarize** | 1 | data_store_summarize | structured_feedback | stats_summary | Stored Data → Statistics |
| | 2 | report_generator | stats_summary + structured_feedback | feedback_report (mission output) | Statistics → Final Report |

**Complete Chain:**
```
search_criteria (Mission Input)
    ↓ gmail_search
raw_feedback_emails
    ↓ email_extraction
extracted_feedback
    ↓ data_store_update
structured_feedback
    ↓ data_store_summarize
stats_summary
    ↓ report_generator
feedback_report (Mission Output)
```

This demonstrates how the mission's input (`search_criteria`) flows through a chain of 5 tool executions across 3 hops to produce the final output (`feedback_report`). Each tool's output becomes the input for the next, forming a valid and complete transformation pipeline.

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