import { FileType, DataType, AssetStatus } from '@/types/asset';
import { Agent, AgentType } from '@/types/agent';
import { AgentExecutor, AgentExecutionContext, AgentExecutionResult } from '../types';
import { EmailMessage } from '@/types/email';
import { EmailSummarizerAgentExecutor } from './emailSummarizerAgent';
import { getAssetContent } from '@/lib/utils/assets/assetUtils';

export class EmailListSummarizerAgentExecutor implements AgentExecutor {
    type = AgentType.EMAIL_LIST_SUMMARIZER;
    dataType = DataType.EMAIL_SUMMARIES_LIST;
    fileType = FileType.JSON;
    private summarizerAgent: EmailSummarizerAgentExecutor;

    constructor() {
        this.summarizerAgent = new EmailSummarizerAgentExecutor();
    }

    async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
        console.log('EmailListSummarizerAgentExecutor: execute');
        try {
            const { agent, inputAssets } = context;
            const targetAssetId = agent.output_asset_ids?.[0] || `email_list_summary_${Date.now()}`;

            if (!inputAssets || inputAssets.length === 0) {
                throw new Error('No input assets provided');
            }

            const inputAsset = inputAssets[0];
            let emailMessages = getAssetContent(inputAsset) as EmailMessage[];
            console.log('EmailListSummarizerAgentExecutor: emailMessages', emailMessages);

            if (!Array.isArray(emailMessages)) {
                throw new Error('Input asset content must be an array of email messages');
            }

            // Process each email message using the summarizer agent
            const summaries: Array<{
                email_id: string;
                subject: string;
                from: string;
                to: string;
                date: string;
                summary: string;
            }> = [];

            for (const email of emailMessages) {
                // Create a temporary context for the summarizer agent
                const tempContext: AgentExecutionContext = {
                    ...context,
                    inputAssets: [{
                        ...inputAsset,
                        content: email // Wrap single email in array to match expected format
                    }]
                };

                const result = await this.summarizerAgent.execute(tempContext);
                if (result.success && result.outputAssets?.[0]) {
                    const summary = result.outputAssets[0].content as string;
                    summaries.push({
                        email_id: email.id,
                        subject: email.subject,
                        from: email.from,
                        to: email.to,
                        date: email.date,
                        summary
                    });
                }
            }

            console.log('EmailListSummarizerAgentExecutor: summaries', summaries);

            const asset = {
                asset_id: targetAssetId,
                name: `Summary of ${emailMessages.length} Emails`,
                description: `Summaries of ${emailMessages.length} email messages`,
                fileType: this.fileType,
                dataType: this.dataType,
                content: summaries,
                status: AssetStatus.READY,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                    creator: 'email_list_summarizer_agent',
                    tags: ['email', 'summary', 'list'],
                    source_asset_id: inputAsset.asset_id,
                    email_count: emailMessages.length
                },
                persistence: {
                    isInDb: false
                }
            };

            return {
                success: true,
                outputAssets: [asset]
            };
        } catch (error) {
            console.error('EmailListSummarizerAgentExecutor: Error during execution:', {
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
                error: error instanceof Error ? error.message : 'Unknown error in EmailListSummarizerAgentExecutor'
            };
        }
    }

    validateInputs(context: AgentExecutionContext): boolean {
        const { inputAssets } = context;
        if (!inputAssets || inputAssets.length === 0) {
            return false;
        }

        const inputAsset = inputAssets[0];
        return inputAsset.dataType === DataType.EMAIL_LIST &&
            Array.isArray(inputAsset.content) &&
            inputAsset.content.length > 0;
    }

    getRequiredInputTypes(): string[] {
        return ['email_list'];
    }
} 