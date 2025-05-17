import { Journey, Workflow, Asset, ChatMessage, Tool, Agent, WorkflowState } from './types';

export const initialWorkflowState = {
    currentStepIndex: 0,
    isProcessing: true
};

export const sampleJourney: Journey = {
    id: "j_2024_03_15_001",
    title: "Q1 Client Feedback Analysis",
    goal: "Analyze customer feedback from Q1 2024 to identify key themes and sentiment",
    status: "active",
    creator: "Sarah Chen",
    createdAt: "2024-03-15T10:30:00Z",
    updatedAt: "2024-03-15T10:30:00Z",
    tags: ["feedback", "analysis", "quarterly-review"],
    deliverableType: "report"
};

export const sampleWorkflow: Workflow = {
    id: "wf_2024_03_15_001",
    journeyId: sampleJourney.id,
    status: "running",
    currentStepIndex: 0,
    steps: [
        {
            id: "step_001",
            name: "Email Collection",
            description: "Search and collect client emails from Q1 2024",
            status: "running",
            agentType: "email_search",
            level: 0,
            tools: ["email_search"],
            inputs: {
                dateRange: "2024-01-01/2024-03-31",
                searchTerms: ["feedback", "review", "opinion"]
            },
            outputs: {},
            progress: 65,
            assets: [],
            isExpanded: true
        },
        {
            id: "step_002",
            name: "Feedback Extraction",
            description: "Extract feedback points from collected emails",
            status: "pending",
            agentType: "feedback_extractor",
            level: 0,
            tools: ["feedback_extractor"],
            inputs: {
                format: "structured_json",
                fields: ["sentiment", "topic", "urgency"]
            },
            outputs: {},
            progress: 0,
            assets: [],
            isExpanded: false
        },
        {
            id: "step_003",
            name: "Theme Analysis",
            description: "Identify common themes and patterns",
            status: "pending",
            agentType: "theme_analyzer",
            level: 0,
            tools: ["theme_analyzer"],
            inputs: {
                minThemeFrequency: 3,
                maxThemes: 10
            },
            outputs: {},
            progress: 0,
            assets: [],
            isExpanded: false
        },
        {
            id: "step_004",
            name: "Quality Check",
            description: "Evaluate analysis quality and coverage",
            status: "pending",
            agentType: "evaluator",
            level: 0,
            tools: ["quality_checker"],
            inputs: {
                conditions: [
                    {
                        id: "cond_001",
                        variable: "coverage_score",
                        operator: "less_than",
                        value: 0.8,
                        targetStepIndex: 2
                    }
                ],
                defaultAction: "continue",
                maximumJumps: 3
            },
            outputs: {},
            progress: 0,
            assets: [],
            isExpanded: false
        },
        {
            id: "step_005",
            name: "Report Generation",
            description: "Create final analysis report",
            status: "pending",
            agentType: "report_generator",
            level: 0,
            tools: ["report_generator"],
            inputs: {
                template: "quarterly_feedback",
                format: "pdf"
            },
            outputs: {},
            progress: 0,
            assets: [],
            isExpanded: false
        }
    ],
    assets: []
};

export const sampleAssets: Asset[] = [
    {
        id: "asset_001",
        title: "Q1 Client Emails",
        type: "intermediate",
        format: "json",
        content: {
            location: "/assets/j_2024_03_15_001/email_dataset.json"
        },
        metadata: {
            creator: "Sarah Chen",
            createdAt: "2024-03-15T10:30:00Z",
            updatedAt: "2024-03-15T10:30:00Z",
            tags: ["emails", "feedback", "q1"],
            stepId: "step_001",
            toolId: "email_search"
        },
        version: 1,
        history: []
    },
    {
        id: "asset_002",
        title: "Extracted Feedback Points",
        type: "intermediate",
        format: "json",
        content: {
            location: "/assets/j_2024_03_15_001/feedback_points.json"
        },
        metadata: {
            creator: "Sarah Chen",
            createdAt: "2024-03-15T10:30:00Z",
            updatedAt: "2024-03-15T10:30:00Z",
            tags: ["feedback", "analysis", "q1"],
            stepId: "step_002",
            toolId: "feedback_extractor"
        },
        version: 1,
        history: []
    },
    {
        id: "asset_003",
        title: "Q1 2024 Client Feedback Analysis",
        type: "output",
        format: "pdf",
        content: {
            location: "/assets/j_2024_03_15_001/q1_analysis.pdf"
        },
        metadata: {
            creator: "Sarah Chen",
            createdAt: "2024-03-15T10:30:00Z",
            updatedAt: "2024-03-15T10:30:00Z",
            tags: ["report", "analysis", "q1"],
            stepId: "step_005",
            toolId: "report_generator"
        },
        version: 1,
        history: []
    }
];

