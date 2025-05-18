// Basic type definitions
export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'object' | 'file';
export type ValueType = PrimitiveType | ComplexType;

// File value type
export interface FileValue {
    file_id: string;
    name: string;
    description?: string;
    content: Uint8Array;
    mime_type: string;
    size: number;
    extracted_text?: string;
    created_at: string;
    updated_at: string;
}

// Query value type
export interface Query {
    text: string;
    filters?: Record<string, any>;
    limit?: number;
    offset?: number;
}

// Search result type
export interface SearchResult {
    id: string;
    score: number;
    content: string;
    metadata?: Record<string, any>;
}

// Knowledge base type
export interface KnowledgeBase {
    id: string;
    name: string;
    description?: string;
    content: string;
    metadata?: Record<string, any>;
}

// Core schema definition that describes the shape/structure of a value
export interface Schema {
    type: ValueType;
    description?: string;
    is_array: boolean;  // If true, the value will be an array of the base type
    // Only used for object type
    fields?: Record<string, Schema>;
    // Format constraints
    format?: string;
    content_types?: string[];
}

// Runtime value type for any schema
export type SchemaValueType =
    | string
    | number
    | boolean
    | object
    | FileValue
    | Query
    | SearchResult
    | KnowledgeBase;

// Common schema types for tools
export interface ChecklistItem {
    item_to_score: string;
    current_score: number;
    explanation: string;
}

export interface SearchResultItem {
    title: string;
    link: string;
    snippet: string;
    content: string;
}

export interface URLAnalysisResult {
    url: string;
    relevance_score: number;
    explanation: string;
}

export interface ScrapedContent {
    url: string;
    content: string;
    metadata: Record<string, any>;
}

export interface KnowledgeNugget {
    nugget_id: string;
    content: string;
    confidence: number;
    conflicts_with: string[];
}

// Base tool interface that all tools must implement
export interface Tool {
    id: string;
    name: string;
    description: string;
    category: ToolCategory;
    inputs: ToolIO[];
    outputs: ToolIO[];
}

// Tool categories
export type ToolCategory =
    | 'question_processing'
    | 'research'
    | 'knowledge_management'
    | 'answer_generation';

// Tool input/output definition
export interface ToolIO {
    name: string;
    description: string;
    schema: Schema;
    required: boolean;
}

// Question Processing Tools

export interface QuestionImprovementTool extends Tool {
    name: 'question_improvement';
    category: 'question_processing';
    inputs: [
        ToolIO & {
            name: 'question';
            schema: { type: 'string'; is_array: false };
            required: true;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'improved_question';
            schema: { type: 'string'; is_array: false };
        }
    ];
}

export interface ChecklistGeneratorTool extends Tool {
    name: 'checklist_generator';
    category: 'question_processing';
    inputs: [
        ToolIO & {
            name: 'question';
            schema: { type: 'string'; is_array: false };
            required: true;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'checklist';
            schema: { type: 'object'; is_array: true; fields: ChecklistItem };
        }
    ];
}

// Research Tools

export interface QueryGeneratorTool extends Tool {
    name: 'query_generator';
    category: 'research';
    inputs: [
        ToolIO & {
            name: 'question';
            schema: { type: 'string'; is_array: false };
            required: true;
        },
        ToolIO & {
            name: 'checklist';
            schema: { type: 'object'; is_array: true; fields: ChecklistItem };
            required: true;
        },
        ToolIO & {
            name: 'query_history';
            schema: { type: 'string'; is_array: true };
            required: false;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'query';
            schema: { type: 'string'; is_array: false };
        }
    ];
}

export interface SearchTool extends Tool {
    name: 'search';
    category: 'research';
    inputs: [
        ToolIO & {
            name: 'query';
            schema: { type: 'string'; is_array: false };
            required: true;
        },
        ToolIO & {
            name: 'max_results';
            schema: { type: 'number'; is_array: false };
            required: false;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'results';
            schema: { type: 'object'; is_array: true; fields: SearchResultItem };
        }
    ];
}

export interface URLAnalyzerTool extends Tool {
    name: 'url_analyzer';
    category: 'research';
    inputs: [
        ToolIO & {
            name: 'question';
            schema: { type: 'string'; is_array: false };
            required: true;
        },
        ToolIO & {
            name: 'search_results';
            schema: { type: 'object'; is_array: true; fields: SearchResultItem };
            required: true;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'urls';
            schema: { type: 'object'; is_array: true; fields: URLAnalysisResult };
        }
    ];
}

export interface ContentScraperTool extends Tool {
    name: 'content_scraper';
    category: 'research';
    inputs: [
        ToolIO & {
            name: 'urls';
            schema: { type: 'string'; is_array: true };
            required: true;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'scraped_content';
            schema: { type: 'object'; is_array: true; fields: ScrapedContent };
        }
    ];
}

// Knowledge Management Tools

