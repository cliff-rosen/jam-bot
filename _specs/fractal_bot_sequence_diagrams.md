# FractalBot Sequence Diagrams

## Core Message Flow with Action Buttons
```mermaid
sequenceDiagram
    participant User
    participant Chatbot
    participant AssetManager
    participant AgentManager
    
    User->>Chatbot: sendUserMessage(message)
    activate Chatbot
    
    Note over Chatbot: Process message and determine intent
    
    alt Intent requires action buttons
        Chatbot-->>User: Response with actionButtons
        User->>Chatbot: Click action button
        Note over Chatbot: Process action type
    end
    
    Chatbot-->>User: ChatResponse (message + sideEffects)
    deactivate Chatbot
```

## Agent Proposal and Launch Flow
```mermaid
sequenceDiagram
    participant User
    participant Chatbot
    participant AssetManager
    participant AgentManager
    
    User->>Chatbot: sendUserMessage(message)
    activate Chatbot
    
    Note over Chatbot: Determine need for agent
    
    Chatbot->>AssetManager: createAsset(PROPOSED)
    AssetManager-->>Chatbot: Asset
    
    Chatbot->>AgentManager: createAgent(PROPOSED)
    AgentManager-->>Chatbot: Agent
    
    Chatbot-->>User: Response with actionButtons[APPROVE_AGENT]
    
    User->>Chatbot: Click APPROVE_AGENT
    Chatbot->>AssetManager: updateAsset(PENDING)
    Chatbot->>AgentManager: updateAgent(IN_PROGRESS)
    Chatbot->>AgentManager: launchAgent
    
    Chatbot-->>User: Response with sideEffects
    deactivate Chatbot
```

## Agent Execution and Completion Flow
```mermaid
sequenceDiagram
    participant Agent
    participant Chatbot
    participant AssetManager
    participant AgentManager
    
    Agent->>AgentManager: updateProgress(progress)
    AgentManager-->>Chatbot: Progress update
    
    Agent->>AgentManager: reportCompletion
    AgentManager-->>Chatbot: Completion signal
    
    Chatbot->>AssetManager: updateAsset(READY)
    Chatbot->>AgentManager: updateAgent(COMPLETED)
    
    Chatbot-->>User: Response with completion message
```

## Asset Modification Flow
```mermaid
sequenceDiagram
    participant User
    participant Chatbot
    participant AssetManager
    
    User->>Chatbot: sendUserMessage(message)
    activate Chatbot
    
    Note over Chatbot: Determine asset changes needed
    
    Chatbot->>AssetManager: createAsset/updateAsset
    AssetManager-->>Chatbot: Updated Asset
    
    Chatbot-->>User: Response with actionButtons[MODIFY_ASSET]
    
    User->>Chatbot: Click MODIFY_ASSET
    Chatbot->>AssetManager: updateAsset
    AssetManager-->>Chatbot: Updated Asset
    
    Chatbot-->>User: Response with sideEffects
    deactivate Chatbot
```

## State Machines

### Asset State Machine
```mermaid
stateDiagram-v2
    [*] --> PROPOSED: Create
    PROPOSED --> PENDING: Launch
    PENDING --> READY: Complete
    PENDING --> ERROR: Fail
    READY --> PROPOSED: New Version
    ERROR --> PROPOSED: Retry
```

### Agent State Machine
```mermaid
stateDiagram-v2
    [*] --> PROPOSED: Create
    PROPOSED --> IN_PROGRESS: Launch
    IN_PROGRESS --> COMPLETED: Complete
    IN_PROGRESS --> ERROR: Fail
    ERROR --> PROPOSED: Retry
```

## Key Points

1. **Message Flow**
   - All user interactions start with a message
   - Chatbot may respond with action buttons
   - User can trigger actions through buttons
   - Responses include both messages and side effects

2. **Agent Lifecycle**
   - Agents start in PROPOSED state
   - User must approve before launch
   - Agents report progress during execution
   - Completion updates both agent and asset states

3. **Asset Lifecycle**
   - Assets track their status
   - Status changes reflect agent progress
   - Assets can be modified through user actions
   - Version control is supported

4. **Action Types**
   - APPROVE_AGENT: Launch a proposed agent
   - REJECT_AGENT: Cancel a proposed agent
   - LAUNCH_AGENT: Start agent execution
   - MODIFY_ASSET: Update asset content
   - NEXT_STEP: Progress workflow 