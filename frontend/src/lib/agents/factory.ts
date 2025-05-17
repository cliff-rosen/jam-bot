import { Agent, AgentType, AgentStatus } from '@/types/agent';
import { AssetConfig } from '@/types/agent-job';
import { DataType } from '@/types/asset';
import { FileType } from '@/types/asset';

interface AgentFactoryOptions {
    agentType: AgentType;
    name: string;
    description: string;
    inputParameters: Record<string, any>;
    inputAssetIds?: string[];
    outputAssetConfigs: AssetConfig[];
    metadata?: Record<string, any>;
}

export function createAgent(options: AgentFactoryOptions): Agent {
    const {
        agentType,
        name,
        description,
        inputParameters,
        inputAssetIds = [],
        outputAssetConfigs,
        metadata = {}
    } = options;

    // Generate output asset IDs based on the configs
    const outputAssetIds = outputAssetConfigs.map(() => crypto.randomUUID());

    return {
        agent_id: crypto.randomUUID(),
        type: agentType,
        name,
        description,
        status: AgentStatus.IDLE,
        input_parameters: inputParameters,
        input_asset_ids: inputAssetIds,
        output_asset_ids: outputAssetIds,
        metadata: {
            createdAt: new Date().toISOString(),
            output_asset_configs: outputAssetConfigs,
            ...metadata
        }
    };
}

// Helper functions for specific agent types
export function createEmailListSummarizerAgent(
    name: string,
    inputAssetId: string,
    outputAssetName: string
): Agent {
    return createAgent({
        agentType: AgentType.EMAIL_LIST_SUMMARIZER,
        name,
        description: `Summarize multiple email messages`,
        inputParameters: {},
        inputAssetIds: [inputAssetId],
        outputAssetConfigs: [{
            name: outputAssetName,
            description: "Summaries of multiple email messages",
            fileType: FileType.JSON,
            dataType: DataType.GENERIC_LIST
        }]
    });
}

export function createEmailSummarizerAgent(
    name: string,
    inputAssetId: string,
    outputAssetName: string
): Agent {
    return createAgent({
        agentType: AgentType.EMAIL_SUMMARIZER,
        name,
        description: `Summarize a single email message`,
        inputParameters: {},
        inputAssetIds: [inputAssetId],
        outputAssetConfigs: [{
            name: outputAssetName,
            description: "Summary of the email message",
            fileType: FileType.TXT,
            dataType: DataType.UNSTRUCTURED
        }]
    });
}

export function createEmailSearchAgent(
    name: string,
    searchParams: Record<string, any>
): Agent {
    return createAgent({
        agentType: AgentType.GET_MESSAGES,
        name,
        description: `Search for email messages`,
        inputParameters: {
            operation: "get_messages",
            ...searchParams
        },
        outputAssetConfigs: [{
            name: "Search Results",
            description: "List of emails matching the search criteria",
            fileType: FileType.JSON,
            dataType: DataType.EMAIL_LIST
        }]
    });
} 