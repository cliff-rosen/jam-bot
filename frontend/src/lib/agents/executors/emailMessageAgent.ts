import { FileType, DataType, AssetStatus } from '@/types/asset';
import { Agent, AgentType } from '@/types/agent';
import { AgentExecutor, AgentExecutionContext, AgentExecutionResult } from '../types';
import { emailApi } from '@/lib/api/emailApi';

export class EmailMessageAgentExecutor implements AgentExecutor {
    type = AgentType.GET_MESSAGE;
    dataType = DataType.EMAIL_LIST;
    fileType = FileType.JSON;

    async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
        try {
            const { agent } = context;
            const targetAssetId = agent.output_asset_ids?.[0] || `email_message_${Date.now()}`;

            console.log('EmailMessageAgentExecutor: Starting execution with agent:', {
                agentId: agent.agent_id,
                type: agent.type,
                inputParameters: agent.input_parameters
            });

            const { input_parameters } = agent;
            const {
                operation = 'get_message',
                message_id,
                include_attachments = false,
                include_metadata = true
            } = input_parameters;

            console.log('EmailMessageAgentExecutor: Making API request with params:', {
                operation,
                message_id,
                include_attachments,
                include_metadata
            });

            const response = await emailApi.searchEmails({
                query_terms: [`id:${message_id}`],
                max_results: 1,
                include_attachments,
                include_metadata
            });

            console.log('EmailMessageAgentExecutor: Received API response:', {
                success: response.success,
                hasData: !!response.data,
                error: response.error
            });

            // Check if the response was successful
            if (!response.success) {
                const error = response.error || 'Failed to fetch email message';
                console.error('EmailMessageAgentExecutor: API request failed:', {
                    error,
                    responseData: response
                });

                // Check if this is an authentication error
                if (error.includes('401') || error.includes('unauthorized')) {
                    throw new Error('Gmail authentication required. Please reconnect your Gmail account.');
                }
                // Check if this is a scope error
                if (error.includes('403') || error.includes('forbidden') || error.includes('scope')) {
                    throw new Error('Insufficient Gmail permissions. Please reconnect your Gmail account with full access permissions.');
                }
                throw new Error(error);
            }

            const messages = response.data.messages || [];
            if (messages.length === 0) {
                throw new Error(`No message found with ID: ${message_id}`);
            }

            const message = messages[0];
            console.log('EmailMessageAgentExecutor: Processing message:', {
                messageId: message.id,
                subject: message.headers?.subject
            });

            // Transform message to ensure consistent format
            const transformedMessage = {
                id: message.id || String(Date.now()),
                subject: message.headers?.subject || '(No Subject)',
                from: message.headers?.from || 'Unknown Sender',
                to: message.headers?.to || 'Unknown Recipient',
                date: message.internalDate || new Date().toISOString(),
                body: {
                    html: message.body || null,
                    plain: message.snippet || ''
                },
                snippet: message.snippet || '',
                attachments: message.attachments || []
            };

            console.log('EmailMessageAgentExecutor: Successfully transformed message:', {
                messageId: transformedMessage.id,
                subject: transformedMessage.subject
            });

            const asset = {
                asset_id: targetAssetId,
                name: `Email Message: ${transformedMessage.subject}`,
                description: 'Single email message',
                fileType: this.fileType,
                dataType: this.dataType,
                content: [transformedMessage], // Keep consistent with email list format
                status: AssetStatus.READY,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                    creator: 'email_message_agent',
                    tags: ['email', 'single_message']
                },
                persistence: {
                    isInDb: false
                }
            };

            console.log('EmailMessageAgentExecutor: Successfully created asset:', {
                assetId: asset.asset_id,
                messageId: transformedMessage.id,
                status: asset.status
            });

            return {
                success: true,
                outputAssets: [asset]
            };
        } catch (error) {
            console.error('EmailMessageAgentExecutor: Error during execution:', {
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
                error: error instanceof Error ? error.message : 'Unknown error in EmailMessageAgentExecutor'
            };
        }
    }

    validateInputs(context: AgentExecutionContext): boolean {
        const { agent } = context;
        const { input_parameters } = agent;
        return !!input_parameters && !!input_parameters.message_id;
    }

    getRequiredInputTypes(): string[] {
        return ['text'];
    }
} 