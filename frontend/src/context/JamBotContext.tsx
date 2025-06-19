import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi, getDataFromLine } from '@/lib/api/chatApi';
import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { Mission, MissionStatus, Hop, ExecutionStatus, HopStatus, defaultMission, ToolStep } from '@/types/workflow';
import { CollabAreaState, ApprovalContent } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';
import { Asset } from '@/types/asset';
import { AssetStatus } from '@/types/asset';
import { toolsApi } from '@/lib/api/toolsApi';
import { AssetFieldMapping, DiscardMapping } from '@/types/workflow';

interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: CollabAreaState;
    mission: Mission | null;
    payload_history: Record<string, any>[];
    error?: string;
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: CollabAreaState }
    | { type: 'CLEAR_COLLAB_AREA' }
    | { type: 'SET_MISSION'; payload: Mission }
    | { type: 'UPDATE_MISSION'; payload: Partial<Mission> }
    | { type: 'ADD_PAYLOAD_HISTORY'; payload: Record<string, any> }
    | { type: 'ACCEPT_MISSION_PROPOSAL' }
    | { type: 'ACCEPT_HOP_PROPOSAL'; payload: { hop: Hop; proposedAssets: any[] } }
    | { type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL'; payload: Hop }
    | { type: 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE'; payload: Hop }
    | { type: 'START_HOP_EXECUTION'; payload: string }
    | { type: 'COMPLETE_HOP_EXECUTION'; payload: string }
    | { type: 'FAIL_HOP_EXECUTION'; payload: { hopId: string; error: string } }
    | { type: 'RETRY_HOP_EXECUTION'; payload: string }
    | { type: 'UPDATE_HOP_STATE'; payload: { hop: Hop; updatedMissionOutputs: Map<string, Asset> } }
    | { type: 'SET_STATE'; payload: JamBotState }
    | { type: 'EXECUTE_TOOL_STEP'; payload: { step: ToolStep; hop: Hop } }
    | { type: 'SET_ERROR'; payload: string }
    | { type: 'CLEAR_ERROR' };

const initialState: JamBotState = {
    currentMessages: [],
    currentStreamingMessage: '',
    collabArea: {
        type: null,
        content: null
    },
    mission: defaultMission,
    payload_history: []
};

// Helper function to sanitize asset values
const sanitizeAsset = (asset: Asset): Asset => {
    return {
        ...asset,
        value: typeof asset.value === 'string'
            ? asset.value.substring(0, 100)
            : JSON.stringify(asset.value).substring(0, 100)
    };
};

// Helper function to sanitize hop state
const sanitizeHopState = (hopState: Record<string, Asset>): Record<string, Asset> => {
    return Object.fromEntries(
        Object.entries(hopState).map(([key, asset]) => [
            key,
            sanitizeAsset(asset)
        ])
    );
};

const jamBotReducer = (state: JamBotState, action: JamBotAction): JamBotState => {
    switch (action.type) {
        case 'SET_STATE':
            return action.payload;
        case 'ADD_MESSAGE':
            return {
                ...state,
                currentMessages: [...state.currentMessages, action.payload],
            };
        case 'UPDATE_STREAMING_MESSAGE':
            return {
                ...state,
                currentStreamingMessage: action.payload,
            };
        case 'SET_COLLAB_AREA':
            return {
                ...state,
                collabArea: action.payload
            };
        case 'SET_MISSION':
            return {
                ...state,
                mission: action.payload
            };
        case 'UPDATE_MISSION':
            if (!state.mission) return state;
            return {
                ...state,
                mission: {
                    ...state.mission,
                    ...action.payload
                }
            };
        case 'ADD_PAYLOAD_HISTORY':
            return {
                ...state,
                payload_history: [...state.payload_history, action.payload]
            };
        case 'ACCEPT_MISSION_PROPOSAL':
            if (!state.mission) return state;
            return {
                ...state,
                mission: {
                    ...state.mission,
                    mission_status: MissionStatus.ACTIVE
                },
                collabArea: {
                    type: null,
                    content: null
                }
            };
        case 'ACCEPT_HOP_PROPOSAL':
            if (!state.mission) return state;
            const { hop: acceptedHop, proposedAssets } = action.payload;

            // Add proposed assets to mission state
            const updatedMissionState = { ...state.mission.mission_state };
            if (proposedAssets && Array.isArray(proposedAssets)) {
                proposedAssets.forEach((assetData: any) => {
                    if (assetData && assetData.id) {
                        updatedMissionState[assetData.id] = assetData;
                    }
                });
            }

            return {
                ...state,
                mission: {
                    ...state.mission,
                    mission_state: updatedMissionState,
                    current_hop: {
                        ...acceptedHop,
                        status: HopStatus.HOP_READY_TO_RESOLVE
                    }
                }
            };
        case 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL':
            if (!state.mission) return state;
            const implementationHop = action.payload;
            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: {
                        ...implementationHop,
                        status: HopStatus.HOP_READY_TO_EXECUTE
                    }
                }
            };
        case 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE':
            if (!state.mission) return state;
            const completedHop = action.payload;
            const isFinalHop = completedHop.is_final;

            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: undefined,
                    hop_history: [
                        ...(state.mission.hop_history || []),
                        {
                            ...completedHop,
                            status: HopStatus.ALL_HOPS_COMPLETE
                        }
                    ],
                    mission_status: isFinalHop ? MissionStatus.COMPLETE : state.mission.mission_status
                }
            };
        case 'START_HOP_EXECUTION':
            if (!state.mission || !state.mission.current_hop) return state;
            const hopIdToStart = action.payload;
            if (state.mission.current_hop.id !== hopIdToStart) return state;

            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: {
                        ...state.mission.current_hop,
                        status: HopStatus.HOP_RUNNING,
                        tool_steps: state.mission.current_hop.tool_steps?.map((step, index) => {
                            if (index === 0) {
                                return { ...step, status: ExecutionStatus.RUNNING };
                            }
                            return step;
                        }) || []
                    }
                }
            };
        case 'COMPLETE_HOP_EXECUTION':
            if (!state.mission || !state.mission.current_hop) return state;
            const hopIdToComplete = action.payload;
            if (state.mission.current_hop.id !== hopIdToComplete) return state;

            const completedHopForExecution = {
                ...state.mission.current_hop,
                status: HopStatus.ALL_HOPS_COMPLETE,
                tool_steps: state.mission.current_hop.tool_steps?.map(step => ({
                    ...step,
                    status: ExecutionStatus.COMPLETED
                })) || []
            };

            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: undefined,
                    hop_history: [
                        ...(state.mission.hop_history || []),
                        completedHopForExecution
                    ]
                }
            };
        case 'FAIL_HOP_EXECUTION':
            if (!state.mission || !state.mission.current_hop) return state;
            const { hopId: failedHopId, error } = action.payload;
            if (state.mission.current_hop.id !== failedHopId) return state;

            const failedHop = {
                ...state.mission.current_hop,
                status: HopStatus.HOP_READY_TO_EXECUTE,
                error,
                tool_steps: state.mission.current_hop.tool_steps?.map(step => ({
                    ...step,
                    status: ExecutionStatus.FAILED
                })) || []
            };

            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: failedHop
                }
            };
        case 'RETRY_HOP_EXECUTION':
            if (!state.mission || !state.mission.current_hop) return state;
            const retryHopId = action.payload;
            if (state.mission.current_hop.id !== retryHopId) return state;

            const retriedHop = {
                ...state.mission.current_hop,
                status: HopStatus.HOP_READY_TO_EXECUTE,
                error: undefined,
                tool_steps: state.mission.current_hop.tool_steps?.map(step => ({
                    ...step,
                    status: ExecutionStatus.PENDING
                })) || []
            };

            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: retriedHop
                }
            };
        case 'CLEAR_COLLAB_AREA':
            return {
                ...state,
                collabArea: {
                    type: null,
                    content: null
                }
            };
        case 'UPDATE_HOP_STATE':
            if (!state.mission) return state;
            const { hop, updatedMissionOutputs } = action.payload;

            // Create updated mission
            const updatedMission = {
                ...state.mission,
                current_hop: hop
            };

            // Check if all hop outputs are ready
            const allHopOutputsReady = Object.entries(hop.output_mapping).every(([hopAssetKey]) => {
                const asset = hop.hop_state[hopAssetKey];
                return asset && asset.status === AssetStatus.READY;
            });

            // If hop is complete, add it to history and clear current hop
            if (allHopOutputsReady) {
                // Sanitize the hop state before adding to history
                const sanitizedHop = {
                    ...hop,
                    hop_state: sanitizeHopState(hop.hop_state),
                    status: HopStatus.ALL_HOPS_COMPLETE,
                    is_resolved: true
                };

                updatedMission.hop_history = [
                    ...(state.mission.hop_history || []),
                    sanitizedHop
                ];
                // Use type assertion to handle current_hop
                (updatedMission as any).current_hop = undefined;

                // Check if all mission outputs are ready
                const allMissionOutputsReady = updatedMission.outputs.every(output => {
                    const updatedOutput = updatedMissionOutputs.get(output.id);
                    return updatedOutput?.status === AssetStatus.READY;
                });

                // Update mission status
                if (allMissionOutputsReady) {
                    updatedMission.mission_status = MissionStatus.COMPLETE;
                }
            }

            // Update any mission outputs that were modified
            if (updatedMissionOutputs.size > 0) {
                // Update mission outputs
                updatedMission.outputs = state.mission.outputs.map(output => {
                    const updatedOutput = updatedMissionOutputs.get(output.id);
                    return updatedOutput || output;
                });

                // Update mission state
                updatedMission.mission_state = {
                    ...state.mission.mission_state,
                    ...Object.fromEntries(updatedMissionOutputs)
                };
            }

            return {
                ...state,
                mission: updatedMission
            };
        case 'EXECUTE_TOOL_STEP': {
            const { step, hop } = action.payload;
            if (!state.mission) return state;

            // Execute the tool step
            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: {
                        ...hop,
                        tool_steps: hop.tool_steps.map(s =>
                            s.id === step.id
                                ? { ...s, status: ExecutionStatus.RUNNING }
                                : s
                        )
                    }
                }
            };
        }
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: undefined
            };
        default:
            return state;
    }
};

