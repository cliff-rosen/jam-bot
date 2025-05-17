import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Asset, ChatMessage, Mission as MissionType, Workflow as WorkflowType, Workspace as WorkspaceType, WorkspaceState, ItemView as ItemViewType, MissionProposal, DataFromLine, StageGeneratorResult, Step, WorkflowVariable } from '@/components/fractal-bot/types/index';
import { Tool, ToolType } from '@/components/fractal-bot/types/tools';
import { availableTools } from '@/components/fractal-bot/types/tools';
import { assetsTemplate, missionExample, workflowExample, workflowTemplate, workspaceStateTemplate, workspaceTemplate } from '@/components/fractal-bot/types/type-defaults';
import { botApi } from '@/lib/api/botApi';
import { Message, MessageRole } from '@/types/message';
import { createMissionFromProposal, getDataFromLine } from '@/components/fractal-bot/utils/utils';

// Define the state interface
interface FractalBotState {
    currentMission: MissionType;
    currentMissionProposal: MissionProposal | undefined;
    currentWorkspaceState: WorkspaceState;
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    currentWorkflow: WorkflowType;
    currentWorkspace: WorkspaceType;
    currentTools: Tool[];
    currentAssets: Asset[];
    selectedToolIds: string[];
    currentItemView: ItemViewType;
    activeView: 'workspace' | 'history';
    statusHistory: string[];
    selectedStepId: string | null;
    currentStageIdx: number | null;
}

// Define action types
type FractalBotAction =
    | { type: 'SET_MISSION'; payload: MissionType }
    | { type: 'SET_MISSION_PROPOSAL'; payload: MissionProposal | undefined }
    | { type: 'SET_WORKSPACE_STATE'; payload: WorkspaceState }
    | { type: 'SET_MESSAGES'; payload: ChatMessage[] | ((prevState: FractalBotState) => ChatMessage[]) }
    | { type: 'SET_STREAMING_MESSAGE'; payload: string }
    | { type: 'SET_WORKFLOW'; payload: WorkflowType }
    | { type: 'SET_WORKSPACE'; payload: WorkspaceType }
    | { type: 'SET_TOOLS'; payload: Tool[] }
    | { type: 'SET_ASSETS'; payload: Asset[] }
    | { type: 'SET_SELECTED_TOOL_IDS'; payload: string[] }
    | { type: 'SET_ITEM_VIEW'; payload: ItemViewType }
    | { type: 'SET_ACTIVE_VIEW'; payload: 'workspace' | 'history' }
    | { type: 'SET_STATUS_HISTORY'; payload: string[] | ((prevState: FractalBotState) => string[]) }
    | { type: 'SET_SELECTED_STEP'; payload: string | null }
    | { type: 'SET_CURRENT_STAGE'; payload: number | null }
    | { type: 'RESET_STATE' }
    | { type: 'ADD_STEP'; payload: { stageId: string; step: Step } }
    | { type: 'ADD_SUBSTEP'; payload: { stageId: string; parentStepId: string; step: Step } }
    | { type: 'DELETE_STEP'; payload: { stageId: string; stepId: string } }
    | { type: 'UPDATE_STEP_TYPE'; payload: { stageId: string; stepId: string; type: 'atomic' | 'composite' } }
    | { type: 'UPDATE_STEP_TOOL'; payload: { stageId: string; stepId: string; tool: Tool } }
    | { type: 'UPDATE_STEP_INPUT'; payload: { stageId: string; stepId: string; input: WorkflowVariable } }
    | { type: 'UPDATE_STEP_OUTPUT'; payload: { stageId: string; stepId: string; output: WorkflowVariable } }
    | { type: 'UPDATE_WORKFLOW'; payload: WorkflowType }
    | { type: 'UPDATE_STEP'; payload: { stageId: string; step: Step } };

