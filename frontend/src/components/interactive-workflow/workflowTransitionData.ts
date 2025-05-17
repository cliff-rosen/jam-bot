import { Journey, Workflow, ChatMessage, JourneyState, ActionButton, WorkflowStep } from './types';

export interface TransitionStep {
    state: JourneyState;
    description: string;
    chatMessages: ChatMessage[];
    journey?: Partial<Journey>;
    workflow?: Partial<Workflow>;
}

export interface UISnapshot {
    timestamp: string;
    description: string;
    journey: Journey | null;
    isRightPanelOpen?: boolean;
}

export const uiSnapshots: UISnapshot[] = [
    {
        timestamp: new Date().toISOString(),
        description: "Initial state - journey created but no goal defined",
        journey: {
            id: "j_2024_03_15_000",
            title: "",
            goal: "",
            state: "AWAITING_GOAL",
            creator: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
            deliverable: {
                id: "del_000",
                name: "",
                description: "",
                type: "report"
            },
            messages: [],
            workflow: null,
            workspace: {
                id: "ws_2024_03_15_000",
                objectType: "proposed_journey",
                object: {
                    id: "j_2024_03_15_000",
                    title: "",
                    goal: "",
                    state: "AWAITING_GOAL",
                    creator: "",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    tags: [],
                    deliverable: {
                        id: "del_000",
                        name: "",
                        description: "",
                        type: "report"
                    },
                    messages: [],
                    workflow: null,
                    workspace: {
                        id: "ws_2024_03_15_000",
                        objectType: "proposed_journey",
                        object: {} as Journey
                    },
                    assets: [],
                    agents: []
                }
            },
            assets: [],
            agents: []
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "User sends initial message",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze customer feedback from Q1 2024 to identify key themes and sentiment",
            state: "AWAITING_GOAL",
            creator: "Sarah Chen",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ["feedback", "analysis", "quarterly-review"],
            deliverable: {
                id: "del_001",
                name: "Q1 Client Feedback Report",
                description: "Analysis report of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: 'msg_001',
                    role: 'user',
                    content: 'I need to analyze our client feedback from Q1 2024',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'goal'
                    }
                }
            ],
            workflow: null,
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "none",
                object: null
            },
            assets: [],
            agents: []
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "User sends initial message",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze customer feedback from Q1 2024 to identify key themes and sentiment",
            state: "AWAITING_GOAL",
            creator: "Sarah Chen",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ["feedback", "analysis", "quarterly-review"],
            deliverable: {
                id: "del_001",
                name: "Q1 Client Feedback Report",
                description: "Analysis report of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: 'msg_001',
                    role: 'user',
                    content: 'I need to analyze our client feedback from Q1 2024',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'goal'
                    }
                },
                {
                    id: 'msg_002',
                    role: 'assistant',
                    content: 'I will help you analyze the Q1 client feedback. I have created a journey card for this analysis - you can review it in the task area.',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'status'
                    }
                }
            ],
            workflow: null,
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "proposed_journey",
                object: {
                    id: "j_2024_03_15_001",
                    title: "Q1 Client Feedback Analysis",
                    goal: "Analyze customer feedback from Q1 2024 to identify key themes and sentiment",
                    state: "AWAITING_WORKFLOW_DESIGN",
                    creator: "Sarah Chen",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    tags: ["feedback", "analysis", "quarterly-review"],
                    deliverable: {
                        id: "del_001",
                        name: "Q1 Client Feedback Report",
                        description: "Analysis report of client feedback from Q1 2024",
                        type: "report"
                    },
                    messages: [],
                    workflow: null,
                    workspace: {
                        id: "ws_2024_03_15_001",
                        objectType: "proposed_journey",
                        object: {} as Journey
                    },
                }
            },
            assets: [],
            agents: []
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Journey accepted, designing workflow",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze customer feedback from Q1 2024 to identify key themes and sentiment",
            state: "AWAITING_WORKFLOW_DESIGN",
            creator: "Sarah Chen",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ["feedback", "analysis", "quarterly-review"],
            deliverable: {
                id: "del_001",
                name: "Q1 Client Feedback Report",
                description: "Analysis report of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: 'msg_001',
                    role: 'user',
                    content: 'I need to analyze our client feedback from Q1 2024',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'goal'
                    }
                },
                {
                    id: 'msg_002',
                    role: 'assistant',
                    content: 'I will help you analyze the Q1 client feedback. I have created a journey card for this analysis - you can review it in the task area.',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'status'
                    }
                },
                {
                    id: 'msg_003',
                    role: 'assistant',
                    content: 'Great! I\'ll now design a workflow to help analyze the Q1 client feedback. This will involve collecting and processing the feedback data, analyzing key themes, and generating a comprehensive report.',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'status'
                    }
                }
            ],
            workflow: null,
            workspace: {
                id: "ws_2024_03_15_002",
                objectType: "none",
                object: {
                    id: "wf_2024_03_15_001",
                    status: "pending",
                    currentStepIndex: 0,
                    steps: [],
                    assets: []
                },
                actionButtons: [],
            },
            assets: [],
            agents: []
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Workflow presented",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze customer feedback from Q1 2024 to identify key themes and sentiment",
            state: "AWAITING_WORKFLOW_START",
            creator: "Sarah Chen",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: ["feedback", "analysis", "quarterly-review"],
            deliverable: {
                id: "del_001",
                name: "Q1 Client Feedback Report",
                description: "Analysis report of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: 'msg_001',
                    role: 'user',
                    content: 'I need to analyze our client feedback from Q1 2024',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'goal'
                    }
                },
                {
                    id: 'msg_002',
                    role: 'assistant',
                    content: 'I will help you analyze the Q1 client feedback. I have created a journey card for this analysis - you can review it in the task area.',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'status'
                    }
                },
                {
                    id: 'msg_003',
                    role: 'assistant',
                    content: 'Great! I\'ll now design a workflow to help analyze the Q1 client feedback. This will involve collecting and processing the feedback data, analyzing key themes, and generating a comprehensive report.',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'status'
                    }
                },
                {
                    id: 'msg_004',
                    role: 'assistant',
                    content: 'I have designed a workflow with these steps:\n\n1. Collect emails\n2. Extract feedback\n3. Analyze themes\n4. Generate report\n\nPlease review it and either accept, reject or edit it to proceed.',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        type: 'confirmation'
                    }
                }
            ],
            workflow: null,
            workspace: {
                id: "ws_2024_03_15_002",
                objectType: "proposed_workflow",
                object: {
                    id: "wf_2024_03_15_001",
                    status: "pending",
                    currentStepIndex: 0,
                    steps: [
                        {
                            id: "step_001",
                            name: "Collect Emails",
                            description: "Gathering all relevant customer feedback emails from Q1 2024",
                            status: "pending",
                            agentType: "collector",
                            level: 0,
                            tools: ["email_search"],
                            inputs: {
                                dateRange: "2024-01-01/2024-03-31",
                                searchTerms: ["feedback", "review", "opinion"]
                            },
                            outputs: {},
                            progress: 0,
                            assets: []
                        },
                        {
                            id: "step_002",
                            name: "Extract Feedback",
                            description: "Processing emails to extract relevant feedback content",
                            status: "pending",
                            agentType: "extractor",
                            level: 0,
                            tools: ["text_extractor"],
                            inputs: {},
                            outputs: {},
                            progress: 0,
                            assets: []
                        },
                        {
                            id: "step_003",
                            name: "Analyze Themes",
                            description: "Identifying key themes and sentiment from the feedback",
                            status: "pending",
                            agentType: "analyzer",
                            level: 0,
                            tools: ["theme_analyzer", "sentiment_analyzer"],
                            inputs: {},
                            outputs: {},
                            progress: 0,
                            assets: []
                        },
                        {
                            id: "step_004",
                            name: "Generate Report",
                            description: "Creating a comprehensive analysis report",
                            status: "pending",
                            agentType: "reporter",
                            level: 0,
                            tools: ["report_generator"],
                            inputs: {},
                            outputs: {},
                            progress: 0,
                            assets: []
                        }
                    ],
                },
                actionButtons: [
                    {
                        id: 'accept-workflow',
                        label: 'Accept Workflow',
                        type: 'primary',
                        action: 'accept_workflow',
                        onClick: () => { }
                    },
                    {
                        id: 'reject-workflow',
                        label: 'Reject Workflow',
                        type: 'danger',
                        action: 'reject_workflow',
                        onClick: () => { }
                    },
                    {
                        id: 'edit-workflow',
                        label: 'Edit Workflow',
                        type: 'secondary',
                        action: 'edit_workflow',
                        onClick: () => { }
                    }
                ]
            },
            assets: [],
            agents: []
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Workflow accepted, workflow in workflow area",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze client feedback from Q1 2024 to identify key themes and actionable insights",
            state: "AWAITING_WORKFLOW_START",
            creator: "user",
            createdAt: "2024-03-15T10:00:00Z",
            updatedAt: "2024-03-15T10:00:00Z",
            tags: ["analysis", "client-feedback", "Q1-2024"],
            deliverable: {
                id: "d_2024_03_15_001",
                name: "Client Feedback Analysis Report",
                description: "A comprehensive analysis of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: "m_2024_03_15_001",
                    role: "user",
                    content: "I need to analyze client feedback from Q1 2024",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_002",
                    role: "assistant",
                    content: "I've created a journey card for analyzing Q1 2024 client feedback. Please review and approve it.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_003",
                    role: "assistant",
                    content: "I've designed a workflow for analyzing the client feedback. Here's what I propose:\n\n1. **Data Collection**: Gather all client feedback from Q1 2024\n2. **Theme Analysis**: Identify recurring themes and patterns\n3. **Sentiment Analysis**: Evaluate overall sentiment and key concerns\n4. **Insight Generation**: Generate actionable insights and recommendations",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_004",
                    role: "assistant",
                    content: "You've accepted the proposed workflow. The workflow is now ready to start. Would you like to begin the analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                }
            ],
            workflow: {
                id: "w_2024_03_15_001",
                status: "running",
                currentStepIndex: 0,
                steps: [
                    {
                        id: "s_2024_03_15_001",
                        name: "Data Collection",
                        description: "Gather all client feedback from Q1 2024",
                        status: "ready",
                        agentType: "Data Collector",
                        level: 0,
                        tools: ["feedback_collector"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_002",
                        name: "Theme Analysis",
                        description: "Identify recurring themes and patterns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["theme_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_003",
                        name: "Sentiment Analysis",
                        description: "Evaluate overall sentiment and key concerns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["sentiment_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_004",
                        name: "Insight Generation",
                        description: "Generate actionable insights and recommendations",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["insight_generator"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    }
                ],
                assets: []
            },
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "none",
                object: null
            },
            assets: [],
            agents: []
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Workflow started with agent",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze client feedback from Q1 2024 to identify key themes and actionable insights",
            state: "WORKFLOW_IN_PROGRESS",
            creator: "user",
            createdAt: "2024-03-15T10:00:00Z",
            updatedAt: "2024-03-15T10:00:00Z",
            tags: ["analysis", "client-feedback", "Q1-2024"],
            deliverable: {
                id: "d_2024_03_15_001",
                name: "Client Feedback Analysis Report",
                description: "A comprehensive analysis of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: "m_2024_03_15_001",
                    role: "user",
                    content: "I need to analyze client feedback from Q1 2024",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_002",
                    role: "assistant",
                    content: "I've created a journey card for analyzing Q1 2024 client feedback. Please review and approve it.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_003",
                    role: "assistant",
                    content: "I've designed a workflow for analyzing the client feedback. Here's what I propose:\n\n1. **Data Collection**: Gather all client feedback from Q1 2024\n2. **Theme Analysis**: Identify recurring themes and patterns\n3. **Sentiment Analysis**: Evaluate overall sentiment and key concerns\n4. **Insight Generation**: Generate actionable insights and recommendations",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_004",
                    role: "assistant",
                    content: "You've accepted the proposed workflow. The workflow is now ready to start. Would you like to begin the analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_005",
                    role: "assistant",
                    content: "I've started the workflow. The Data Collector agent will begin gathering client feedback from Q1 2024.",
                    timestamp: "2024-03-15T10:00:00Z"
                }
            ],
            workflow: {
                id: "w_2024_03_15_001",
                status: "running",
                currentStepIndex: 0,
                steps: [
                    {
                        id: "s_2024_03_15_001",
                        name: "Data Collection",
                        description: "Gather all client feedback from Q1 2024",
                        status: "running",
                        agentType: "Data Collector",
                        level: 0,
                        tools: ["feedback_collector"],
                        inputs: {},
                        outputs: {},
                        progress: 25,
                        assets: [
                            {
                                id: "a_2024_03_15_001",
                                title: "Q1 2024 Client Feedback Dataset",
                                type: "input",
                                format: "json",
                                content: {},
                                metadata: {
                                    creator: "Data Collector",
                                    createdAt: "2024-03-15T10:00:00Z",
                                    updatedAt: "2024-03-15T10:00:00Z",
                                    tags: ["raw-data", "client-feedback", "Q1-2024"],
                                    stepId: "s_2024_03_15_001",
                                    toolId: "feedback_collector"
                                },
                                version: 1,
                                history: []
                            }
                        ]
                    },
                    {
                        id: "s_2024_03_15_002",
                        name: "Theme Analysis",
                        description: "Identify recurring themes and patterns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["theme_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_003",
                        name: "Sentiment Analysis",
                        description: "Evaluate overall sentiment and key concerns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["sentiment_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_004",
                        name: "Insight Generation",
                        description: "Generate actionable insights and recommendations",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["insight_generator"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    }
                ],
                assets: [
                    {
                        id: "a_2024_03_15_001",
                        title: "Q1 2024 Client Feedback Dataset",
                        type: "input",
                        format: "json",
                        content: {},
                        metadata: {
                            creator: "Data Collector",
                            createdAt: "2024-03-15T10:00:00Z",
                            updatedAt: "2024-03-15T10:00:00Z",
                            tags: ["raw-data", "client-feedback", "Q1-2024"],
                            stepId: "s_2024_03_15_001",
                            toolId: "feedback_collector"
                        },
                        version: 1,
                        history: []
                    }
                ]
            },
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "workflow_step",
                object: {
                    id: "s_2024_03_15_001",
                    name: "Data Collection",
                    description: "Gather all client feedback from Q1 2024",
                    status: "running",
                    agentType: "Data Collector",
                    level: 0,
                    tools: ["feedback_collector"],
                    inputs: {},
                    outputs: {},
                    progress: 25,
                    assets: [
                        {
                            id: "a_2024_03_15_001",
                            title: "Q1 2024 Client Feedback Dataset",
                            type: "input",
                            format: "email-list",
                            content: {},
                            metadata: {
                                creator: "Data Collector",
                                createdAt: "2024-03-15T10:00:00Z",
                                updatedAt: "2024-03-15T10:00:00Z",
                                tags: ["raw-data", "client-feedback", "Q1-2024"],
                                stepId: "s_2024_03_15_001",
                                toolId: "feedback_collector"
                            },
                            version: 1,
                            history: []
                        }
                    ]
                },
                actionButtons: [
                    {
                        id: "accept_data",
                        label: "Accept and Add to Assets",
                        type: "primary",
                        action: "accept_workflow",
                        onClick: () => { }
                    }
                ]
            },
            assets: [],
            agents: [
                {
                    id: "agent_001",
                    name: "Data Collector",
                    description: "Collects feedback from clients",
                    capabilities: ["data_collection"],
                    tools: ["feedback_collector"],
                    configuration: {},
                    inputs: {
                        dataset: "ds_2024_03_15_001"
                    },
                    outputs: {
                        themes: [],
                        patterns: []
                    }
                }
            ]
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Data Collection complete, output ready for confirmation",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze client feedback from Q1 2024 to identify key themes and actionable insights",
            state: "WORKFLOW_IN_PROGRESS",
            creator: "user",
            createdAt: "2024-03-15T10:00:00Z",
            updatedAt: "2024-03-15T10:00:00Z",
            tags: ["analysis", "client-feedback", "Q1-2024"],
            deliverable: {
                id: "d_2024_03_15_001",
                name: "Client Feedback Analysis Report",
                description: "A comprehensive analysis of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: "m_2024_03_15_001",
                    role: "user",
                    content: "I need to analyze client feedback from Q1 2024",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_002",
                    role: "assistant",
                    content: "I've created a journey card for analyzing Q1 2024 client feedback. Please review and approve it.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_003",
                    role: "assistant",
                    content: "I've designed a workflow for analyzing the client feedback. Here's what I propose:\n\n1. **Data Collection**: Gather all client feedback from Q1 2024\n2. **Theme Analysis**: Identify recurring themes and patterns\n3. **Sentiment Analysis**: Evaluate overall sentiment and key concerns\n4. **Insight Generation**: Generate actionable insights and recommendations",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_004",
                    role: "assistant",
                    content: "You've accepted the proposed workflow. The workflow is now ready to start. Would you like to begin the analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_005",
                    role: "assistant",
                    content: "I've started the workflow. The Data Collector agent will begin gathering client feedback from Q1 2024.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_006",
                    role: "assistant",
                    content: "The Data Collector agent has completed gathering all client feedback from Q1 2024. I've compiled the data into a structured dataset. Please review the output in the workspace and confirm if you'd like to accept it and add it to the workflow assets.",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "accept_data",
                                label: "Accept and Add to Assets",
                                type: "primary",
                                action: "accept_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                }
            ],
            workflow: {
                id: "w_2024_03_15_001",
                status: "running",
                currentStepIndex: 0,
                steps: [
                    {
                        id: "s_2024_03_15_001",
                        name: "Data Collection",
                        description: "Gather all client feedback from Q1 2024",
                        status: "completed",
                        agentType: "Data Collector",
                        level: 0,
                        tools: ["feedback_collector"],
                        inputs: {},
                        outputs: {
                            dataset: {
                                id: "ds_2024_03_15_001",
                                name: "Q1 2024 Client Feedback Dataset",
                                description: "Structured dataset containing all client feedback from Q1 2024",
                                size: "2.5MB",
                                format: "json",
                                recordCount: 1250,
                                dateRange: "2024-01-01 to 2024-03-31"
                            }
                        },
                        progress: 100,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_002",
                        name: "Theme Analysis",
                        description: "Identify recurring themes and patterns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["theme_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_003",
                        name: "Sentiment Analysis",
                        description: "Evaluate overall sentiment and key concerns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["sentiment_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_004",
                        name: "Insight Generation",
                        description: "Generate actionable insights and recommendations",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["insight_generator"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    }
                ],
                assets: []
            },
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "workflow_step",
                object: {
                    id: "s_2024_03_15_001",
                    name: "Data Collection",
                    description: "Gather all client feedback from Q1 2024",
                    status: "completed",
                    agentType: "Data Collector",
                    level: 0,
                    tools: ["feedback_collector"],
                    inputs: {},
                    outputs: {
                        dataset: {
                            id: "ds_2024_03_15_001",
                            name: "Q1 2024 Client Feedback Dataset",
                            description: "Structured dataset containing all client feedback from Q1 2024",
                            size: "2.5MB",
                            format: "json",
                            recordCount: 1250,
                            dateRange: "2024-01-01 to 2024-03-31"
                        }
                    },
                    progress: 100,
                    assets: [
                        {
                            id: "a_2024_03_15_001",
                            title: "Q1 2024 Client Feedback Dataset",
                            type: "input",
                            format: "email-list",
                            content: {},
                            metadata: {
                                creator: "Data Collector",
                                createdAt: "2024-03-15T10:00:00Z",
                                updatedAt: "2024-03-15T10:00:00Z",
                                tags: ["raw-data", "client-feedback", "Q1-2024"],
                                stepId: "s_2024_03_15_001",
                                toolId: "feedback_collector"
                            },
                            version: 1,
                            history: []
                        }
                    ]

                },
                actionButtons: [
                    {
                        id: "accept_data",
                        label: "Accept and Add to Assets",
                        type: "primary",
                        action: "accept_workflow",
                        onClick: () => { }
                    }
                ]
            },
            assets: [],
            agents: []
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Data Collection output accepted, ready for Theme Analysis",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze client feedback from Q1 2024 to identify key themes and actionable insights",
            state: "WORKFLOW_IN_PROGRESS",
            creator: "user",
            createdAt: "2024-03-15T10:00:00Z",
            updatedAt: "2024-03-15T10:00:00Z",
            tags: ["analysis", "client-feedback", "Q1-2024"],
            deliverable: {
                id: "d_2024_03_15_001",
                name: "Client Feedback Analysis Report",
                description: "A comprehensive analysis of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: "m_2024_03_15_001",
                    role: "user",
                    content: "I need to analyze client feedback from Q1 2024",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_002",
                    role: "assistant",
                    content: "I've created a journey card for analyzing Q1 2024 client feedback. Please review and approve it.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_003",
                    role: "assistant",
                    content: "I've designed a workflow for analyzing the client feedback. Here's what I propose:\n\n1. **Data Collection**: Gather all client feedback from Q1 2024\n2. **Theme Analysis**: Identify recurring themes and patterns\n3. **Sentiment Analysis**: Evaluate overall sentiment and key concerns\n4. **Insight Generation**: Generate actionable insights and recommendations",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_004",
                    role: "assistant",
                    content: "You've accepted the proposed workflow. The workflow is now ready to start. Would you like to begin the analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_005",
                    role: "assistant",
                    content: "I've started the workflow. The Data Collector agent will begin gathering client feedback from Q1 2024.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_006",
                    role: "assistant",
                    content: "The Data Collector agent has completed gathering all client feedback from Q1 2024. I've compiled the data into a structured dataset. Please review the output in the workspace and confirm if you'd like to accept it and add it to the workflow assets.",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "accept_data",
                                label: "Accept and Add to Assets",
                                type: "primary",
                                action: "accept_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_007",
                    role: "assistant",
                    content: "I've added the Q1 2024 Client Feedback Dataset to the workflow assets. The Theme Analysis agent is ready to begin analyzing the data for recurring themes and patterns. Would you like to proceed with the theme analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_theme_analysis",
                                label: "Start Theme Analysis",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            }
                        ]
                    }
                }
            ],
            workflow: {
                id: "w_2024_03_15_001",
                status: "running",
                currentStepIndex: 1,
                steps: [
                    {
                        id: "s_2024_03_15_001",
                        name: "Data Collection",
                        description: "Gather all client feedback from Q1 2024",
                        status: "completed",
                        agentType: "Data Collector",
                        level: 0,
                        tools: ["feedback_collector"],
                        inputs: {},
                        outputs: {},
                        progress: 100,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_002",
                        name: "Theme Analysis",
                        description: "Identify recurring themes and patterns",
                        status: "running",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["theme_analyzer"],
                        inputs: {
                            dataset: "ds_2024_03_15_001"
                        },
                        outputs: {},
                        progress: 25,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_003",
                        name: "Sentiment Analysis",
                        description: "Evaluate overall sentiment and key concerns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["sentiment_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_004",
                        name: "Insight Generation",
                        description: "Generate actionable insights and recommendations",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["insight_generator"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    }
                ],
                assets: [
                    {
                        id: "ds_2024_03_15_001",
                        title: "Q1 2024 Client Feedback Dataset",
                        type: "input",
                        format: "email-list",
                        content: {},
                        metadata: {
                            creator: "Data Collector",
                            createdAt: "2024-03-15T10:00:00Z",
                            updatedAt: "2024-03-15T10:00:00Z",
                            tags: ["raw-data", "client-feedback", "Q1-2024"],
                            stepId: "s_2024_03_15_001",
                            toolId: "feedback_collector"
                        },
                        version: 1,
                        history: []
                    }
                ]
            },
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "none",
                object: null
            },
            assets: [
                {
                    id: "ds_2024_03_15_001",
                    title: "Q1 2024 Client Feedback Dataset",
                    type: "input",
                    format: "email-list",
                    content: {},
                    metadata: {
                        creator: "Data Collector",
                        createdAt: "2024-03-15T10:00:00Z",
                        updatedAt: "2024-03-15T10:00:00Z",
                        tags: ["raw-data", "client-feedback", "Q1-2024"],
                        stepId: "s_2024_03_15_001",
                        toolId: "feedback_collector"
                    },
                    version: 1,
                    history: []
                }
            ],
            agents: [
                {
                    id: "agent_002",
                    name: "Theme Analyst",
                    description: "Analyzes feedback for recurring themes",
                    capabilities: ["theme_analysis", "pattern_recognition"],
                    tools: ["theme_analyzer"],
                    configuration: {},
                    inputs: {
                        dataset: "ds_2024_03_15_001"
                    },
                    outputs: {
                        themes: [],
                        patterns: []
                    },
                    status: "active"
                },
                {
                    id: "agent_003",
                    name: "Sentiment Analyst",
                    description: "Evaluates sentiment in feedback",
                    capabilities: ["sentiment_analysis", "emotion_detection"],
                    tools: ["sentiment_analyzer"],
                    configuration: {},
                    inputs: {},
                    outputs: {},
                    status: "inactive"
                },
                {
                    id: "agent_004",
                    name: "Insight Generator",
                    description: "Generates actionable insights from analysis",
                    capabilities: ["insight_generation", "recommendation"],
                    tools: ["insight_generator"],
                    configuration: {},
                    inputs: {},
                    outputs: {},
                    status: "inactive"
                }
            ]
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Theme Analysis step begins",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze client feedback from Q1 2024 to identify key themes and actionable insights",
            state: "WORKFLOW_IN_PROGRESS",
            creator: "user",
            createdAt: "2024-03-15T10:00:00Z",
            updatedAt: "2024-03-15T10:00:00Z",
            tags: ["analysis", "client-feedback", "Q1-2024"],
            deliverable: {
                id: "d_2024_03_15_001",
                name: "Client Feedback Analysis Report",
                description: "A comprehensive analysis of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: "m_2024_03_15_001",
                    role: "user",
                    content: "I need to analyze client feedback from Q1 2024",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_002",
                    role: "assistant",
                    content: "I've created a journey card for analyzing Q1 2024 client feedback. Please review and approve it.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_003",
                    role: "assistant",
                    content: "I've designed a workflow for analyzing the client feedback. Here's what I propose:\n\n1. **Data Collection**: Gather all client feedback from Q1 2024\n2. **Theme Analysis**: Identify recurring themes and patterns\n3. **Sentiment Analysis**: Evaluate overall sentiment and key concerns\n4. **Insight Generation**: Generate actionable insights and recommendations",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_004",
                    role: "assistant",
                    content: "You've accepted the proposed workflow. The workflow is now ready to start. Would you like to begin the analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_005",
                    role: "assistant",
                    content: "I've started the workflow. The Data Collector agent will begin gathering client feedback from Q1 2024.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_006",
                    role: "assistant",
                    content: "The Data Collector agent has completed gathering all client feedback from Q1 2024. I've compiled the data into a structured dataset. Please review the output in the workspace and confirm if you'd like to accept it and add it to the workflow assets.",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "accept_data",
                                label: "Accept and Add to Assets",
                                type: "primary",
                                action: "accept_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_007",
                    role: "assistant",
                    content: "I've added the Q1 2024 Client Feedback Dataset to the workflow assets. The Theme Analysis agent is ready to begin analyzing the data for recurring themes and patterns. Would you like to proceed with the theme analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_theme_analysis",
                                label: "Start Theme Analysis",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_008",
                    role: "assistant",
                    content: "I've started the Theme Analysis step. The Theme Analyst agent will now analyze the feedback data to identify recurring themes and patterns. This may take a few moments.",
                    timestamp: "2024-03-15T10:00:00Z"
                }
            ],
            workflow: {
                id: "w_2024_03_15_001",
                status: "running",
                currentStepIndex: 1,
                steps: [
                    {
                        id: "s_2024_03_15_001",
                        name: "Data Collection",
                        description: "Gather all client feedback from Q1 2024",
                        status: "completed",
                        agentType: "Data Collector",
                        level: 0,
                        tools: ["feedback_collector"],
                        inputs: {},
                        outputs: {},
                        progress: 100,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_002",
                        name: "Theme Analysis",
                        description: "Identify recurring themes and patterns",
                        status: "running",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["theme_analyzer"],
                        inputs: {
                            dataset: "ds_2024_03_15_001"
                        },
                        outputs: {},
                        progress: 25,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_003",
                        name: "Sentiment Analysis",
                        description: "Evaluate overall sentiment and key concerns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["sentiment_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_004",
                        name: "Insight Generation",
                        description: "Generate actionable insights and recommendations",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["insight_generator"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    }
                ],
                assets: [
                    {
                        id: "ds_2024_03_15_001",
                        title: "Q1 2024 Client Feedback Dataset",
                        type: "input",
                        format: "email-list",
                        content: {},
                        metadata: {
                            creator: "Data Collector",
                            createdAt: "2024-03-15T10:00:00Z",
                            updatedAt: "2024-03-15T10:00:00Z",
                            tags: ["raw-data", "client-feedback", "Q1-2024"],
                            stepId: "s_2024_03_15_001",
                            toolId: "feedback_collector"
                        },
                        version: 1,
                        history: []
                    }
                ]
            },
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "workflow_step",
                object: {
                    id: "s_2024_03_15_002",
                    name: "Theme Analysis",
                    description: "Identify recurring themes and patterns",
                    status: "running",
                    agentType: "Analyst",
                    level: 0,
                    tools: ["theme_analyzer"],
                    inputs: {
                        dataset: "ds_2024_03_15_001"
                    },
                    outputs: {},
                    progress: 25,
                    assets: [
                        {
                            id: "a_2024_03_15_001",
                            title: "Theme Analysis Output",
                            type: "input",
                            format: "json",
                            content: {},
                            metadata: {
                                creator: "Theme Analyst",
                                createdAt: "2024-03-15T10:00:00Z",
                                updatedAt: "2024-03-15T10:00:00Z",
                                tags: ["theme-analysis", "client-feedback", "Q1-2024"],
                                stepId: "s_2024_03_15_002",
                                toolId: "feedback_collector"
                            },
                            version: 1,
                            history: []
                        }

                    ]

                },
                actionButtons: []
            },
            assets: [
                {
                    id: "ds_2024_03_15_001",
                    title: "Q1 2024 Client Feedback Dataset",
                    type: "input",
                    format: "email-list",
                    content: {},
                    metadata: {
                        creator: "Data Collector",
                        createdAt: "2024-03-15T10:00:00Z",
                        updatedAt: "2024-03-15T10:00:00Z",
                        tags: ["raw-data", "client-feedback", "Q1-2024"],
                        stepId: "s_2024_03_15_001",
                        toolId: "feedback_collector"
                    },
                    version: 1,
                    history: []
                }
            ],
            agents: [
                {
                    id: "agent_002",
                    name: "Theme Analyst",
                    description: "Analyzes feedback for recurring themes",
                    capabilities: ["theme_analysis", "pattern_recognition"],
                    tools: ["theme_analyzer"],
                    configuration: {},
                    inputs: {
                        dataset: "ds_2024_03_15_001"
                    },
                    outputs: {
                        themes: [],
                        patterns: []
                    },
                    status: "active"
                },
                {
                    id: "agent_003",
                    name: "Sentiment Analyst",
                    description: "Evaluates sentiment in feedback",
                    capabilities: ["sentiment_analysis", "emotion_detection"],
                    tools: ["sentiment_analyzer"],
                    configuration: {},
                    inputs: {},
                    outputs: {},
                    status: "inactive"
                },
                {
                    id: "agent_004",
                    name: "Insight Generator",
                    description: "Generates actionable insights from analysis",
                    capabilities: ["insight_generation", "recommendation"],
                    tools: ["insight_generator"],
                    configuration: {},
                    inputs: {},
                    outputs: {},
                    status: "inactive"
                }
            ]
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Theme Analysis step completed",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze client feedback from Q1 2024 to identify key themes and actionable insights",
            state: "WORKFLOW_IN_PROGRESS",
            creator: "user",
            createdAt: "2024-03-15T10:00:00Z",
            updatedAt: "2024-03-15T10:00:00Z",
            tags: ["analysis", "client-feedback", "Q1-2024"],
            deliverable: {
                id: "d_2024_03_15_001",
                name: "Client Feedback Analysis Report",
                description: "A comprehensive analysis of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: "m_2024_03_15_001",
                    role: "user",
                    content: "I need to analyze client feedback from Q1 2024",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_002",
                    role: "assistant",
                    content: "I've created a journey card for analyzing Q1 2024 client feedback. Please review and approve it.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_003",
                    role: "assistant",
                    content: "I've designed a workflow for analyzing the client feedback. Here's what I propose:\n\n1. **Data Collection**: Gather all client feedback from Q1 2024\n2. **Theme Analysis**: Identify recurring themes and patterns\n3. **Sentiment Analysis**: Evaluate overall sentiment and key concerns\n4. **Insight Generation**: Generate actionable insights and recommendations",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_004",
                    role: "assistant",
                    content: "You've accepted the proposed workflow. The workflow is now ready to start. Would you like to begin the analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_005",
                    role: "assistant",
                    content: "I've started the workflow. The Data Collector agent will begin gathering client feedback from Q1 2024.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_006",
                    role: "assistant",
                    content: "The Data Collector agent has completed gathering all client feedback from Q1 2024. I've compiled the data into a structured dataset. Please review the output in the workspace and confirm if you'd like to accept it and add it to the workflow assets.",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "accept_data",
                                label: "Accept and Add to Assets",
                                type: "primary",
                                action: "accept_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_007",
                    role: "assistant",
                    content: "I've added the Q1 2024 Client Feedback Dataset to the workflow assets. The Theme Analysis agent is ready to begin analyzing the data for recurring themes and patterns. Would you like to proceed with the theme analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_theme_analysis",
                                label: "Start Theme Analysis",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_008",
                    role: "assistant",
                    content: "I've started the Theme Analysis step. The Theme Analyst agent will now analyze the feedback data to identify recurring themes and patterns. This may take a few moments.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_009",
                    role: "assistant",
                    content: "The Theme Analysis agent has completed analyzing the feedback data. Please review the output in the workspace and confirm if you'd like to accept it and add it to the workflow assets.",
                    timestamp: "2024-03-15T10:00:00Z"
                }
            ],
            workflow: {
                id: "w_2024_03_15_001",
                status: "running",
                currentStepIndex: 1,
                steps: [
                    {
                        id: "s_2024_03_15_001",
                        name: "Data Collection",
                        description: "Gather all client feedback from Q1 2024",
                        status: "completed",
                        agentType: "Data Collector",
                        level: 0,
                        tools: ["feedback_collector"],
                        inputs: {},
                        outputs: {},
                        progress: 100,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_002",
                        name: "Theme Analysis",
                        description: "Identify recurring themes and patterns",
                        status: "completed",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["theme_analyzer"],
                        inputs: {
                            dataset: "ds_2024_03_15_001"
                        },
                        outputs: {},
                        progress: 25,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_003",
                        name: "Sentiment Analysis",
                        description: "Evaluate overall sentiment and key concerns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["sentiment_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_004",
                        name: "Insight Generation",
                        description: "Generate actionable insights and recommendations",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["insight_generator"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    }
                ],
                assets: [
                    {
                        id: "ds_2024_03_15_001",
                        title: "Q1 2024 Client Feedback Dataset",
                        type: "input",
                        format: "email-list",
                        content: {},
                        metadata: {
                            creator: "Data Collector",
                            createdAt: "2024-03-15T10:00:00Z",
                            updatedAt: "2024-03-15T10:00:00Z",
                            tags: ["raw-data", "client-feedback", "Q1-2024"],
                            stepId: "s_2024_03_15_001",
                            toolId: "feedback_collector"
                        },
                        version: 1,
                        history: []
                    }
                ]
            },
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "workflow_step",
                object: {
                    id: "s_2024_03_15_002",
                    name: "Theme Analysis",
                    description: "Identify recurring themes and patterns",
                    status: "completed",
                    agentType: "Analyst",
                    level: 0,
                    tools: ["theme_analyzer"],
                    inputs: {
                        dataset: "ds_2024_03_15_001"
                    },
                    outputs: {},
                    progress: 25,
                    assets: [
                        {
                            id: "a_2024_03_15_001",
                            title: "Theme Analysis Output",
                            type: "input",
                            format: "json",
                            content: {},
                            metadata: {
                                creator: "Theme Analyst",
                                createdAt: "2024-03-15T10:00:00Z",
                                updatedAt: "2024-03-15T10:00:00Z",
                                tags: ["theme-analysis", "client-feedback", "Q1-2024"],
                                stepId: "s_2024_03_15_002",
                                toolId: "feedback_collector"
                            },
                            version: 1,
                            history: []
                        }

                    ]
                },
                actionButtons: []
            },
            assets: [
                {
                    id: "ds_2024_03_15_001",
                    title: "Q1 2024 Client Feedback Dataset",
                    type: "input",
                    format: "email-list",
                    content: {},
                    metadata: {
                        creator: "Data Collector",
                        createdAt: "2024-03-15T10:00:00Z",
                        updatedAt: "2024-03-15T10:00:00Z",
                        tags: ["raw-data", "client-feedback", "Q1-2024"],
                        stepId: "s_2024_03_15_001",
                        toolId: "feedback_collector"
                    },
                    version: 1,
                    history: []
                }
            ],
            agents: [
                {
                    id: "agent_002",
                    name: "Theme Analyst",
                    description: "Analyzes feedback for recurring themes",
                    capabilities: ["theme_analysis", "pattern_recognition"],
                    tools: ["theme_analyzer"],
                    configuration: {},
                    inputs: {
                        dataset: "ds_2024_03_15_001"
                    },
                    outputs: {
                        themes: [],
                        patterns: []
                    },
                    status: "active"
                }
            ]
        }
    },
    {
        timestamp: new Date().toISOString(),
        description: "Theme Analysis output accepted, ready for Sentiment Analysis",
        journey: {
            id: "j_2024_03_15_001",
            title: "Q1 Client Feedback Analysis",
            goal: "Analyze client feedback from Q1 2024 to identify key themes and actionable insights",
            state: "WORKFLOW_IN_PROGRESS",
            creator: "user",
            createdAt: "2024-03-15T10:00:00Z",
            updatedAt: "2024-03-15T10:00:00Z",
            tags: ["analysis", "client-feedback", "Q1-2024"],
            deliverable: {
                id: "d_2024_03_15_001",
                name: "Client Feedback Analysis Report",
                description: "A comprehensive analysis of client feedback from Q1 2024",
                type: "report"
            },
            messages: [
                {
                    id: "m_2024_03_15_001",
                    role: "user",
                    content: "I need to analyze client feedback from Q1 2024",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_002",
                    role: "assistant",
                    content: "I've created a journey card for analyzing Q1 2024 client feedback. Please review and approve it.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_003",
                    role: "assistant",
                    content: "I've designed a workflow for analyzing the client feedback. Here's what I propose:\n\n1. **Data Collection**: Gather all client feedback from Q1 2024\n2. **Theme Analysis**: Identify recurring themes and patterns\n3. **Sentiment Analysis**: Evaluate overall sentiment and key concerns\n4. **Insight Generation**: Generate actionable insights and recommendations",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_004",
                    role: "assistant",
                    content: "You've accepted the proposed workflow. The workflow is now ready to start. Would you like to begin the analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_005",
                    role: "assistant",
                    content: "I've started the workflow. The Data Collector agent will begin gathering client feedback from Q1 2024.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_006",
                    role: "assistant",
                    content: "The Data Collector agent has completed gathering all client feedback from Q1 2024. I've compiled the data into a structured dataset. Please review the output in the workspace and confirm if you'd like to accept it and add it to the workflow assets.",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "accept_data",
                                label: "Accept and Add to Assets",
                                type: "primary",
                                action: "accept_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_007",
                    role: "assistant",
                    content: "I've added the Q1 2024 Client Feedback Dataset to the workflow assets. The Theme Analysis agent is ready to begin analyzing the data for recurring themes and patterns. Would you like to proceed with the theme analysis?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_theme_analysis",
                                label: "Start Theme Analysis",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            }
                        ]
                    }
                },
                {
                    id: "m_2024_03_15_008",
                    role: "assistant",
                    content: "I've started the Theme Analysis step. The Theme Analyst agent will now analyze the feedback data to identify recurring themes and patterns. This may take a few moments.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_009",
                    role: "assistant",
                    content: "The Theme Analysis agent has completed analyzing the feedback data. Please review the output in the workspace and confirm if you'd like to accept it and add it to the workflow assets.",
                    timestamp: "2024-03-15T10:00:00Z"
                },
                {
                    id: "m_2024_03_15_010",
                    role: "assistant",
                    content: "The theme analysis output has been accepted. The workflow is now ready for Sentiment Analysis. Would you like to proceed?",
                    timestamp: "2024-03-15T10:00:00Z",
                    metadata: {
                        type: "confirmation",
                        actionButtons: [
                            {
                                id: "start_workflow",
                                label: "Start Workflow",
                                type: "primary",
                                action: "start_design",
                                onClick: () => { }
                            },
                            {
                                id: "reject_workflow",
                                label: "Reject",
                                type: "danger",
                                action: "reject_workflow",
                                onClick: () => { }
                            }
                        ]
                    }
                }
            ],
            workflow: {
                id: "w_2024_03_15_001",
                status: "running",
                currentStepIndex: 2,
                steps: [
                    {
                        id: "s_2024_03_15_001",
                        name: "Data Collection",
                        description: "Gather all client feedback from Q1 2024",
                        status: "completed",
                        agentType: "Data Collector",
                        level: 0,
                        tools: ["feedback_collector"],
                        inputs: {},
                        outputs: {},
                        progress: 100,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_002",
                        name: "Theme Analysis",
                        description: "Identify recurring themes and patterns",
                        status: "completed",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["theme_analyzer"],
                        inputs: {
                            dataset: "ds_2024_03_15_001"
                        },
                        outputs: {},
                        progress: 25,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_003",
                        name: "Sentiment Analysis",
                        description: "Evaluate overall sentiment and key concerns",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["sentiment_analyzer"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    },
                    {
                        id: "s_2024_03_15_004",
                        name: "Insight Generation",
                        description: "Generate actionable insights and recommendations",
                        status: "pending",
                        agentType: "Analyst",
                        level: 0,
                        tools: ["insight_generator"],
                        inputs: {},
                        outputs: {},
                        progress: 0,
                        assets: []
                    }
                ],
                assets: [
                    {
                        id: "ds_2024_03_15_001",
                        title: "Q1 2024 Client Feedback Dataset",
                        type: "input",
                        format: "email-list",
                        content: {},
                        metadata: {
                            creator: "Data Collector",
                            createdAt: "2024-03-15T10:00:00Z",
                            updatedAt: "2024-03-15T10:00:00Z",
                            tags: ["raw-data", "client-feedback", "Q1-2024"],
                            stepId: "s_2024_03_15_001",
                            toolId: "feedback_collector"
                        },
                        version: 1,
                        history: []
                    }
                ]
            },
            workspace: {
                id: "ws_2024_03_15_001",
                objectType: "none",
                object: null,
                actionButtons: []
            },
            assets: [
                {
                    id: "ds_2024_03_15_001",
                    title: "Q1 2024 Client Feedback Dataset",
                    type: "input",
                    format: "email-list",
                    content: {},
                    metadata: {
                        creator: "Data Collector",
                        createdAt: "2024-03-15T10:00:00Z",
                        updatedAt: "2024-03-15T10:00:00Z",
                        tags: ["raw-data", "client-feedback", "Q1-2024"],
                        stepId: "s_2024_03_15_001",
                        toolId: "feedback_collector"
                    },
                    version: 1,
                    history: []
                },
                {
                    id: "ds_2024_03_15_002",
                    title: "Q1 2024 Client Feedback Themes",
                    type: "output",
                    format: "json",
                    content: {},
                    metadata: {
                        creator: "Theme Analyst",
                        createdAt: "2024-03-15T10:00:00Z",
                        updatedAt: "2024-03-15T10:00:00Z",
                        tags: ["theme-analysis", "client-feedback", "Q1-2024"],
                        stepId: "s_2024_03_15_002",
                        toolId: "theme_analyzer"
                    },
                    version: 1,
                    history: []
                }
            ],
            agents: [
                {
                    id: "agent_003",
                    name: "Sentiment Analyst",
                    description: "Analyzes feedback for sentiment",
                    capabilities: ["sentiment_analysis", "emotion_detection"],
                    tools: ["sentiment_analyzer"],
                    configuration: {},
                    inputs: {},
                    outputs: {},
                    status: "active"
                }

            ]
        }
    }
]; 