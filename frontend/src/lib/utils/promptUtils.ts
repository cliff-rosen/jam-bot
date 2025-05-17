import { PromptTemplate } from '@/types/prompts';
import { toolApi } from '../api/toolApi';

export async function generateTemplateParameterTable(): Promise<string> {
    try {
        // Get all prompt templates
        const templates = await toolApi.getPromptTemplates();

        // Generate markdown table
        let table = '## Available Prompt Templates\n\n';
        table += '| Template ID | Name | Description | Parameters |\n';
        table += '|-------------|------|-------------|------------|\n';

        for (const template of templates) {
            // Get template signature for parameter details
            const signature = await toolApi.createToolSignatureFromTemplate(template.template_id);

            // Format parameters
            const params = signature.parameters.map(param => {
                const paramDef = param as { name?: string; schema?: { type: string; description?: string } };
                return `- ${paramDef.name} (${paramDef.schema?.type || 'unknown'})${paramDef.schema?.description ? `: ${paramDef.schema.description}` : ''}`;
            }).join('\n');

            // Add row to table
            table += `| ${template.template_id} | ${template.name} | ${template.description || ''} | ${params} |\n`;
        }

        return table;
    } catch (error) {
        console.error('Error generating template parameter table:', error);
        return 'Error generating template parameter table';
    }
} 