// Initial state
const initialState: FractalBotState = {
    currentMission: missionExample,
    currentMissionProposal: undefined,
    currentWorkspaceState: workspaceStateTemplate,
    currentMessages: [],
    currentStreamingMessage: '',
    currentWorkflow: workflowExample,
    currentWorkspace: workspaceTemplate,
    currentTools: availableTools,
    currentAssets: assetsTemplate,
    selectedToolIds: availableTools.map(tool => tool.id), // Initialize with all tool IDs
    currentItemView: {
        title: '',
        type: 'none',
        isOpen: false
    },
    activeView: 'history',
    statusHistory: [],
    selectedStepId: null,
    currentStageIdx: null
};

// Create context
const FractalBotContext = createContext<{
    state: FractalBotState;
    // State update functions
    setMission: (mission: MissionType) => void;
    setMissionProposal: (proposal: MissionProposal | undefined) => void;
    setWorkspaceState: (state: WorkspaceState) => void;
    addMessage: (message: ChatMessage) => void;
    setStreamingMessage: (message: string) => void;
    setWorkflow: (workflow: WorkflowType) => void;
    setWorkspace: (workspace: WorkspaceType) => void;
    setTools: (tools: Tool[]) => void;
    setAssets: (assets: Asset[]) => void;
    setSelectedToolIds: (ids: string[]) => void;
    setItemView: (view: ItemViewType) => void;
    setActiveView: (view: 'workspace' | 'history') => void;
    addStatusRecord: (status: string) => void;
    // Business logic functions
    sendMessage: (message: ChatMessage) => Promise<void>;
    generateWorkflow: () => Promise<void>;
    setWorkspaceWithWorkflow: (workflow: any) => void;
    resetState: () => void;
    // Common operations
    toggleToolSelection: (toolId: string) => void;
    selectAllTools: () => void;
    clearAllTools: () => void;
    openToolsManager: () => void;
    closeItemView: () => void;
    // Step management functions
    addStep: (stageId: string, step: Step) => void;
    addSubstep: (stageId: string, parentStepId: string, step: Step) => void;
    deleteStep: (stageId: string, stepId: string) => void;
    updateStepType: (stageId: string, stepId: string, type: 'atomic' | 'composite') => void;
    updateStepTool: (stageId: string, stepId: string, tool: Tool) => void;
    updateStepInput: (stageId: string, stepId: string, input: WorkflowVariable) => void;
    updateStepOutput: (stageId: string, stepId: string, output: WorkflowVariable) => void;
    setCurrentStage: (stageIdx: number | null) => void;
    setSelectedStep: (stepId: string | null) => void;
    updateWorkflow: (workflow: WorkflowType) => void;
    updateStep: (stageId: string, step: Step) => void;

} | undefined>(undefined);

