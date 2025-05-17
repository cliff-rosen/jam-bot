import { FileType, DataType, AssetStatus } from '@/types/asset';
import { Agent, AgentType } from '@/types/agent';
import { AgentExecutor, AgentExecutionContext, AgentExecutionResult } from '../types';
import { api } from '@/lib/api';

export class EmailAccessAgentExecutor implements AgentExecutor {
    type = AgentType.GET_MESSAGES;
    dataType = DataType.EMAIL_LIST;
    fileType = FileType.JSON;

    async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
        try {
            const { agent } = context;
            const targetAssetId = agent.output_asset_ids?.[0] || `email_list_${Date.now()}`;

            console.log('EmailAccessAgentExecutor: Starting execution with agent:', {
                agentId: agent.agent_id,
                type: agent.type,
                inputParameters: agent.input_parameters
            });

            const { input_parameters } = agent;
            const {
                operation = 'get_messages',
                folders,
                query_terms,
                max_results = 100,
                include_attachments = false,
                include_metadata = true
            } = input_parameters;

            console.log('EmailAccessAgentExecutor: Making API request with params:', {
                operation,
                folders,
                query_terms,
                max_results,
                include_attachments,
                include_metadata
            });

            const response = await api.post('/api/email/messages', {
                folders,
                query_terms,
                max_results,
                include_attachments,
                include_metadata
            });

            console.log('EmailAccessAgentExecutor: Received API response:', {
                success: response.data.success,
                hasData: !!response.data.data,
                error: response.data.error,
                responseStatus: response.status
            });

            // Check if the response was successful
            if (!response.data.success) {
                const error = response.data.error || 'Failed to fetch email messages';
                console.error('EmailAccessAgentExecutor: API request failed:', {
                    error,
                    responseData: response.data
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

            // Get messages from response
            const messages = response.data.data.messages;
            console.log('EmailAccessAgentExecutor: Processing messages:', {
                messageCount: Array.isArray(messages) ? messages.length : 'not an array',
                messageType: typeof messages,
                firstMessage: Array.isArray(messages) && messages.length > 0 ? messages[0] : null
            });

            // Ensure messages is an array
            if (!Array.isArray(messages)) {
                console.error('EmailAccessAgentExecutor: Messages is not an array:', {
                    messagesType: typeof messages,
                    messagesValue: messages
                });
                throw new Error(`Invalid response format: expected array of messages but received ${typeof messages}`);
            }

            // Transform messages to ensure consistent format
            const transformedMessages = messages.map((msg: any) => {
                const transformed = {
                    id: msg.id || String(Date.now()),
                    subject: msg.subject || '(No Subject)',
                    from: msg.from || 'Unknown Sender',
                    to: msg.to || 'Unknown Recipient',
                    date: msg.date || new Date().toISOString(),
                    body: {
                        html: msg.body?.html || null,
                        plain: msg.body?.plain || msg.snippet || ''
                    },
                    snippet: msg.snippet || '',
                    attachments: msg.attachments || []
                };
                return transformed;
            });

            console.log('EmailAccessAgentExecutor: Successfully transformed messages:', {
                count: transformedMessages.length,
                sampleMessage: transformedMessages[0]
            });

            const asset = {
                asset_id: targetAssetId,
                name: `Email Messages (${transformedMessages.length})`,
                description: 'Collection of email messages from search results',
                fileType: this.fileType,
                dataType: this.dataType,
                content: transformedMessages,
                status: AssetStatus.READY,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                    creator: 'email_access_agent',
                    tags: ['email', 'search_results']
                },
                persistence: {
                    isInDb: false
                }
            };

            console.log('EmailAccessAgentExecutor: Successfully created asset:', {
                assetId: asset.asset_id,
                messageCount: transformedMessages.length,
                status: asset.status
            });

            return {
                success: true,
                outputAssets: [asset]
            };
        } catch (error) {
            console.error('EmailAccessAgentExecutor: Error during execution:', {
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
                error: error instanceof Error ? error.message : 'Unknown error in EmailAccessAgentExecutor'
            };
        }
    }

    validateInputs(context: AgentExecutionContext): boolean {
        const { agent } = context;
        return !!agent.input_parameters;
    }

    getRequiredInputTypes(): string[] {
        return ['text'];
    }
} 