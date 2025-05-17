import { FileType, DataType, AssetStatus } from '@/types/asset';
import { Agent, AgentType } from '@/types/agent';
import { AgentExecutor, AgentExecutionContext, AgentExecutionResult } from '../types';
import { emailApi } from '@/lib/api/emailApi';

export class EmailLabelsAgentExecutor implements AgentExecutor {
    type = AgentType.LIST_LABELS;
    dataType = DataType.GENERIC_LIST;
    fileType = FileType.JSON;

    async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
        try {
            const { agent } = context;
            const targetAssetId = agent.output_asset_ids?.[0] || `email_labels_${Date.now()}`;

            console.log('EmailLabelsAgentExecutor: Starting execution with agent:', {
                agentId: agent.agent_id,
                type: agent.type,
                inputParameters: agent.input_parameters
            });

            const { input_parameters } = agent;
            const { operation = 'list_labels', include_system_labels = true } = input_parameters || {};

            console.log('EmailLabelsAgentExecutor: Making API request with params:', {
                operation,
                include_system_labels
            });

            const labels = await emailApi.listLabels();

            console.log('EmailLabelsAgentExecutor: Received labels:', {
                labelCount: labels.length,
                sampleLabel: labels[0]
            });

            // Transform labels to ensure consistent format
            const transformedLabels = labels.map((label) => ({
                id: label.id || String(Date.now()),
                name: label.name || 'Unnamed Label',
                type: label.type || 'user',
                messageListVisibility: 'show',
                labelListVisibility: 'labelShow'
            }));

            console.log('EmailLabelsAgentExecutor: Successfully transformed labels:', {
                count: transformedLabels.length,
                sampleLabel: transformedLabels[0]
            });

            const asset = {
                asset_id: targetAssetId,
                name: 'Email Labels',
                description: 'List of available email labels',
                fileType: this.fileType,
                dataType: this.dataType,
                content: transformedLabels,
                status: AssetStatus.READY,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                    creator: 'email_labels_agent',
                    tags: ['email', 'labels']
                },
                persistence: {
                    isInDb: false
                }
            };

            console.log('EmailLabelsAgentExecutor: Successfully created asset:', {
                assetId: asset.asset_id,
                labelCount: transformedLabels.length,
                status: asset.status
            });

            return {
                success: true,
                outputAssets: [asset]
            };
        } catch (error) {
            console.error('EmailLabelsAgentExecutor: Error during execution:', {
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : error,
                context: {
                    agentId: context.agent?.agent_id,
                    agentType: context.agent?.type
                }
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error in EmailLabelsAgentExecutor'
            };
        }
    }

    validateInputs(context: AgentExecutionContext): boolean {
        return true; // No required inputs for this agent
    }

    getRequiredInputTypes(): string[] {
        return []; // No required input types
    }
} 