import { AgentExecutor, AgentExecutionContext, AgentExecutionResult } from '../types';
import { AgentType } from '@/types/agent';
import { toolApi } from '../../api/toolApi';
import { Asset, FileType, DataType, AssetStatus } from '@/types/asset';

interface LLMAssetParameters {
    prompt_template_id: string;
}

interface AssetMetadata {
    prompt_template_param?: string;  // The parameter name this asset maps to in the prompt template
}

export class LLMAssetAgentExecutor implements AgentExecutor {
    type = AgentType.PROMPT_TEMPLATE;
    dataType = DataType.UNSTRUCTURED;
    fileType = FileType.TXT;

    async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
        try {
            const { agent, inputAssets } = context;
            const targetAssetId = agent.output_asset_ids?.[0] || `llm_response_${Date.now()}`;

            console.log('LLMAssetAgentExecutor: Starting execution with agent:', {
                agentId: agent.agent_id,
                type: agent.type,
                inputParameters: agent.input_parameters,
                inputAssets: inputAssets.map(a => ({ id: a.asset_id, name: a.name }))
            });

            // Extract prompt template ID from parameters
            const { prompt_template_id } = agent.input_parameters as LLMAssetParameters;

            // Get the template signature to know required parameters
            const signature = await toolApi.createToolSignatureFromTemplate(prompt_template_id);
            console.log('LLMAssetAgentExecutor: Template signature:', signature);

            // Map input assets to regular variables based on metadata and input parameters
            const regular_variables: Record<string, any> = {};
            const file_variables: Record<string, string> = {};

            // First try to find assets with matching parameter names in metadata
            for (const param of signature.parameters) {
                const paramName = (param as { name?: string }).name;
                if (!paramName) continue;

                // Look for asset with matching parameter name in metadata
                const matchingAsset = inputAssets.find(asset =>
                    (asset.metadata as AssetMetadata).prompt_template_param === paramName
                );

                if (matchingAsset) {
                    console.log(`Found matching asset for parameter ${paramName}:`, matchingAsset.name);
                    regular_variables[paramName] = matchingAsset.content;
                } else {
                    // Fall back to input parameters
                    const paramValue = agent.input_parameters[paramName];
                    if (paramValue !== undefined) {
                        console.log(`Using input parameter for ${paramName}`);
                        regular_variables[paramName] = paramValue;
                    } else {
                        console.warn(`No value found for required parameter: ${paramName}`);
                    }
                }
            }

            console.log('LLMAssetAgentExecutor: Mapped variables:', {
                regular_variables,
                file_variables
            });

            // Execute LLM with the provided parameters
            const response = await toolApi.executeLLM({
                prompt_template_id,
                regular_variables,
                file_variables
            });

            console.log('LLMAssetAgentExecutor: Received LLM response');

            // Create asset with the response
            const now = new Date().toISOString();
            const asset: Asset = {
                asset_id: targetAssetId,
                name: `LLM Response ${Date.now()}`,
                description: `Response from LLM using template ${prompt_template_id}`,
                fileType: this.fileType,
                dataType: this.dataType,
                content: response.response,
                status: AssetStatus.READY,
                metadata: {
                    createdAt: now,
                    updatedAt: now,
                    agentId: agent.agent_id,
                    agent_associations: [agent.agent_id],
                    prompt_template_param: 'response'  // Mark this asset as the response parameter
                },
                persistence: {
                    isInDb: false,
                    isDirty: true
                }
            };

            return {
                success: true,
                outputAssets: [asset],
                metadata: {
                    prompt_template_id,
                    model: response.template_id,
                    mapped_parameters: Object.keys(regular_variables)
                }
            };
        } catch (error) {
            console.error('Error executing LLM asset agent:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    validateInputs(context: AgentExecutionContext): boolean {
        const { agent } = context;
        const { prompt_template_id } = agent.input_parameters as LLMAssetParameters;

        // Check if we have the required prompt template ID
        if (!prompt_template_id) {
            return false;
        }

        return true;
    }

    getRequiredInputTypes(): string[] {
        return ['prompt_template_id'];
    }
} 