"""Populate tools and prompt templates

Revision ID: populate_tools_data
Revises: 
Create Date: 2024-02-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
import json
from datetime import datetime

# revision identifiers, used by Alembic
revision = 'populate_tools_data'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Define tables for bulk insert
    tools = table('tools',
        column('tool_id', sa.String),
        column('name', sa.String),
        column('description', sa.Text),
        column('tool_type', sa.String),
        column('signature', sa.JSON),
        column('created_at', sa.DateTime),
        column('updated_at', sa.DateTime)
    )

    prompt_templates = table('prompt_templates',
        column('template_id', sa.String),
        column('name', sa.String),
        column('description', sa.Text),
        column('template', sa.Text),
        column('tokens', sa.JSON),
        column('output_schema', sa.JSON),
        column('created_at', sa.DateTime),
        column('updated_at', sa.DateTime)
    )

    # Initial prompt templates data
    prompt_templates_data = [
        {
            'template_id': 'question-improver',
            'name': 'Question Improver',
            'description': 'Improves a research question for better results',
            'template': 'Given the question: {{question}}, suggest improvements to make it more specific and answerable. Reply in JSON format with the following fields: improvedQuestion, explanation. Format the JSON as a string.',
            'tokens': ['question'],
            'output_schema': {
                'type': 'object',
                'description': 'Improved question with explanation',
                'schema': {
                    'type': 'object',
                    'fields': {
                        'improvedQuestion': {
                            'type': 'string',
                            'description': 'The improved version of the question'
                        },
                        'explanation': {
                            'type': 'string',
                            'description': 'Explanation of the improvements made'
                        }
                    }
                }
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'template_id': 'answer-generator',
            'name': 'Answer Generator',
            'description': 'Generates comprehensive answers',
            'template': 'Based on the context: {{context}}, answer the question: {{question}}',
            'tokens': ['context', 'question'],
            'output_schema': {
                'type': 'string',
                'description': 'Comprehensive answer to the question'
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
    ]

    # Initial tools data
    tools_data = [
        {
            'tool_id': 'echo',
            'name': 'Echo Tool',
            'description': 'Echoes back the input with option to stringify objects',
            'tool_type': 'utility',
            'signature': {
                'parameters': [
                    {
                        'name': 'input',
                        'description': 'The input to echo',
                        'schema': {
                            'type': 'string',
                            'is_array': False,
                            'description': 'The input to echo'
                        }
                    },
                    {
                        'name': 'stringify',
                        'description': 'Whether to convert objects to JSON strings',
                        'schema': {
                            'type': 'boolean',
                            'is_array': False,
                            'description': 'If true, objects will be converted to JSON strings'
                        },
                        'required': False,
                        'default': False
                    }
                ],
                'outputs': [
                    {
                        'name': 'output',
                        'description': 'The echoed output',
                        'schema': {
                            'type': 'string',
                            'is_array': False,
                            'description': 'The echoed output'
                        }
                    }
                ]
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'tool_id': 'concatenate',
            'name': 'Concatenate Tool',
            'description': 'Concatenates two strings',
            'tool_type': 'utility',
            'signature': {
                'parameters': [
                    {
                        'name': 'first',
                        'description': 'First string',
                        'schema': {
                            'type': 'string',
                            'is_array': False,
                            'description': 'First string to concatenate'
                        }
                    },
                    {
                        'name': 'second',
                        'description': 'Second string',
                        'schema': {
                            'type': 'string',
                            'is_array': False,
                            'description': 'Second string to concatenate'
                        }
                    }
                ],
                'outputs': [
                    {
                        'name': 'result',
                        'description': 'Concatenated result',
                        'schema': {
                            'type': 'string',
                            'is_array': False,
                            'description': 'The concatenated result'
                        }
                    }
                ]
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'tool_id': 'search',
            'name': 'Search Tool',
            'description': 'Performs a web search',
            'tool_type': 'search',
            'signature': {
                'parameters': [{
                    'name': 'query',
                    'description': 'The search query text',
                    'schema': {
                        'type': 'string',
                        'is_array': False,
                        'description': 'The search query text'
                    }
                }],
                'outputs': [{
                    'name': 'results',
                    'description': 'List of search results, each containing title and snippet',
                    'schema': {
                        'type': 'string',
                        'is_array': True,
                        'description': 'Search results with title and snippet text'
                    }
                }]
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'tool_id': 'retrieve',
            'name': 'Retrieve Tool',
            'description': 'Retrieves content from URLs',
            'tool_type': 'retrieve',
            'signature': {
                'parameters': [
                    {
                        'name': 'urls',
                        'description': 'List of URLs to retrieve content from',
                        'schema': {
                            'type': 'string',
                            'is_array': True,
                            'description': 'URLs to retrieve content from'
                        }
                    }
                ],
                'outputs': [{
                    'name': 'contents',
                    'description': 'Retrieved content from each URL',
                    'schema': {
                        'type': 'string',
                        'is_array': True,
                        'description': 'Retrieved content from each URL'
                    }
                }]
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'tool_id': 'llm',
            'name': 'Language Model',
            'description': 'Executes prompts using a language model',
            'tool_type': 'llm',
            'signature': {
                'parameters': [],  # Will be populated when template is selected
                'outputs': []     # Will be populated when template is selected
            },
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
    ]

    # Insert data
    op.bulk_insert(prompt_templates, prompt_templates_data)
    op.bulk_insert(tools, tools_data)

def downgrade():
    # Remove the inserted data
    op.execute("DELETE FROM tools")
    op.execute("DELETE FROM prompt_templates") 