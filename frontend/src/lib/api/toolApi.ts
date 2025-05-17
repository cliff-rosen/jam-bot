import { Tool, ToolSignature, ToolOutputName, ToolParameterName } from '../../types/tools';
import { PromptTemplate, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '../../types/prompts';
import { api, handleApiError } from './index';
import { WorkflowStep, EnhancedOutputMapping } from '../../types/workflows';
// Caches for tools and prompt templates    
let toolsCache: Tool[] | null = null;
let promptTemplatesCache: PromptTemplate[] | null = null;

////// Tool API functions //////

// Helper function to check if a mapping is an enhanced mapping
const isEnhancedMapping = (mapping: any): mapping is EnhancedOutputMapping => {
    return typeof mapping === 'object' && 'variable' in mapping && 'operation' in mapping;
};

export const toolApi = {
    getTools: async (): Promise<Tool[]> => {
        const response = await api.get('/api/tools');
        return response.data;
    },

    getTool: async (toolId: string): Promise<Tool> => {
        const response = await api.get(`/api/tools/${toolId}`);
        return response.data;
    },

    getPromptTemplates: async (): Promise<PromptTemplate[]> => {
        const response = await api.get('/api/prompt-templates');
        return response.data;
    },

    getPromptTemplate: async (templateId: string): Promise<PromptTemplate> => {
        const response = await api.get(`/api/prompt-templates/${templateId}`);
        return response.data;
    },

    createPromptTemplate: async (template: PromptTemplateCreate): Promise<PromptTemplate> => {
        const response = await api.post('/api/prompt-templates', template);
        return response.data;
    },

    updatePromptTemplate: async (templateId: string, template: PromptTemplateUpdate): Promise<PromptTemplate> => {
        const response = await api.put(`/api/prompt-templates/${templateId}`, template);
        return response.data;
    },

    deletePromptTemplate: async (templateId: string): Promise<void> => {
        await api.delete(`/api/prompt-templates/${templateId}`);
    },

    testPromptTemplate: async (templateId: string, testData: PromptTemplateTest): Promise<any> => {
        const response = await api.post(`/api/prompt-templates/test`, testData);
        return response.data;
    },

    createToolSignatureFromTemplate: async (templateId: string): Promise<ToolSignature> => {
        const response = await api.get(`/api/prompt-templates/${templateId}/signature`);
        return response.data;
    },

    executeLLM: async (llmParams: any): Promise<any> => {
        console.log('executeLLM', llmParams)
        const response = await api.post('/api/execute_llm', llmParams);
        return response.data;
    },

    searchPubMed: async (query: string): Promise<any> => {
        const response = await api.get('/api/pubmed/search', { params: { query } });
        return response.data;
    },

    // Clear the cache (useful when we need to force a refresh)
    clearCache: () => {
        toolsCache = null;
        promptTemplatesCache = null;
    }
}; 