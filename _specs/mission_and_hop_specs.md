# Mission and Hop Specifications

This document outlines the essential inputs, outputs, and post-processing steps for creating missions and hops in the system.

## Core Concept: Dual Representation

The system uses two representations of entities:

1. **Essence Representation**: Simplified models that capture the core meaning for LLM processing
2. **Full Implementation**: Complete models with all data relationships, metadata, and system requirements

The **Essential Inputs/Outputs** describe the essence representation that LLMs work with, while **Post-Processing** describes how these are mapped to the full implementation.

## Mission Creation

### Essential Inputs (Essence)

The following inputs are required when creating a mission that doesn't exist:

- **Message History**: The conversation context and user requirements
- **Tool List**: Available tools that can be used to accomplish the mission

### Essential Outputs (Essence)

The mission creation process must produce:

- **Name**: A clear, descriptive name for the mission
- **Goal**: The primary objective the mission aims to achieve
- **Success Criteria**: Measurable outcomes that define mission completion
- **Input Assets**: Required data and credentials needed to start the mission
- **Output Assets**: The final deliverables the mission will produce

### Post-Processing (Essence → Full Implementation)

After the initial mission proposal is created, the primary agent must:

1. **Direct Transfer**: Name, goal, and success criteria are taken directly from the proposal
2. **State Initialization**: Mission state is created as the union of input and output assets
3. **Asset Management**: All assets are properly initialized with appropriate statuses and metadata

## Hop Proposal

### Essential Inputs (Essence)

The following inputs are required for creating a new hop in an existing mission:

- **Mission Description**: Context about the overall mission and current progress
- **Desired Assets**: The target outputs the hop should work toward
- **Available Assets**: Current assets in the mission state that can be used as inputs
- **Tool List**: Available tools that can be used to implement the hop

### Essential Outputs (Essence)

Each hop proposal must include:

- **Name**: A descriptive name for the hop (2-8 words)
- **Description**: One sentence explaining what the hop accomplishes
- **Required Inputs**: Assets needed from the available mission state
- **Target Outputs**: Either a final mission asset or a new intermediate asset
- **Rationale**: Explanation of why this hop is needed and how it contributes to the mission

### Post-Processing (Essence → Full Implementation)

After a hop is proposed, the primary agent must:

1. **Asset Management**: If the hop creates an intermediate asset, it's added to the mission state
2. **State Creation**: Hop state is created from the input and output assets
3. **Mapping Creation**: Input and output mappings are established to connect assets to the hop's tool steps

## Hop Implementation

### Essential Inputs (Essence)

The following inputs are required for implementing a proposed hop:

- **Hop Definition**: The hop proposal with input/output mappings and hop state
- **Available Tools**: Complete list of tools with their parameters and outputs
- **Mission Context**: Overall mission goal and current progress

### Essential Outputs (Essence)

Each hop implementation must produce:

- **Tool Steps**: A sequence of 1-4 tool executions that transform inputs to outputs
- **Parameter Mappings**: How each tool's parameters map to hop state assets
- **Result Mappings**: How each tool's outputs map to hop state assets
- **Intermediate Assets**: Any new assets created during the tool chain

### Tool Step Structure

Each tool step must include:

- **ID**: Unique identifier for the step
- **Tool ID**: The specific tool to execute
- **Description**: What this step accomplishes
- **Parameter Mapping**: Maps tool parameters to hop state assets or literal values
- **Result Mapping**: Maps tool outputs to hop state assets

### Mapping Types

#### Parameter Mapping
- **Asset Field Mapping**: `{"type": "asset_field", "state_asset": "asset_name", "path": "optional.field.path"}`
- **Literal Mapping**: `{"type": "literal", "value": "actual_value"}`

#### Result Mapping
- **Asset Field Mapping**: `{"type": "asset_field", "state_asset": "asset_name"}`
- **Discard Mapping**: `{"type": "discard"}` (for unused outputs)

### Post-Processing (Essence → Full Implementation)

After a hop is implemented, the primary agent must:

1. **Asset Creation**: Intermediate assets referenced in mappings are created in hop state
2. **Validation**: Tool chain is validated against hop state and tool definitions
3. **Resolution**: Hop is marked as resolved and ready for execution

### Execution Flow

1. **Setup**: Hop state is initialized with input assets from mission state
2. **Sequential Execution**: Each tool step executes in order:
   - Parameters are resolved from hop state
   - Tool is executed with resolved parameters
   - Results are mapped back to hop state
3. **Completion**: Output assets are mapped back to mission state

## Implementation Notes

### Asset Types and Validation

- Assets must use valid types: `string`, `number`, `boolean`, `primitive`, `object`, `file`, `database_entity`, `markdown`, `config`, `email`, `webpage`, `search_result`, `pubmed_article`, `newsletter`, `daily_newsletter_recap`
- For collections, set `is_collection=true` and specify `collection_type` as `array`, `map`, or `set`
- External system credentials must use type `config`

### Design Principles

1. **Incremental Progress**: Each hop should make clear progress toward the mission goal
2. **Tractability**: Each hop should be implementable with available tools
3. **Cohesive Goals**: Each hop should have a clear, focused purpose
4. **Input/Output Focus**: Each hop should clearly map inputs to outputs

### Asset Categories

- **Desired Assets**: Final deliverables that the mission aims to produce
- **Available Assets**: Current assets in the mission state that can be used as inputs
- **Intermediate Assets**: Assets created by hops that contribute to the final outputs

## Related Files

- `backend/schemas/lite_models.py`: Contains the `AssetLite`, `MissionLite`, and `HopLite` models (essence representations)
- `backend/schemas/workflow.py`: Contains the full `Mission`, `Hop`, and `ToolStep` models (full implementation)
- `backend/agents/prompts/hop_designer_prompt_simple.py`: Implementation of hop design logic
- `backend/agents/prompts/hop_implementer_prompt_simple.py`: Implementation of hop implementation logic
- `backend/utils/message_formatter.py`: Utilities for formatting tool descriptions and mission context
- `backend/tools/tool_execution.py`: Core tool execution logic
- `tool_exec_seq.md`: Detailed tool execution sequence documentation 