export interface KnowledgeBaseUpdateTool extends Tool {
    name: 'knowledge_base_update';
    category: 'knowledge_management';
    inputs: [
        ToolIO & {
            name: 'question';
            schema: { type: 'string'; is_array: false };
            required: true;
        },
        ToolIO & {
            name: 'current_kb';
            schema: { type: 'object'; is_array: true; fields: KnowledgeNugget };
            required: true;
        },
        ToolIO & {
            name: 'new_information';
            schema: { type: 'object'; is_array: true; fields: ScrapedContent };
            required: true;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'updated_kb';
            schema: { type: 'object'; is_array: true; fields: KnowledgeNugget };
        }
    ];
}

export interface AnswerGeneratorTool extends Tool {
    name: 'answer_generator';
    category: 'answer_generation';
    inputs: [
        ToolIO & {
            name: 'question';
            schema: { type: 'string'; is_array: false };
            required: true;
        },
        ToolIO & {
            name: 'checklist';
            schema: { type: 'object'; is_array: true; fields: ChecklistItem };
            required: true;
        },
        ToolIO & {
            name: 'knowledge_base';
            schema: { type: 'object'; is_array: true; fields: KnowledgeNugget };
            required: true;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'answer';
            schema: { type: 'string'; is_array: false };
        }
    ];
}

export interface AnswerScorerTool extends Tool {
    name: 'answer_scorer';
    category: 'answer_generation';
    inputs: [
        ToolIO & {
            name: 'question';
            schema: { type: 'string'; is_array: false };
            required: true;
        },
        ToolIO & {
            name: 'answer';
            schema: { type: 'string'; is_array: false };
            required: true;
        },
        ToolIO & {
            name: 'checklist';
            schema: { type: 'object'; is_array: true; fields: ChecklistItem };
            required: true;
        }
    ];
    outputs: [
        ToolIO & {
            name: 'scored_checklist';
            schema: { type: 'object'; is_array: true; fields: ChecklistItem };
        }
    ];
}

// Union type of all tool types
export type ToolType =
    | QuestionImprovementTool
    | ChecklistGeneratorTool
    | QueryGeneratorTool
    | SearchTool
    | URLAnalyzerTool
    | ContentScraperTool
    | KnowledgeBaseUpdateTool
    | AnswerGeneratorTool
    | AnswerScorerTool;

// Type utilities
export type ToolByName<T extends ToolType['name']> = Extract<ToolType, { name: T }>;
export type ToolInputs<T extends ToolType['name']> = ToolByName<T>['inputs'];
export type ToolOutputs<T extends ToolType['name']> = ToolByName<T>['outputs'];