interface JamBotContextType {
    state: JamBotState;
    addMessage: (message: ChatMessage) => void;
    updateStreamingMessage: (message: string) => void;
    sendMessage: (message: ChatMessage) => void;
    setCollabArea: (type: CollabAreaState['type'], content: CollabAreaState['content']) => void;
    clearCollabArea: () => void;
    addPayloadHistory: (payload: Record<string, any>) => void;
    acceptMissionProposal: () => void;
    acceptHopProposal: (hop: Hop, proposedAssets?: any[]) => void;
    acceptHopImplementationProposal: (hop: Hop) => void;
    acceptHopImplementationAsComplete: (hop: Hop) => void;
    startHopExecution: (hopId: string) => void;
    completeHopExecution: (hopId: string) => void;
    failHopExecution: (hopId: string, error: string) => void;
    retryHopExecution: (hopId: string) => void;
    updateHopState: (hop: Hop, updatedMissionOutputs: Map<string, Asset>) => void;
    setState: (newState: JamBotState) => void;
    executeToolStep: (step: ToolStep, hop: Hop) => Promise<void>;
    setError: (error: string) => void;
    clearError: () => void;
}

const JamBotContext = createContext<JamBotContextType | null>(null);

export const useJamBot = () => {
    const context = useContext(JamBotContext);
    if (!context) {
        throw new Error('useJamBot must be used within a JamBotProvider');
    }
    return context;
};