// Reducer function
function fractalBotReducer(state: FractalBotState, action: FractalBotAction): FractalBotState {
    switch (action.type) {
        case 'SET_MISSION':
            return { ...state, currentMission: action.payload };
        case 'SET_MISSION_PROPOSAL':
            return { ...state, currentMissionProposal: action.payload };
        case 'SET_WORKSPACE_STATE':
            return { ...state, currentWorkspaceState: action.payload };
        case 'SET_MESSAGES':
            return {
                ...state,
                currentMessages: typeof action.payload === 'function'
                    ? action.payload(state)
                    : action.payload
            };
        case 'SET_STREAMING_MESSAGE':
            return { ...state, currentStreamingMessage: action.payload };
        case 'SET_WORKFLOW':
            return { ...state, currentWorkflow: action.payload };
        case 'SET_WORKSPACE':
            return { ...state, currentWorkspace: action.payload };
        case 'SET_TOOLS':
            return { ...state, currentTools: action.payload };
        case 'SET_ASSETS':
            return { ...state, currentAssets: action.payload };
        case 'SET_SELECTED_TOOL_IDS':
            return { ...state, selectedToolIds: action.payload };
        case 'SET_ITEM_VIEW':
            return { ...state, currentItemView: action.payload };
        case 'SET_ACTIVE_VIEW':
            return { ...state, activeView: action.payload };
        case 'SET_STATUS_HISTORY':
            return {
                ...state,
                statusHistory: typeof action.payload === 'function'
                    ? action.payload(state)
                    : action.payload
            };
        case 'SET_SELECTED_STEP':
            return { ...state, selectedStepId: action.payload };
        case 'SET_CURRENT_STAGE':
            return {
                ...state,
                currentStageIdx: action.payload
            };
        case 'RESET_STATE':
            return initialState;
        case 'ADD_STEP': {
            const { stageId, step } = action.payload;
            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? { ...stage, steps: [...(stage.steps || []), step] }
                            : stage
                    )
                }
            };
        }
        case 'ADD_SUBSTEP': {
            console.log('ADD_SUBSTEP', action.payload);
            const { stageId, parentStepId, step } = action.payload;
            const addSubstepToStep = (steps: Step[], targetId: string): Step[] => {
                return steps.map(step => {
                    if (step.id === targetId) {
                        return {
                            ...step,
                            substeps: [...(step.substeps || []), action.payload.step]
                        };
                    }
                    if (step.substeps) {
                        return {
                            ...step,
                            substeps: addSubstepToStep(step.substeps, targetId)
                        };
                    }
                    return step;
                });
            };

            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? {
                                ...stage,
                                steps: addSubstepToStep(stage.steps, parentStepId)
                            }
                            : stage
                    )
                }
            };
        }
        case 'DELETE_STEP': {
            const { stageId, stepId } = action.payload;
            const deleteSubstepFromStepTree = (parentStep: Step): Step => {
                if (!parentStep.substeps?.length) return parentStep;

                const initialChildSteps = parentStep.substeps;
                const newChildSteps = initialChildSteps.filter(step => step.id !== stepId);

                if (newChildSteps.length < initialChildSteps.length) {
                    return {
                        ...parentStep,
                        substeps: newChildSteps
                    };
                }

                return {
                    ...parentStep,
                    substeps: initialChildSteps.map(step => deleteSubstepFromStepTree(step))
                };
            };

            const updatedSteps = state.currentWorkflow.stages
                .find(stage => stage.id === stageId)
                ?.steps.filter(step => step.id !== stepId)
                .map(step => deleteSubstepFromStepTree(step)) || [];

            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? { ...stage, steps: updatedSteps }
                            : stage
                    )
                }
            };
        }
        case 'UPDATE_STEP_TYPE': {
            const { stageId, stepId, type } = action.payload;
            const getTreeWithUpdatedSubstepType = (step: Step): Step => {
                if (step.id === stepId) {
                    return {
                        ...step,
                        type,
                        tool: type === 'composite' ? undefined : step.tool
                    };
                }
                if (!step.substeps?.length) return step;
                return {
                    ...step,
                    substeps: step.substeps.map(substep => getTreeWithUpdatedSubstepType(substep))
                };
            };

            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? {
                                ...stage,
                                steps: stage.steps.map(step => getTreeWithUpdatedSubstepType(step))
                            }
                            : stage
                    )
                }
            };
        }
        case 'UPDATE_STEP_TOOL': {
            const { stageId, stepId, tool } = action.payload;
            const getTreeWithUpdatedTool = (step: Step): Step => {
                if (step.id === stepId) {
                    return {
                        ...step,
                        tool
                    };
                }
                if (!step.substeps?.length) return step;
                return {
                    ...step,
                    substeps: step.substeps.map(substep => getTreeWithUpdatedTool(substep))
                };
            };

            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? {
                                ...stage,
                                steps: stage.steps.map(step => getTreeWithUpdatedTool(step))
                            }
                            : stage
                    )
                }
            };
        }
        case 'UPDATE_STEP_INPUT': {
            const { stageId, stepId, input } = action.payload;
            const getTreeWithUpdatedInput = (step: Step): Step => {
                if (step.id === stepId) {
                    return {
                        ...step,
                        inputs: [input]
                    };
                }
                if (!step.substeps?.length) return step;
                return {
                    ...step,
                    substeps: step.substeps.map(substep => getTreeWithUpdatedInput(substep))
                };
            };

            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? {
                                ...stage,
                                steps: stage.steps.map(step => getTreeWithUpdatedInput(step))
                            }
                            : stage
                    )
                }
            };
        }
        case 'UPDATE_STEP_OUTPUT': {
            const { stageId, stepId, output } = action.payload;
            const getTreeWithUpdatedOutput = (step: Step): Step => {
                if (step.id === stepId) {
                    return {
                        ...step,
                        outputs: [output]
                    };
                }
                if (!step.substeps?.length) return step;
                return {
                    ...step,
                    substeps: step.substeps.map(substep => getTreeWithUpdatedOutput(substep))
                };
            };

            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? {
                                ...stage,
                                steps: stage.steps.map(step => getTreeWithUpdatedOutput(step))
                            }
                            : stage
                    )
                }
            };
        }
        case 'UPDATE_WORKFLOW':
            return { ...state, currentWorkflow: action.payload };
        case 'UPDATE_STEP': {
            const { stageId, step } = action.payload;
            const updateStepInTree = (steps: Step[]): Step[] => {
                return steps.map(s => {
                    if (s.id === step.id) {
                        return step;
                    }
                    if (s.substeps) {
                        return {
                            ...s,
                            substeps: updateStepInTree(s.substeps)
                        };
                    }
                    return s;
                });
            };

            return {
                ...state,
                currentWorkflow: {
                    ...state.currentWorkflow,
                    stages: state.currentWorkflow.stages.map(stage =>
                        stage.id === stageId
                            ? {
                                ...stage,
                                steps: updateStepInTree(stage.steps)
                            }
                            : stage
                    )
                }
            };
        }
        default:
            return state;
    }
}