// Master list of all available tools
export const availableTools: Tool[] = [
    {
        id: 'question_improvement',
        name: 'Question Improvement',
        description: 'Improves questions for clarity and completeness',
        category: 'question_processing',
        inputs: [
            {
                name: 'question',
                description: 'The question to improve',
                schema: { type: 'string', is_array: false },
                required: true
            }
        ],
        outputs: [
            {
                name: 'improved_question',
                description: 'The improved version of the question',
                schema: { type: 'string', is_array: false },
                required: true
            }
        ]
    },
    {
        id: 'checklist_generator',
        name: 'Checklist Generator',
        description: 'Generates a checklist of requirements for a complete answer',
        category: 'question_processing',
        inputs: [
            {
                name: 'question',
                description: 'The question to generate a checklist for',
                schema: { type: 'string', is_array: false },
                required: true
            }
        ],
        outputs: [
            {
                name: 'checklist',
                description: 'List of requirements for a complete answer',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        item_to_score: { type: 'string', is_array: false },
                        current_score: { type: 'number', is_array: false },
                        explanation: { type: 'string', is_array: false }
                    }
                },
                required: true
            }
        ]
    },
    {
        id: 'query_generator',
        name: 'Query Generator',
        description: 'Generates search queries based on question and requirements',
        category: 'research',
        inputs: [
            {
                name: 'question',
                description: 'The question to generate queries for',
                schema: { type: 'string', is_array: false },
                required: true
            },
            {
                name: 'checklist',
                description: 'Requirements checklist',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        item_to_score: { type: 'string', is_array: false },
                        current_score: { type: 'number', is_array: false },
                        explanation: { type: 'string', is_array: false }
                    }
                },
                required: true
            },
            {
                name: 'query_history',
                description: 'Previous search queries',
                schema: { type: 'string', is_array: true },
                required: false
            }
        ],
        outputs: [
            {
                name: 'query',
                description: 'Generated search query',
                schema: { type: 'string', is_array: false },
                required: true
            }
        ]
    },
    {
        id: 'search',
        name: 'Search',
        description: 'Performs web search with the given query',
        category: 'research',
        inputs: [
            {
                name: 'query',
                description: 'Search query',
                schema: { type: 'string', is_array: false },
                required: true
            },
            {
                name: 'max_results',
                description: 'Maximum number of results to return',
                schema: { type: 'number', is_array: false },
                required: false
            }
        ],
        outputs: [
            {
                name: 'results',
                description: 'Search results',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        title: { type: 'string', is_array: false },
                        link: { type: 'string', is_array: false },
                        snippet: { type: 'string', is_array: false },
                        content: { type: 'string', is_array: false }
                    }
                },
                required: true
            }
        ]
    },
    {
        id: 'url_analyzer',
        name: 'URL Analyzer',
        description: 'Analyzes search results to identify most relevant URLs',
        category: 'research',
        inputs: [
            {
                name: 'question',
                description: 'The question being researched',
                schema: { type: 'string', is_array: false },
                required: true
            },
            {
                name: 'search_results',
                description: 'Search results to analyze',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        title: { type: 'string', is_array: false },
                        link: { type: 'string', is_array: false },
                        snippet: { type: 'string', is_array: false },
                        content: { type: 'string', is_array: false }
                    }
                },
                required: true
            }
        ],
        outputs: [
            {
                name: 'urls',
                description: 'Analyzed URLs with relevance scores',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        url: { type: 'string', is_array: false },
                        relevance_score: { type: 'number', is_array: false },
                        explanation: { type: 'string', is_array: false }
                    }
                },
                required: true
            }
        ]
    },
    {
        id: 'content_scraper',
        name: 'Content Scraper',
        description: 'Scrapes content from specified URLs',
        category: 'research',
        inputs: [
            {
                name: 'urls',
                description: 'URLs to scrape',
                schema: { type: 'string', is_array: true },
                required: true
            }
        ],
        outputs: [
            {
                name: 'scraped_content',
                description: 'Scraped content from URLs',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        url: { type: 'string', is_array: false },
                        content: { type: 'string', is_array: false },
                        metadata: { type: 'object', is_array: false }
                    }
                },
                required: true
            }
        ]
    },
    {
        id: 'knowledge_base_update',
        name: 'Knowledge Base Update',
        description: 'Updates knowledge base with new information',
        category: 'knowledge_management',
        inputs: [
            {
                name: 'question',
                description: 'The question being researched',
                schema: { type: 'string', is_array: false },
                required: true
            },
            {
                name: 'current_kb',
                description: 'Current knowledge base state',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        nugget_id: { type: 'string', is_array: false },
                        content: { type: 'string', is_array: false },
                        confidence: { type: 'number', is_array: false },
                        conflicts_with: { type: 'string', is_array: true }
                    }
                },
                required: true
            },
            {
                name: 'new_information',
                description: 'New information to integrate',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        url: { type: 'string', is_array: false },
                        content: { type: 'string', is_array: false },
                        metadata: { type: 'object', is_array: false }
                    }
                },
                required: true
            }
        ],
        outputs: [
            {
                name: 'updated_kb',
                description: 'Updated knowledge base',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        nugget_id: { type: 'string', is_array: false },
                        content: { type: 'string', is_array: false },
                        confidence: { type: 'number', is_array: false },
                        conflicts_with: { type: 'string', is_array: true }
                    }
                },
                required: true
            }
        ]
    },
    {
        id: 'answer_generator',
        name: 'Answer Generator',
        description: 'Generates comprehensive answers using knowledge base',
        category: 'answer_generation',
        inputs: [
            {
                name: 'question',
                description: 'The question to answer',
                schema: { type: 'string', is_array: false },
                required: true
            },
            {
                name: 'checklist',
                description: 'Requirements checklist',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        item_to_score: { type: 'string', is_array: false },
                        current_score: { type: 'number', is_array: false },
                        explanation: { type: 'string', is_array: false }
                    }
                },
                required: true
            },
            {
                name: 'knowledge_base',
                description: 'Current knowledge base',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        nugget_id: { type: 'string', is_array: false },
                        content: { type: 'string', is_array: false },
                        confidence: { type: 'number', is_array: false },
                        conflicts_with: { type: 'string', is_array: true }
                    }
                },
                required: true
            }
        ],
        outputs: [
            {
                name: 'answer',
                description: 'Generated answer',
                schema: { type: 'string', is_array: false },
                required: true
            }
        ]
    },
    {
        id: 'answer_scorer',
        name: 'Answer Scorer',
        description: 'Scores answers against requirements checklist',
        category: 'answer_generation',
        inputs: [
            {
                name: 'question',
                description: 'The question being answered',
                schema: { type: 'string', is_array: false },
                required: true
            },
            {
                name: 'answer',
                description: 'Answer to score',
                schema: { type: 'string', is_array: false },
                required: true
            },
            {
                name: 'checklist',
                description: 'Requirements checklist',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        item_to_score: { type: 'string', is_array: false },
                        current_score: { type: 'number', is_array: false },
                        explanation: { type: 'string', is_array: false }
                    }
                },
                required: true
            }
        ],
        outputs: [
            {
                name: 'scored_checklist',
                description: 'Updated checklist with scores',
                schema: {
                    type: 'object',
                    is_array: true,
                    fields: {
                        item_to_score: { type: 'string', is_array: false },
                        current_score: { type: 'number', is_array: false },
                        explanation: { type: 'string', is_array: false }
                    }
                },
                required: true
            }
        ]
    }
]; 