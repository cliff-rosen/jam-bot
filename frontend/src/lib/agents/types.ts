import { Agent, AgentType, AgentStatus } from '@/components/fractal-bot/types/state';
import { Asset } from '@/components/fractal-bot/types/state';

export interface AgentExecutionContext {
    agent: Agent;
    inputAssets: Asset[];
    outputAssets: Asset[];
    state: any; // Global state from FractalBotContext
}

export interface AgentExecutionResult {
    success: boolean;
    outputAssets?: Asset[];
    error?: string;
    metadata?: Record<string, any>;
}

export interface AgentExecutor {
    type: AgentType;
    execute: (context: AgentExecutionContext) => Promise<AgentExecutionResult>;
    validateInputs?: (context: AgentExecutionContext) => boolean;
    getRequiredInputTypes?: () => string[];
}

export interface AgentRegistry {
    registerExecutor: (executor: AgentExecutor) => void;
    getExecutor: (agentType: AgentType) => AgentExecutor | undefined;
    listRegisteredTypes: () => AgentType[];
} 