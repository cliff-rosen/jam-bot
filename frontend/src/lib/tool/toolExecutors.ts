import { ResolvedParameters, ToolOutputName, ToolOutputs, Tool } from '../../types/tools';
import { SchemaValueType } from '../../types/schema';
import { api } from '../api';
import { searchApi } from '../api/searchApi';
import { toolApi } from '../api/toolApi';

interface LLMParameters extends ResolvedParameters {
    prompt_template_id: string;
    regular_variables: Record<string, SchemaValueType>;
    file_variables: Record<string, string>;
}

// Helper function to prepare LLM parameters
const prepareLLMParameters = async (tool: Tool, parameters: ResolvedParameters): Promise<LLMParameters> => {
    const regular_variables: Record<string, SchemaValueType> = {};
    const file_variables: Record<string, string> = {};

    // Get the prompt template ID from parameters
    const promptTemplateId = (parameters as { prompt_template_id?: string }).prompt_template_id;
    if (!promptTemplateId) {
        throw new Error('No prompt template ID provided for LLM tool');
    }

    const signature = await toolApi.createToolSignatureFromTemplate(promptTemplateId);
    console.log('Template signature:', signature);

    // Transform parameters based on schema
    Object.entries(parameters).forEach(([key, value]) => {
        // Skip prompt template ID as it's handled separately
        if (key === 'prompt_template_id') return;

        const paramDef = signature.parameters.find(p =>
            (p as { name?: string }).name === key
        );
        if (!paramDef) {
            console.warn(`Parameter ${key} not found in template signature`);
            return;
        }

        if (paramDef.schema.type === 'file') {
            if (typeof value === 'object' && value !== null && 'file_id' in value) {
                file_variables[key] = value.file_id as string;
            }
        } else {
            regular_variables[key] = value;
        }
    });

    return {
        prompt_template_id: promptTemplateId,
        regular_variables,
        file_variables
    };
};

// Execute search tool function
export const executeSearch = async (_toolId: string, parameters: ResolvedParameters): Promise<ToolOutputs> => {
    const query = (parameters as Record<string, string>)['query'];
    try {
        const searchResults = await searchApi.search(query);

        // Log the raw search results for debugging
        console.log('Raw search results:', searchResults);

        // Return the search results directly - the schema should be defined in the tool signature
        // The schema expects an array of objects with specific fields
        return {
            ['results' as ToolOutputName]: searchResults as unknown as SchemaValueType
        };
    } catch (error) {
        console.error('Error executing search:', error);
        throw error;
    }
};

// Execute PubMed search tool function
export const executePubMedSearch = async (_toolId: string, parameters: ResolvedParameters): Promise<ToolOutputs> => {
    console.log('Executing PubMed search with parameters:', parameters);
    const query = (parameters as Record<string, string>)['query'];
    try {
        const articles = await toolApi.searchPubMed(query);

        // Format each article into a structured result
        const formattedResults = articles.map((article: any) =>
            `Title: ${article.title}\n` +
            `Journal: ${article.journal}\n` +
            `Date: ${article.publication_date}\n` +
            `Abstract: ${article.abstract}\n` +
            `URL: ${article.url}`
        )

        return {
            ['results' as ToolOutputName]: formattedResults as SchemaValueType
        };
    } catch (error) {
        console.error('Error executing PubMed search:', error);
        throw error;
    }
};

// Execute LLM tool function
export const executeLLM = async (toolId: string, parameters: ResolvedParameters): Promise<ToolOutputs> => {
    console.log('Executing LLM with parameters:', parameters);

    try {
        // Get the tool details
        const tool = await toolApi.getTool(toolId);

        // Prepare LLM parameters
        const llmParams = await prepareLLMParameters(tool, parameters);

        // Call the backend LLM execution endpoint
        const response = await toolApi.executeLLM(llmParams);

        return {
            ['response' as ToolOutputName]: response.response
        };

    } catch (error: any) {
        console.error('Error executing LLM:', error);

        // Handle specific error cases
        if (error.response?.status === 422 && error.response?.data?.detail?.includes('LLM response was not valid JSON')) {
            console.error('LLM returned invalid JSON:', error.response.data.detail);
            throw new Error(`The AI returned a response in an invalid format. This usually happens when the AI doesn't follow the required JSON structure. Try running the step again or adjusting the prompt to emphasize the need for valid JSON output.`);
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
            window.location.href = '/login';
        }
        throw error;
    }
}; 