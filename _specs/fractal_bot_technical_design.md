# Fractal Bot Technical Design

## Core Data Structures

### Asset
```typescript
interface Asset {
  asset_id: string;
  type: AssetType;
  content: any;
  metadata: {
    status: AssetStatus;
    createdAt: Date;
    updatedAt: Date;
    creator: EntityId;  // user/bot/agent
    tags: string[];
    agent_associations: string[];  // agent_ids
    version: number;
  };
}

enum AssetType {
  TEXT = 'text',
  SPREADSHEET = 'spreadsheet',
  PDF = 'pdf',
  DATA = 'data'
}

enum AssetStatus {
  PROPOSED = 'proposed',
  PENDING = 'pending',
  READY = 'ready',
  ERROR = 'error'
}
```

### Agent
```typescript
interface Agent {
  agent_id: string;
  type: AgentType;
  description: string;
  status: AgentStatus;
  metadata: {
    createdAt: Date;
    lastRunAt?: Date;
    completionTime?: Date;
    progress: number;
    estimatedCompletion?: Date;
  };
  input_asset_ids: string[];  // asset_ids
  output_asset_ids: string[];  // asset_ids
}

enum AgentType {
  DATA_COLLECTION = 'data_collection',
  INFORMATION_RETRIEVAL = 'information_retrieval',
  ANALYSIS = 'analysis'
}

enum AgentStatus {
  PROPOSED = 'proposed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}
```

### Message
```typescript
interface Message {
  message_id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata: {
    actionButtons?: ActionButton[];
    asset_references?: string[];  // asset_ids
    agent_references?: string[];  // agent_ids
  };
}

enum MessageRole {
  USER = 'user',
  BOT = 'bot'
}

interface ActionButton {
  id: string;
  label: string;
  action: ActionType;
  data?: any;
}

enum ActionType {
  APPROVE_AGENT = 'approve_agent',
  REJECT_AGENT = 'reject_agent',
  LAUNCH_AGENT = 'launch_agent',
  MODIFY_ASSET = 'modify_asset',
  NEXT_STEP = 'next_step'
}
```

## Core Methods

### Chatbot
```typescript
class Chatbot {
  // Single entry point for all user interactions
  async sendUserMessage(message: Message): Promise<ChatResponse>;
}

interface ChatResponse {
  message: Message;  // The bot's response message
  sideEffects?: {
    assets?: Asset[];  // Any assets created/updated
    agents?: Agent[];  // Any agents launched/stopped
    progress?: number;  // Any progress updates
  };
}
```

### Agent
```typescript
abstract class Agent {
  // Core execution
  abstract async execute(inputAssets: Asset[]): Promise<Asset[]>;
  
  // Status management
  async updateProgress(progress: number): Promise<void>;
  async reportError(error: Error): Promise<void>;
  
  // Asset interaction
  async readInputAssets(): Promise<Asset[]>;
  async writeOutputAssets(assets: Asset[]): Promise<void>;
}
```

### AssetManager
```typescript
class AssetManager {
  // Asset operations
  async createAsset(asset: Asset): Promise<Asset>;
  async updateAsset(asset_id: string, updates: Partial<Asset>): Promise<Asset>;
  async getAsset(asset_id: string): Promise<Asset>;
  async deleteAsset(asset_id: string): Promise<void>;
  
  // Asset relationships
  async linkAgentToAsset(agent_id: string, asset_id: string): Promise<void>;
  async getAgentAssets(agent_id: string): Promise<Asset[]>;
  
  // Version control
  async createVersion(asset_id: string): Promise<Asset>;
  async getVersionHistory(asset_id: string): Promise<Asset[]>;
}
```

## State Management

### Workflow State
```typescript
interface WorkflowState {
  current_agent_id?: string;
  assets: Map<string, Asset>;
  agents: Map<string, Agent>;
  messages: Message[];
  status: WorkflowStatus;
}

enum WorkflowStatus {
  PLANNING = 'planning',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}
```

### State Transitions
1. **Agent Launch Proposal**
   ```typescript
   // 1. Create proposed asset
   const asset = await assetManager.createAsset({
     type: expectedType,
     content: null,
     metadata: { status: AssetStatus.PROPOSED }
   });
   
   // 2. Create proposed agent
   const agent = await agentManager.createAgent({
     type: agentType,
     status: AgentStatus.PROPOSED,
     output_asset_ids: [asset.asset_id]
   });
   
   // 3. Send proposal message
   await chatbot.proposeAgent(agent.agent_id, context);
   ```

2. **Agent Launch**
   ```typescript
   // 1. Update asset status
   await assetManager.updateAsset(asset.asset_id, {
     metadata: { status: AssetStatus.PENDING }
   });
   
   // 2. Update agent status
   await agentManager.updateAgent(agent.agent_id, {
     status: AgentStatus.IN_PROGRESS
   });
   
   // 3. Launch agent
   await chatbot.launchAgent(agent.agent_id);
   ```

3. **Agent Completion**
   ```typescript
   // 1. Update asset with results
   await assetManager.updateAsset(asset.asset_id, {
     content: results,
     metadata: { status: AssetStatus.READY }
   });
   
   // 2. Update agent status
   await agentManager.updateAgent(agent.agent_id, {
     status: AgentStatus.COMPLETED
   });
   
   // 3. Report completion
   await chatbot.reportCompletion(agent.agent_id, results);
   ```

## Event System

```