export const JamBotProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(jamBotReducer, initialState);

    const setState = useCallback((newState: JamBotState) => {
        dispatch({ type: 'SET_STATE', payload: newState });
    }, []);

    const addMessage = useCallback((message: ChatMessage) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
    }, []);

    const updateStreamingMessage = useCallback((message: string) => {
        dispatch({ type: 'UPDATE_STREAMING_MESSAGE', payload: message });
    }, []);

    const addPayloadHistory = useCallback((payload: Record<string, any>) => {
        dispatch({ type: 'ADD_PAYLOAD_HISTORY', payload });
    }, []);

    const acceptMissionProposal = useCallback(() => {
        dispatch({ type: 'ACCEPT_MISSION_PROPOSAL' });
    }, []);

    const acceptHopProposal = useCallback((hop: Hop, proposedAssets?: any[]) => {
        dispatch({ type: 'ACCEPT_HOP_PROPOSAL', payload: { hop, proposedAssets: proposedAssets || [] } });
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: hop } });
    }, []);

    const acceptHopImplementationProposal = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL', payload: hop });
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: hop } });
    }, []);

    const acceptHopImplementationAsComplete = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE', payload: hop });
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: hop } });
    }, []);

    const startHopExecution = useCallback((hopId: string) => {
        if (hopId) {
            dispatch({ type: 'START_HOP_EXECUTION', payload: hopId });
        }
    }, []);

    const completeHopExecution = useCallback((hopId: string) => {
        if (hopId) {
            dispatch({ type: 'COMPLETE_HOP_EXECUTION', payload: hopId });
        }
    }, []);

    const failHopExecution = useCallback((hopId: string, error: string) => {
        if (hopId) {
            dispatch({ type: 'FAIL_HOP_EXECUTION', payload: { hopId, error } });
        }
    }, []);

    const retryHopExecution = useCallback((hopId: string) => {
        if (hopId) {
            dispatch({ type: 'RETRY_HOP_EXECUTION', payload: hopId });
        }
    }, []);

    const updateHopState = useCallback((hop: Hop, updatedMissionOutputs: Map<string, Asset>) => {
        dispatch({ type: 'UPDATE_HOP_STATE', payload: { hop, updatedMissionOutputs } });
    }, []);

    const setError = useCallback((error: string) => {
        dispatch({ type: 'SET_ERROR', payload: error });
    }, []);

    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    const setCollabArea = useCallback((type: CollabAreaState['type'], content: CollabAreaState['content']) => {
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type, content } });
    }, []);

    const clearCollabArea = useCallback(() => {
        dispatch({ type: 'CLEAR_COLLAB_AREA' });
    }, []);

    const executeToolStep = async (step: ToolStep, hop: Hop) => {
        try {
            // Update step status to running
            dispatch({ type: 'EXECUTE_TOOL_STEP', payload: { step, hop } });

            // Execute the tool
            const result = await toolsApi.executeTool(step.tool_id, step, hop.hop_state);

            if (result.success) {
                // Add success message to chat
                const successMessage: ChatMessage = {
                    id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    role: MessageRole.TOOL,
                    content: `Tool '${step.tool_id}' executed successfully`,
                    timestamp: new Date().toISOString()
                };
                addMessage(successMessage);

                // Create new hop state by applying the result mapping
                const newHopState = { ...hop.hop_state };

                // Apply the result mapping to update hop state
                for (const [outputName, mapping] of Object.entries(step.result_mapping)) {
                    if ((mapping as DiscardMapping).type === "discard") continue;

                    if ((mapping as AssetFieldMapping).type === "asset_field") {
                        const value = result.outputs[outputName];
                        if (value !== undefined) {
                            newHopState[(mapping as AssetFieldMapping).state_asset] = {
                                ...newHopState[(mapping as AssetFieldMapping).state_asset],
                                value: value,
                                status: AssetStatus.READY
                            };
                        }
                    }
                }

                // Update hop with new state
                const updatedHop = {
                    ...hop,
                    hop_state: newHopState,
                    tool_steps: hop.tool_steps.map(s =>
                        s.id === step.id
                            ? { ...s, status: ExecutionStatus.COMPLETED }
                            : s
                    )
                };

                // Check if any updated assets are mapped to mission outputs
                const updatedMissionOutputs = new Map<string, Asset>();
                for (const [hopAssetKey, asset] of Object.entries(newHopState)) {
                    const missionOutputId = hop.output_mapping[hopAssetKey];
                    if (missionOutputId) {
                        // Create a complete copy of the asset with the mission asset ID
                        const missionAsset: Asset = {
                            ...asset,
                            id: missionOutputId,
                            status: AssetStatus.READY,
                            value: asset.value,
                            name: asset.name,
                            description: asset.description,
                            schema_definition: asset.schema_definition,
                            subtype: asset.subtype,
                            is_collection: asset.is_collection,
                            collection_type: asset.collection_type,
                            role: asset.role,
                            asset_metadata: {
                                ...asset.asset_metadata,
                                updatedAt: new Date().toISOString()
                            }
                        };
                        updatedMissionOutputs.set(missionOutputId, missionAsset);
                    }
                }

                // Check if all hop outputs are ready
                const allOutputsReady = Object.entries(hop.output_mapping).every(([hopAssetKey]) => {
                    const asset = newHopState[hopAssetKey];
                    return asset && asset.status === AssetStatus.READY;
                });

                if (allOutputsReady) {
                    // Mark hop as complete
                    updatedHop.status = HopStatus.ALL_HOPS_COMPLETE;
                    updatedHop.is_resolved = true;
                }

                // Update the hop state
                dispatch({ type: 'UPDATE_HOP_STATE', payload: { hop: updatedHop, updatedMissionOutputs } });
            } else {
                // Update step status to failed
                const updatedHop = {
                    ...hop,
                    tool_steps: hop.tool_steps.map(s =>
                        s.id === step.id
                            ? { ...s, status: ExecutionStatus.FAILED, error: result.errors.join('\n') }
                            : s
                    )
                };
                dispatch({ type: 'UPDATE_HOP_STATE', payload: { hop: updatedHop, updatedMissionOutputs: new Map() } });
            }
        } catch (error) {
            // Update step status to failed
            const updatedHop = {
                ...hop,
                tool_steps: hop.tool_steps.map(s =>
                    s.id === step.id
                        ? { ...s, status: ExecutionStatus.FAILED, error: error instanceof Error ? error.message : 'Failed to execute tool step' }
                        : s
                )
            };
            dispatch({ type: 'UPDATE_HOP_STATE', payload: { hop: updatedHop, updatedMissionOutputs: new Map() } });
        }
    };

    const processBotMessage = useCallback((data: AgentResponse) => {
        console.log("data", data);

        let token: string = "";
        let newCollabAreaContent: any;
        let lastMessageId: string | null = null;

        if (data.token) {
            token = data.token;
        }

        if (data.status) {
            const statusMessage: ChatMessage = {
                id: `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                role: MessageRole.STATUS,
                content: data.status,
                timestamp: new Date().toISOString()
            };
            addMessage(statusMessage);
            lastMessageId = statusMessage.id;

            if (data.payload) {
                addPayloadHistory({ [lastMessageId]: data.payload });
            }
        }

        if (data.response_text) {
            const chatMessage: ChatMessage = {
                id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                role: MessageRole.ASSISTANT,
                content: data.response_text,
                timestamp: new Date().toISOString()
            };
            addMessage(chatMessage);
            lastMessageId = chatMessage.id;
        }

        if (data.payload) {
            let isMissionProposal = data.status === 'mission_specialist_completed' &&
                typeof data.payload === 'object' && data.payload !== null && 'mission' in data.payload;

            if (isMissionProposal) {
                if (data.payload?.mission?.name?.includes('New Mission')) {
                    isMissionProposal = false;
                }
            }

            let isHopProposal = false;
            let isHopImplementationProposal = false;
            let hopPayload: Partial<Hop> | null = null;
            if (typeof data.payload === 'object' && data.payload !== null && 'hop' in data.payload && data.payload.hop) {
                hopPayload = data.payload.hop as Partial<Hop>;
            }
            if ((data.status === 'hop_designer_completed') && hopPayload) {
                if (hopPayload.is_resolved === true) {
                    isHopImplementationProposal = true;
                } else {
                    isHopProposal = true;
                }
            } else if (data.status === 'hop_implementer_completed' && hopPayload) {
                if (hopPayload.is_resolved === true) {
                    isHopImplementationProposal = true;
                }
            }

            newCollabAreaContent = data.payload;
            if (typeof data.payload === 'object' && data.payload !== null && 'mission' in data.payload) {
                const payload = data.payload as { mission?: any };
                if (payload.mission) {
                    dispatch({ type: 'SET_MISSION', payload: payload.mission });
                }
            }

            if (isMissionProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'mission-proposal', content: newCollabAreaContent } });
            } else if (isHopImplementationProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop-implementation-proposal', content: newCollabAreaContent } });
            } else if (isHopProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop-proposal', content: newCollabAreaContent } });
            }

            if (lastMessageId) {
                addPayloadHistory({ [lastMessageId]: newCollabAreaContent });
            }

            return token;
        }
    }, [addMessage, updateStreamingMessage, addPayloadHistory, state.collabArea.type]);

    const sendMessage = useCallback(async (message: ChatMessage) => {
        addMessage(message);
        let finalContent = '';
        let streamingContent = '';

        try {
            const filteredMessages = state.currentMessages.filter(msg => msg.role !== MessageRole.STATUS);

            // Create a sanitized mission payload with truncated asset values for backend
            const sanitizedMission = state.mission ? {
                ...state.mission,
                mission_state: Object.fromEntries(
                    Object.entries(state.mission.mission_state).map(([key, asset]) => [
                        key,
                        {
                            ...asset,
                            value: typeof asset.value === 'string'
                                ? asset.value.substring(0, 100)
                                : JSON.stringify(asset.value).substring(0, 100)
                        }
                    ])
                ),
                current_hop: state.mission.current_hop ? {
                    ...state.mission.current_hop,
                    hop_state: Object.fromEntries(
                        Object.entries(state.mission.current_hop.hop_state).map(([key, asset]) => [
                            key,
                            {
                                ...asset,
                                value: typeof asset.value === 'string'
                                    ? asset.value.substring(0, 100)
                                    : JSON.stringify(asset.value).substring(0, 100)
                            }
                        ])
                    )
                } : undefined,
                hop_history: state.mission.hop_history.map(hop => ({
                    ...hop,
                    hop_state: Object.fromEntries(
                        Object.entries(hop.hop_state).map(([key, asset]) => [
                            key,
                            {
                                ...asset,
                                value: typeof asset.value === 'string'
                                    ? asset.value.substring(0, 100)
                                    : JSON.stringify(asset.value).substring(0, 100)
                            }
                        ])
                    )
                }))
            } : defaultMission;

            const chatRequest: ChatRequest = {
                messages: [...filteredMessages, message],
                payload: {
                    mission: sanitizedMission,
                }
            };

            for await (const update of chatApi.streamMessage(chatRequest)) {
                const lines = update.data.split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const data = getDataFromLine(line);
                    const token = processBotMessage(data);
                    if (token) {
                        streamingContent += token;
                        updateStreamingMessage(streamingContent);
                        finalContent += token;
                    }
                }
            }

            if (finalContent.length === 0) {
                finalContent = "No direct response from the bot. Check item view for more information.";
            }

        } catch (error) {
            console.error('Error streaming message:', error);
        } finally {
            updateStreamingMessage('');
        }
    }, [state, addMessage, processBotMessage, updateStreamingMessage]);


    return (
        <JamBotContext.Provider value={{
            state,
            addMessage,
            updateStreamingMessage,
            sendMessage,
            setCollabArea,
            clearCollabArea,
            addPayloadHistory,
            acceptMissionProposal,
            acceptHopProposal,
            acceptHopImplementationProposal,
            acceptHopImplementationAsComplete,
            startHopExecution,
            completeHopExecution,
            failHopExecution,
            retryHopExecution,
            updateHopState,
            setState,
            executeToolStep,
            setError,
            clearError
        }}>
            {children}
        </JamBotContext.Provider>
    );
};
