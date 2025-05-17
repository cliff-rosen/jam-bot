-- Insert prompt templates for the first workflow
INSERT INTO prompt_templates (
    template_id,
    name,
    description,
    system_message_template,
    user_message_template,
    tokens,
    output_schema,
    created_at,
    updated_at
) VALUES (
    'question-improver',
    'Question Improver',
    'Improves a research question for better results',
    'You are an AI assistant specialized in improving questions to make them more specific, clear, and answerable. Always respond in valid JSON format.',
    'You are an expert at improving questions to make them more specific, clear, and answerable.

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
}',
    '[{"name": "question", "type": "string", "description": "The original question to improve"}]',
    '{
        "type": "object",
        "is_array": false,
        "description": "Improved question with explanation",
        "fields": {
            "improvedQuestion": {
                "type": "string",
                "is_array": false,
                "description": "The improved version of the question"
            },
            "explanation": {
                "type": "string",
                "is_array": false,
                "description": "Explanation of the improvements made"
            }
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'question-improvement-evaluator',
    'Question Improvement Evaluator',
    'Evaluates the quality of question improvement and provides a confidence score',
    'You are an AI assistant specialized in evaluating question improvements. Always respond in valid JSON format with a confidence score between 0 and 1.',
    'You are an expert at evaluating the quality of question improvements.

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
}',
    '[
        {"name": "originalQuestion", "type": "string", "description": "The original question"},
        {"name": "improvedQuestion", "type": "string", "description": "The improved version of the question"}
    ]',
    '{
        "type": "object",
        "is_array": false,
        "description": "Evaluation of question improvement",
        "fields": {
            "confidenceScore": {
                "type": "number",
                "is_array": false,
                "description": "Confidence score between 0 and 1"
            },
            "evaluation": {
                "type": "string",
                "is_array": false,
                "description": "Detailed evaluation of the improvement"
            }
        }
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert LLM tools that use these templates
INSERT INTO tools (
    tool_id,
    name,
    description,
    tool_type,
    signature,
    created_at,
    updated_at
) VALUES (
    'question-improver-tool',
    'Question Improver',
    'Improves a research question for better results',
    'llm',
    '{
        "parameters": [
            {
                "name": "prompt_template_id",
                "schema": {
                    "type": "string",
                    "is_array": false
                },
                "required": true,
                "default": "question-improver",
                "description": "ID of the prompt template to use"
            },
            {
                "name": "question",
                "schema": {
                    "type": "string",
                    "is_array": false
                },
                "required": true,
                "description": "The original question to improve"
            }
        ],
        "outputs": [
            {
                "name": "response",
                "schema": {
                    "type": "object",
                    "is_array": false,
                    "description": "Improved question with explanation",
                    "fields": {
                        "improvedQuestion": {
                            "type": "string",
                            "is_array": false,
                            "description": "The improved version of the question"
                        },
                        "explanation": {
                            "type": "string",
                            "is_array": false,
                            "description": "Explanation of the improvements made"
                        }
                    }
                }
            }
        ]
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'question-evaluator-tool',
    'Question Improvement Evaluator',
    'Evaluates the quality of question improvement and provides a confidence score',
    'llm',
    '{
        "parameters": [
            {
                "name": "prompt_template_id",
                "schema": {
                    "type": "string",
                    "is_array": false
                },
                "required": true,
                "default": "question-improvement-evaluator",
                "description": "ID of the prompt template to use"
            },
            {
                "name": "originalQuestion",
                "schema": {
                    "type": "string",
                    "is_array": false
                },
                "required": true,
                "description": "The original question"
            },
            {
                "name": "improvedQuestion",
                "schema": {
                    "type": "string",
                    "is_array": false
                },
                "required": true,
                "description": "The improved version of the question"
            }
        ],
        "outputs": [
            {
                "name": "response",
                "schema": {
                    "type": "object",
                    "is_array": false,
                    "description": "Evaluation of question improvement",
                    "fields": {
                        "confidenceScore": {
                            "type": "number",
                            "is_array": false,
                            "description": "Confidence score between 0 and 1"
                        },
                        "evaluation": {
                            "type": "string",
                            "is_array": false,
                            "description": "Detailed evaluation of the improvement"
                        }
                    }
                }
            }
        ]
    }',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
); 