export const sampleMessages: ChatMessage[] = [
    {
        id: "msg_001",
        role: "user",
        content: "I need to analyze our client feedback from Q1 2024",
        timestamp: "2024-03-15T10:30:00Z",
        metadata: {
            type: "goal",
            phase: "setup"
        }
    },
    {
        id: "msg_002",
        role: "assistant",
        content: "I'll help you analyze the Q1 client feedback. I've created a journey card for this analysis - you can review it in the task area.",
        timestamp: "2024-03-15T10:30:05Z",
        metadata: {
            type: "confirmation",
            phase: "setup"
        }
    },
    {
        id: "msg_003",
        role: "assistant",
        content: "Journey card accepted",
        timestamp: "2024-03-15T10:30:15Z",
        metadata: {
            type: "status",
            phase: "setup"
        }
    }
];

export const sampleTools: Tool[] = [
    {
        id: "email_search",
        name: "Email Search",
        description: "Search and collect emails based on criteria",
        category: "search",
        capabilities: ["email_search", "data_collection"],
        parameters: [
            {
                name: "dateRange",
                type: "string",
                description: "Date range to search within",
                required: true
            },
            {
                name: "searchTerms",
                type: "array",
                description: "Terms to search for",
                required: true
            }
        ],
        icon: "search"
    },
    {
        id: "feedback_extractor",
        name: "Feedback Extractor",
        description: "Extract structured feedback from text",
        category: "analysis",
        capabilities: ["text_analysis", "sentiment_analysis"],
        parameters: [
            {
                name: "format",
                type: "string",
                description: "Output format",
                required: true
            },
            {
                name: "fields",
                type: "array",
                description: "Fields to extract",
                required: true
            }
        ],
        icon: "extract"
    },
    {
        id: "theme_analyzer",
        name: "Theme Analyzer",
        description: "Identify common themes in feedback",
        category: "analysis",
        capabilities: ["theme_analysis", "pattern_recognition"],
        parameters: [
            {
                name: "minThemeFrequency",
                type: "number",
                description: "Minimum frequency for theme inclusion",
                required: true
            },
            {
                name: "maxThemes",
                type: "number",
                description: "Maximum number of themes to identify",
                required: true
            }
        ],
        icon: "analyze"
    },
    {
        id: "report_generator",
        name: "Report Generator",
        description: "Generate analysis reports",
        category: "generation",
        capabilities: ["report_generation", "formatting"],
        parameters: [
            {
                name: "template",
                type: "string",
                description: "Report template to use",
                required: true
            },
            {
                name: "format",
                type: "string",
                description: "Output format",
                required: true
            }
        ],
        icon: "report"
    }
];

export const sampleAgents: Agent[] = [
    {
        id: "agent_001",
        name: "Email Search Agent",
        description: "Specialized in searching and collecting emails",
        capabilities: ["email_search", "data_collection"],
        tools: ["email_search"],
        configuration: {
            maxResults: 1000,
            dateRange: "2024-01-01/2024-03-31"
        },
        metrics: {
            usageCount: 45,
            avgDuration: 120,
            successRate: 0.95
        }
    },
    {
        id: "agent_002",
        name: "Feedback Analysis Agent",
        description: "Analyzes and processes feedback data",
        capabilities: ["feedback_extraction", "theme_analysis"],
        tools: ["feedback_extractor", "theme_analyzer"],
        configuration: {
            minConfidence: 0.8,
            maxThemes: 10
        },
        metrics: {
            usageCount: 32,
            avgDuration: 180,
            successRate: 0.88
        }
    }
];