// Provider component
export function FractalBotProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(fractalBotReducer, initialState);

    // State update functions
    const setMission = useCallback((mission: MissionType) => {
        dispatch({ type: 'SET_MISSION', payload: mission });
    }, []);

    const setMissionProposal = useCallback((proposal: MissionProposal | undefined) => {
        dispatch({ type: 'SET_MISSION_PROPOSAL', payload: proposal });
    }, []);

    const setWorkspaceState = useCallback((workspaceState: WorkspaceState) => {
        dispatch({ type: 'SET_WORKSPACE_STATE', payload: workspaceState });
    }, []);

    const addMessage = useCallback((message: ChatMessage) => {
        dispatch({
            type: 'SET_MESSAGES',
            payload: (prevState: FractalBotState) => [...prevState.currentMessages, message]
        });
    }, []);

    const setStreamingMessage = useCallback((message: string) => {
        dispatch({ type: 'SET_STREAMING_MESSAGE', payload: message });
    }, []);

    const setWorkflow = useCallback((workflow: WorkflowType) => {
        dispatch({ type: 'SET_WORKFLOW', payload: workflow });
    }, []);

    const setWorkspace = useCallback((workspace: WorkspaceType) => {
        dispatch({ type: 'SET_WORKSPACE', payload: workspace });
    }, []);

    const setTools = useCallback((tools: Tool[]) => {
        dispatch({ type: 'SET_TOOLS', payload: tools });
    }, []);

    const setAssets = useCallback((assets: Asset[]) => {
        dispatch({ type: 'SET_ASSETS', payload: assets });
    }, []);

    const setSelectedToolIds = useCallback((ids: string[]) => {
        dispatch({ type: 'SET_SELECTED_TOOL_IDS', payload: ids });
    }, []);

    const setItemView = useCallback((view: ItemViewType) => {
        dispatch({ type: 'SET_ITEM_VIEW', payload: view });
    }, []);

    const setActiveView = useCallback((view: 'workspace' | 'history') => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
    }, []);

    const addStatusRecord = useCallback((status: string) => {
        console.log(status);
        // Add to status history
        dispatch({
            type: 'SET_STATUS_HISTORY',
            payload: (prevState: FractalBotState) => [...prevState.statusHistory, status]
        });

        // Add to chat history as a system message
        const statusMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'system',
            content: status,
            timestamp: new Date().toISOString(),
            metadata: {
                type: 'status'
            }
        };
        dispatch({
            type: 'SET_MESSAGES',
            payload: (prevState: FractalBotState) => [...prevState.currentMessages, statusMessage]
        });
    }, []);

    // Common operations
    const toggleToolSelection = useCallback((toolId: string) => {
        setSelectedToolIds(
            state.selectedToolIds.includes(toolId)
                ? state.selectedToolIds.filter(id => id !== toolId)
                : [...state.selectedToolIds, toolId]
        );
    }, [state.selectedToolIds, setSelectedToolIds]);

    const selectAllTools = useCallback(() => {
        setSelectedToolIds(state.currentTools.map(tool => tool.id));
    }, [state.currentTools, setSelectedToolIds]);

    const clearAllTools = useCallback(() => {
        setSelectedToolIds([]);
    }, [setSelectedToolIds]);

    const openToolsManager = useCallback(() => {
        setItemView({
            title: 'Tools Manager',
            type: 'tools',
            isOpen: true
        });
    }, [setItemView]);

    const closeItemView = useCallback(() => {
        setItemView({
            ...state.currentItemView,
            isOpen: false
        });
    }, [state.currentItemView, setItemView]);

    // Business logic functions
    const processBotMessage = useCallback((data: DataFromLine) => {
        if (data.token) {
            const newMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.token,
                timestamp: new Date().toISOString()
            };
            addMessage(newMessage);
        }

        if (data.status) {
            const newStatusMessage = data.status;
            const currentContent = state.currentWorkspace.content;
            const newContent = { ...currentContent, text: newStatusMessage };

            setWorkspace({
                ...state.currentWorkspace,
                status: "current",
                content: newContent
            });

            let message = "";
            let error = "";
            if (data.message) {
                message = data.message;
            }
            if (data.error) {
                error = data.error;
            }
            const messageToAdd = newStatusMessage + " " + message + " " + error;

            addStatusRecord(messageToAdd);
        }

        if (data.mission_proposal) {
            const new_mission = createMissionFromProposal(data.mission_proposal);
            setMission(new_mission);
            setMissionProposal(data.mission_proposal);
        }

        return data.token || "";
    }, [state, setWorkspace, addStatusRecord, setMission, setMissionProposal, addMessage]);

    const sendMessage = useCallback(async (message: ChatMessage) => {
        addMessage(message);

        let finalContent = '';

        try {
            // Convert ChatMessage[] to Message[]
            const messages: Message[] = state.currentMessages.map(msg => ({
                message_id: msg.id,
                role: msg.role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT,
                content: msg.content,
                timestamp: new Date(msg.timestamp)
            }));

            // Get the full tool objects for selected tool IDs
            const selectedToolObjects = state.currentTools.filter(tool => state.selectedToolIds.includes(tool.id));

            for await (const update of botApi.streamMessage(message.content, messages, state.currentMission, selectedToolObjects)) {
                const lines = update.data.split('\n');
                for (const line of lines) {
                    const data = getDataFromLine(line);
                    finalContent += processBotMessage(data);
                }
            }

            if (finalContent.length === 0) {
                finalContent = "No direct response from the bot. Check item view for more information.";
            }

            // Update the final message with the complete content
            const finalMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: finalContent,
                timestamp: new Date().toISOString()
            };

            // addMessage(finalMessage);
            // update the current messages with the final message

            setWorkspace({
                ...state.currentWorkspace,
                status: 'completed'
            });

        } catch (error) {
            console.error('Error streaming message:', error);
        } finally {
            setStreamingMessage('');
        }
    }, [state, processBotMessage, setWorkspace, setStreamingMessage, addMessage]);

    const setWorkspaceWithWorkflow = useCallback((workflow: any) => {
        const now = new Date().toISOString();

        setWorkspace({
            ...state.currentWorkspace,
            type: 'proposedWorkflowDesign',
            title: 'Proposed Workflow',
            status: 'current',
            content: {
                ...state.currentWorkspace.content,
                workflow: {
                    ...workflowTemplate,
                    name: 'Proposed Workflow',
                    description: workflow.explanation,
                    stages: workflow.stages.map((stage: any, index: number) => ({
                        id: `stage-${index}`,
                        name: stage.name,
                        description: stage.description,
                        status: 'pending',
                        steps: [],
                        assets: [],
                        inputs: stage.inputs || [],
                        outputs: stage.outputs || [],
                        success_criteria: stage.success_criteria || [],
                        createdAt: now,
                        updatedAt: now
                    })),
                    createdAt: now,
                    updatedAt: now
                }
            }
        });

        setActiveView('workspace');
    }, [state.currentWorkspace, setWorkspace, setActiveView]);

    const createWorkflowFromStageGenerator = useCallback((stageGenerator: StageGeneratorResult) => {
        const now = new Date().toISOString();

        return {
            ...workflowTemplate,
            name: 'Proposed Workflow',
            description: stageGenerator.explanation,
            status: 'ready',
            stages: stageGenerator.stages.map((stage: any, index: number) => ({
                ...stage,
                createdAt: now,
                updatedAt: now
            })),
        }
    }, []);

    const generateWorkflow = useCallback(async () => {
        try {
            // Stream the workflow generation
            for await (const update of botApi.streamWorkflow(
                state.currentMission,
                state.currentTools.filter(tool => state.selectedToolIds.includes(tool.id))
            )) {
                const lines = update.data.split('\n');
                for (const line of lines) {
                    const data = getDataFromLine(line);

                    // Handle status updates
                    if (data.status) {
                        addStatusRecord(data.status);
                    }

                    // Handle the final workflow
                    if (data.stage_generator) {
                        const now = new Date().toISOString();
                        const workflow = {
                            ...workflowTemplate,
                            name: 'Proposed Workflow',
                            description: data.stage_generator.explanation,
                            stages: data.stage_generator.stages.map((stage: any, index: number) => {
                                // Create input variables
                                const inputVariables = (stage.inputs || []).map((input: any) => ({
                                    variable_id: `stage-${index}-input-${input.name}`,
                                    name: input.name,
                                    schema: input.schema || {
                                        type: 'string',
                                        is_array: false,
                                        description: `Input for ${stage.name}`
                                    },
                                    io_type: 'input',
                                    required: true,
                                    status: 'pending',
                                    createdBy: `stage-${index}`
                                }));

                                // Create output variables
                                const outputVariables = (stage.outputs || []).map((output: any) => ({
                                    variable_id: `stage-${index}-output-${output.name}`,
                                    name: output.name,
                                    schema: output.schema || {
                                        type: 'string',
                                        is_array: false,
                                        description: `Output from ${stage.name}`
                                    },
                                    io_type: 'output',
                                    status: 'pending',
                                    createdBy: `stage-${index}`
                                }));

                                return {
                                    id: `stage-${index}`,
                                    name: stage.name,
                                    description: stage.description,
                                    status: 'pending',
                                    steps: [],
                                    childVariables: [...inputVariables, ...outputVariables],
                                    inputMappings: inputVariables.map(input => ({
                                        sourceVariableId: input.variable_id,
                                        target: {
                                            type: 'variable',
                                            variableId: input.variable_id
                                        }
                                    })),
                                    outputMappings: outputVariables.map(output => ({
                                        sourceVariableId: output.variable_id,
                                        target: {
                                            type: 'variable',
                                            variableId: output.variable_id
                                        }
                                    })),
                                    success_criteria: stage.success_criteria || [],
                                    createdAt: now,
                                    updatedAt: now
                                };
                            }),
                            createdAt: now,
                            updatedAt: now
                        };
                        setWorkflow(workflow);
                    }

                    // Handle the token
                    if (data.token) {
                        const newMessage: ChatMessage = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: data.token,
                            timestamp: new Date().toISOString()
                        };
                        addMessage(newMessage);
                    }
                }
            }
        } catch (error) {
            console.error('Error generating workflow:', error);
            addStatusRecord(`Error: ${error}`);
        }
    }, [state, addStatusRecord, setWorkspaceWithWorkflow, addMessage]);

    const resetState = useCallback(() => {
        dispatch({ type: 'RESET_STATE' });
    }, []);

    // Step management functions
    const addStep = useCallback((stageId: string, step: Step) => {
        dispatch({ type: 'ADD_STEP', payload: { stageId, step } });
    }, []);

    const addSubstep = useCallback((stageId: string, parentStepId: string, step: Step) => {
        dispatch({ type: 'ADD_SUBSTEP', payload: { stageId, parentStepId, step } });
    }, []);

    const deleteStep = useCallback((stageId: string, stepId: string) => {
        dispatch({ type: 'DELETE_STEP', payload: { stageId, stepId } });
    }, []);

    const updateStepType = useCallback((stageId: string, stepId: string, type: 'atomic' | 'composite') => {
        dispatch({ type: 'UPDATE_STEP_TYPE', payload: { stageId, stepId, type } });
    }, []);

    const updateStepTool = useCallback((stageId: string, stepId: string, tool: Tool) => {
        dispatch({ type: 'UPDATE_STEP_TOOL', payload: { stageId, stepId, tool } });
    }, []);

    const updateStepInput = useCallback((stageId: string, stepId: string, input: WorkflowVariable) => {
        dispatch({ type: 'UPDATE_STEP_INPUT', payload: { stageId, stepId, input } });
    }, []);

    const updateStepOutput = useCallback((stageId: string, stepId: string, output: WorkflowVariable) => {
        dispatch({ type: 'UPDATE_STEP_OUTPUT', payload: { stageId, stepId, output } });
    }, []);

    const setSelectedStep = useCallback((stepId: string | null) => {
        dispatch({ type: 'SET_SELECTED_STEP', payload: stepId });
    }, []);

    const updateWorkflow = useCallback((workflow: WorkflowType) => {
        dispatch({ type: 'UPDATE_WORKFLOW', payload: workflow });
    }, []);

    const updateStep = useCallback((stageId: string, step: Step) => {
        dispatch({ type: 'UPDATE_STEP', payload: { stageId, step } });
    }, []);

    const setCurrentStage = useCallback((stageIdx: number | null) => {
        dispatch({ type: 'SET_CURRENT_STAGE', payload: stageIdx });
    }, []);

    return (
        <FractalBotContext.Provider value={{
            state,
            // State update functions
            setMission,
            setMissionProposal,
            setWorkspaceState,
            addMessage,
            setStreamingMessage,
            setWorkflow,
            setWorkspace,
            setTools,
            setAssets,
            setSelectedToolIds,
            setItemView,
            setActiveView,
            addStatusRecord,
            // Business logic functions
            sendMessage,
            generateWorkflow,
            setWorkspaceWithWorkflow,
            resetState,
            // Common operations
            toggleToolSelection,
            selectAllTools,
            clearAllTools,
            openToolsManager,
            closeItemView,
            // Step management functions
            updateWorkflow,
            setCurrentStage,
            setSelectedStep,
            updateStep,
            addStep,
            addSubstep,
            deleteStep,
            updateStepType,
            updateStepTool,
            updateStepInput,
            updateStepOutput,
        }}>
            {children}
        </FractalBotContext.Provider>
    );
}

// Custom hook for using the context
export function useFractalBot() {
    const context = useContext(FractalBotContext);
    if (context === undefined) {
        throw new Error('useFractalBot must be used within a FractalBotProvider');
    }
    return context;
}
