import { FileType, DataType, AssetStatus } from '@/types/asset';
import { Agent, AgentType } from '@/types/agent';
import { AgentExecutor, AgentExecutionContext, AgentExecutionResult } from '../types';
import { EmailMessage } from '@/types/email';
import { toolApi } from '@/lib/api/toolApi';

const PROMPT_TEMPLATE_ID = 'extract_email_articles';

export class EmailSummarizerAgentExecutor implements AgentExecutor {
    type = AgentType.EMAIL_SUMMARIZER;
    dataType = DataType.UNSTRUCTURED;
    fileType = FileType.TXT;

    async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
        console.log('EmailSummarizerAgentExecutor: execute')
        try {
            const { agent, inputAssets } = context;
            const targetAssetId = agent.output_asset_ids?.[0] || `email_summary_${Date.now()}`;

            if (!inputAssets || inputAssets.length === 0) {
                throw new Error('No input assets provided');
            }

            const inputAsset = inputAssets[0];
            let emailMessage: EmailMessage;
            if (inputAsset.content?.email_message) {
                emailMessage = inputAsset.content['email_message'] as EmailMessage;
            } else {
                emailMessage = inputAsset.content as EmailMessage;
            }
            console.log('EmailSummarizerAgentExecutor: emailMessage', emailMessage)

            // Fake summarization function - in a real implementation, this would use an LLM
            const summary = await this.generateSummary(emailMessage);

            const asset = {
                asset_id: targetAssetId,
                name: `Summary: ${emailMessage.subject}`,
                description: 'Summary of the email message',
                fileType: FileType.JSON,
                dataType: DataType.EMAIL_MESSAGE,
                content: summary,
                status: AssetStatus.READY,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                    creator: 'email_summarizer_agent',
                    tags: ['email', 'summary'],
                    source_asset_id: inputAsset.asset_id
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
            console.error('EmailSummarizerAgentExecutor: Error during execution:', {
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
                error: error instanceof Error ? error.message : 'Unknown error in EmailSummarizerAgentExecutor'
            };
        }
    }

    private async generateSummary(email: EmailMessage): Promise<string> {
        console.log('EmailSummarizerAgentExecutor: generateSummary', email)
        // Get the email body content, falling back to snippet if no body is available
        let bodyContent = '';
        if (email['body']) {
            bodyContent = email['body']['plain'] || email['body']['html'] || email['snippet'] || '';
        } else {
            bodyContent = email['snippet'] || '';
        }

        // If we still don't have any content, use a default message
        if (!bodyContent) {
            bodyContent = 'No content available';
        }

        try {
            const llmResponse = await toolApi.executeLLM({
                prompt_template_id: PROMPT_TEMPLATE_ID,
                regular_variables: {
                    email_content: bodyContent
                },
                file_variables: {}
            });

            return llmResponse.response;
        } catch (error) {
            console.error('Error generating summary with LLM:', error);
            // Fallback to basic summary if LLM fails
            const date = new Date(parseInt(email.date)).toLocaleString();
            return `Email Summary:
From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Date: ${date}

Summary:
${bodyContent.substring(0, 200)}...`;
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
            inputAsset.content.length === 1;
    }

    getRequiredInputTypes(): string[] {
        return ['email_message'];
    }
} 