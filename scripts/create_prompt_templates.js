/**
 * Script to create prompt templates in the database
 * Run with: node scripts/create_prompt_templates.js
 */

const axios = require('axios');

// Base URL for the API
const API_BASE_URL = 'http://localhost:8000';

// Prompt templates to create
const promptTemplates = [
    {
        name: 'Question Improver',
        description: 'Improves a research question for better results',
        user_message_template: `You are an expert at improving questions to make them more specific, clear, and answerable.

Given the question: {{question}}

Please analyze this question and provide an improved version that is:
1. More specific and focused
2. Clearer in its intent
3. More likely to yield a precise answer
4. Free of ambiguities

Reply in JSON format with the following structure:
{
  "improvedQuestion": "The improved version of the question",
  "explanation": "Brief explanation of the improvements made"
}`,
        system_message_template: 'You are an AI assistant specialized in improving questions to make them more specific, clear, and answerable. Always respond in valid JSON format.',
        tokens: [
            {
                name: 'question',
                type: 'string'
            }
        ],
        output_schema: {
            type: 'object',
            description: 'Improved question with explanation',
            properties: {
                improvedQuestion: {
                    type: 'string',
                    description: 'The improved version of the question'
                },
                explanation: {
                    type: 'string',
                    description: 'Explanation of the improvements made'
                }
            },
            required: ['improvedQuestion', 'explanation']
        }
    },
    {
        name: 'Question Improvement Evaluator',
        description: 'Evaluates the quality of question improvement and provides a confidence score',
        user_message_template: `You are an expert at evaluating the quality of question improvements.

Original Question: {{originalQuestion}}
Improved Question: {{improvedQuestion}}

Please evaluate how much the improved question enhances the original question in terms of:
1. Specificity and focus
2. Clarity of intent
3. Likelihood of yielding a precise answer
4. Removal of ambiguities

Reply in JSON format with the following structure:
{
  "confidenceScore": <number between 0 and 1>,
  "evaluation": "Detailed evaluation of the improvement"
}`,
        system_message_template: 'You are an AI assistant specialized in evaluating question improvements. Always respond in valid JSON format with a confidence score between 0 and 1.',
        tokens: [
            {
                name: 'originalQuestion',
                type: 'string'
            },
            {
                name: 'improvedQuestion',
                type: 'string'
            }
        ],
        output_schema: {
            type: 'object',
            description: 'Evaluation of question improvement',
            properties: {
                confidenceScore: {
                    type: 'number',
                    description: 'Confidence score between 0 and 1'
                },
                evaluation: {
                    type: 'string',
                    description: 'Detailed evaluation of the improvement'
                }
            },
            required: ['confidenceScore', 'evaluation']
        }
    }
];

// Function to create a prompt template
async function createPromptTemplate(template) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/prompt-templates`, template);
        console.log(`Created template: ${template.name} with ID: ${response.data.template_id}`);
        return response.data;
    } catch (error) {
        console.error(`Error creating template ${template.name}:`, error.response?.data || error.message);
        throw error;
    }
}

// Main function to create all templates
async function createAllTemplates() {
    try {
        console.log('Creating prompt templates...');

        for (const template of promptTemplates) {
            await createPromptTemplate(template);
        }

        console.log('All templates created successfully!');
    } catch (error) {
        console.error('Failed to create templates:', error);
    }
}

// Run the script
createAllTemplates(); 