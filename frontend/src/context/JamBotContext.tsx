import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';

import { chatApi } from '@/lib/api/chatApi';
import { toolsApi, assetApi, missionApi, sessionApi, hopApi } from '@/lib/api';
import { useAuth } from './AuthContext';

import { ChatMessage, AgentResponse, ChatRequest, MessageRole, StreamResponse } from '@/types/chat';
import { Mission, MissionStatus, Hop, HopStatus, ToolStep, ToolExecutionStatus } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { Asset } from '@/types/asset';
import { AssetStatus } from '@/types/asset';
import { AssetFieldMapping, DiscardMapping } from '@/types/workflow';
import { AssetRole } from '@/types/asset';

interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: CollabAreaState;
    mission: Mission | null;
    error?: string;
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: CollabAreaState }
    | { type: 'CLEAR_COLLAB_AREA' }
    | { type: 'SET_MISSION'; payload: Mission }
    | { type: 'UPDATE_MISSION'; payload: Partial<Mission> }
    | { type: 'ACCEPT_MISSION_PROPOSAL'; payload?: Mission }
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
    mission: null
};

// Helper function to sanitize asset values
const sanitizeAsset = (asset: Asset): Asset => {
    return {
        ...asset,
        value_representation: typeof asset.value_representation === 'string'
            ? asset.value_representation.substring(0, 100)
            : JSON.stringify(asset.value_representation).substring(0, 100)
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

// Helper function to create asset on backend
const createAssetOnBackend = async (asset: Asset): Promise<void> => {
    try {
        await assetApi.createAsset({
            name: asset.name,
            description: asset.description,
            type: asset.schema_definition.type,
            subtype: asset.subtype,
            role: asset.role,
            content: asset.value_representation,
            asset_metadata: asset.asset_metadata
        });
        console.log('Successfully created asset on backend:', asset.name);
    } catch (error) {
        console.error('Failed to create asset on backend:', asset.name, error);
    }
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
        case 'SET_MESSAGES':
            return {
                ...state,
                currentMessages: action.payload
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

        case 'ACCEPT_MISSION_PROPOSAL':
            const proposedMission = action.payload;
            console.log('Reducer ACCEPT_MISSION_PROPOSAL:', proposedMission);

            if (!proposedMission) {
                console.log('No proposed mission payload, returning state');
                return state;
            }

            const newState = {
                ...state,
                mission: {
                    ...proposedMission,
                    status: MissionStatus.READY_FOR_NEXT_HOP
                },
                collabArea: {
                    type: null,
                    content: null
                }
            };

            console.log('New state after accepting mission:', newState);
            return newState;
        case 'ACCEPT_HOP_PROPOSAL':
            if (!state.mission) return state;
            const { hop: acceptedHop, proposedAssets } = action.payload;

            // Add proposed assets to mission state and convert from PROPOSED to PENDING
            const updatedMissionState = { ...state.mission.mission_state };
            if (proposedAssets && Array.isArray(proposedAssets)) {
                proposedAssets.forEach((assetData: any) => {
                    if (assetData && assetData.id) {
                        // Convert PROPOSED assets to PENDING when accepted
                        const acceptedAsset = {
                            ...assetData,
                            status: assetData.status === AssetStatus.PROPOSED ? AssetStatus.PENDING : assetData.status
                        };
                        updatedMissionState[assetData.id] = acceptedAsset;

                        // Create asset on backend if it was proposed
                        if (assetData.status === AssetStatus.PROPOSED) {
                            // Create asset on backend asynchronously
                            createAssetOnBackend(acceptedAsset).catch(console.error);
                        }
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
                        status: HopStatus.READY_TO_RESOLVE
                    }
                }
            };
        case 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL':
            console.log('ACCEPT_HOP_IMPLEMENTATION_PROPOSAL', action.payload);
            if (!state.mission) return state;
            const implementationHop = action.payload;
            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: {
                        ...implementationHop,
                        status: HopStatus.READY_TO_EXECUTE
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
                    hops: [
                        ...(state.mission.hops || []),
                        {
                            ...completedHop,
                            status: HopStatus.COMPLETED
                        }
                    ],
                    status: isFinalHop ? MissionStatus.COMPLETED : state.mission.status
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
                        status: HopStatus.EXECUTING,
                        tool_steps: state.mission.current_hop.tool_steps?.map((step, index) => {
                            if (index === 0) {
                                return { ...step, status: ToolExecutionStatus.EXECUTING };
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
                status: HopStatus.COMPLETED,
                tool_steps: state.mission.current_hop.tool_steps?.map(step => ({
                    ...step,
                    status: ToolExecutionStatus.COMPLETED
                })) || []
            };

            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: undefined,
                    hops: [
                        ...(state.mission.hops || []),
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
                status: HopStatus.READY_TO_EXECUTE,
                error,
                tool_steps: state.mission.current_hop.tool_steps?.map(step => ({
                    ...step,
                    status: ToolExecutionStatus.FAILED
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
                status: HopStatus.READY_TO_EXECUTE,
                error: undefined,
                tool_steps: state.mission.current_hop.tool_steps?.map(step => ({
                    ...step,
                    status: ToolExecutionStatus.PROPOSED
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

            // Check if all hop outputs are ready
            const allHopOutputsReady = Object.values(hop.hop_state).every(asset => {
                // Only check assets with output role
                if (asset.role === AssetRole.OUTPUT) {
                    return asset.status === AssetStatus.READY;
                }
                return true; // Non-output assets don't need to be ready for hop completion
            });

            // Create updated mission
            const updatedMission = {
                ...state.mission,
                current_hop: hop
            };

            // Check if all hop outputs are ready
            const allOutputsReady = Object.values(hop.hop_state).every(asset => {
                // Only check assets with output role
                if (asset.role === AssetRole.OUTPUT) {
                    return asset.status === AssetStatus.READY;
                }
                return true; // Non-output assets don't need to be ready for hop completion
            });

            // If hop is complete, add it to history and clear current hop
            if (allOutputsReady) {
                // Sanitize the hop state before adding to history
                const sanitizedHop = {
                    ...hop,
                    hop_state: sanitizeHopState(hop.hop_state),
                    status: HopStatus.COMPLETED,
                    is_resolved: true
                };

                updatedMission.hops = [
                    ...(state.mission.hops || []),
                    sanitizedHop
                ];
                // Use type assertion to handle current_hop
                (updatedMission as any).current_hop = undefined;

                // Check if all mission outputs are ready
                const allMissionOutputsReady = Object.values(updatedMission.mission_state).every(asset => {
                    if (asset.role === AssetRole.OUTPUT) {
                        return asset.status === AssetStatus.READY;
                    }
                    return true; // Non-output assets don't need to be ready for mission completion
                });

                // Update mission status
                if (allMissionOutputsReady) {
                    updatedMission.status = MissionStatus.COMPLETED;
                }
            }

            // No need to update mission outputs since they're managed within mission_state
            // The hop_state contains hop-scoped assets, mission_state contains mission-scoped assets

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
                                ? { ...s, status: ToolExecutionStatus.EXECUTING }
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
    createMessage: (content: string, role: MessageRole) => ChatMessage;
    setCollabArea: (type: CollabAreaState['type'], content: CollabAreaState['content']) => void;
    clearCollabArea: () => void;
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
    createNewSession: () => Promise<void>;
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
    const { user, sessionId, chatId, missionId, sessionMetadata, updateSessionMission, updateSessionMetadata, switchToNewSession } = useAuth();
    const isInitializing = useRef(false);

    // Load data when session changes
    useEffect(() => {
        if (chatId) {
            loadChatMessages(chatId);
        }
    }, [chatId]);

    useEffect(() => {
        if (missionId) {
            loadMission(missionId);
        }
    }, [missionId]);

    useEffect(() => {
        if (sessionMetadata) {
            isInitializing.current = true;
            loadSessionState(sessionMetadata);
            // Allow auto-save after a brief delay to ensure state is loaded
            setTimeout(() => {
                isInitializing.current = false;
            }, 100);
        }
    }, [sessionMetadata]);

    // Auto-save session metadata when state changes (but not during initial load)
    useEffect(() => {
        if (isInitializing.current) return;

        if (state.collabArea) {
            const metadata = {
                collabArea: state.collabArea
            };
            updateSessionMetadata(metadata);
        }
    }, [state.collabArea, updateSessionMetadata]);

    // Data loading functions
    const loadChatMessages = async (chatId: string) => {
        try {
            console.log('Loading chat messages for chatId:', chatId);
            const response = await chatApi.getMessages(chatId);
            console.log('Loaded messages:', response.messages?.length || 0);

            dispatch({
                type: 'SET_MESSAGES',
                payload: response.messages || []
            });
        } catch (error) {
            console.error('Error loading chat messages:', error);
            // Don't clear messages if loading fails - just log the error
        }
    };

    const loadMission = async (missionId: string) => {
        try {
            const mission = await missionApi.getMission(missionId);
            dispatch({ type: 'SET_MISSION', payload: mission });
        } catch (error) {
            console.error('Error loading mission:', error);
        }
    };

    const loadSessionState = (metadata: Record<string, any>) => {
        dispatch({
            type: 'SET_STATE', payload: {
                ...state,
                collabArea: metadata.collabArea || { type: null, content: null }
            }
        });
    };

    const setState = useCallback((newState: JamBotState) => {
        dispatch({ type: 'SET_STATE', payload: newState });
    }, []);

    const addMessage = useCallback((message: ChatMessage) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
    }, []);

    const updateStreamingMessage = useCallback((message: string) => {
        dispatch({ type: 'UPDATE_STREAMING_MESSAGE', payload: message });
    }, []);

    const acceptMissionProposal = useCallback(async () => {
        // Get the proposed mission from the collab area content
        const proposedMission = state.collabArea.content?.mission;
        console.log('Accepting mission proposal:', proposedMission);

        if (proposedMission) {
            try {
                // Create mission with status READY_FOR_NEXT_HOP
                const missionToCreate = {
                    ...proposedMission,
                    status: MissionStatus.READY_FOR_NEXT_HOP
                };

                // Call backend API to persist the mission
                const response = await missionApi.createMission(missionToCreate);

                // Update the mission with the returned ID
                const persistedMission = {
                    ...missionToCreate,
                    id: response.mission_id
                };

                console.log('Mission persisted with ID:', response.mission_id);

                // Update session to point to new mission
                await updateSessionMission(response.mission_id);

                dispatch({ type: 'ACCEPT_MISSION_PROPOSAL', payload: persistedMission });
            } catch (error) {
                console.error('Error accepting mission proposal:', error);
                // Fall back to local state update if API call fails
                dispatch({
                    type: 'ACCEPT_MISSION_PROPOSAL', payload: {
                        ...proposedMission,
                        status: MissionStatus.READY_FOR_NEXT_HOP
                    }
                });
            }
        } else {
            console.log('No proposed mission found in collab area');
        }
    }, [state.collabArea.content, updateSessionMission]);

    const acceptHopProposal = useCallback(async (hop: Hop, proposedAssets?: any[]) => {
        try {
            // Update hop status to READY_TO_RESOLVE on backend
            if (hop.id) {
                await hopApi.updateHopStatus(hop.id, HopStatus.READY_TO_RESOLVE);
                console.log(`Hop ${hop.id} status updated to READY_TO_RESOLVE on backend`);
            }

            // Update frontend state
            dispatch({ type: 'ACCEPT_HOP_PROPOSAL', payload: { hop, proposedAssets: proposedAssets || [] } });
            dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: null } });
        } catch (error) {
            console.error('Error accepting hop proposal:', error);
            // Still update frontend state if backend fails
            dispatch({ type: 'ACCEPT_HOP_PROPOSAL', payload: { hop, proposedAssets: proposedAssets || [] } });
            dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: null } });
        }
    }, []);

    const acceptHopImplementationProposal = useCallback(async (hop: Hop) => {
        try {
            // Update hop status to READY_TO_EXECUTE on backend
            if (hop.id) {
                await hopApi.updateHopStatus(hop.id, HopStatus.READY_TO_EXECUTE);
                console.log(`Hop ${hop.id} status updated to READY_TO_EXECUTE on backend`);
            }

            // Update frontend state
            dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL', payload: hop });
            dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: null } });
        } catch (error) {
            console.error('Error accepting hop implementation proposal:', error);
            // Still update frontend state if backend fails
            dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL', payload: hop });
            dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: null } });
        }
    }, []);

    const acceptHopImplementationAsComplete = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE', payload: hop });
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'current-hop', content: null } });
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

            // Get tool definition to access output schema information
            const toolDefinition = await toolsApi.getToolDefinition(step.tool_id);

            // Execute the tool using streamlined approach with mission_id
            const result = await toolsApi.executeTool(step.tool_id, step, hop.hop_state, state.mission?.id);

            if (result.success) {
                // Add success message to chat
                const successMessage: ChatMessage = {
                    id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    chat_id: "temp", // This will be updated when sessions are integrated
                    role: MessageRole.TOOL,
                    content: `Tool '${step.tool_id}' executed successfully`,
                    message_metadata: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                addMessage(successMessage);

                // Create new hop state by applying the result mapping
                const newHopState = { ...hop.hop_state };

                // Apply the result mapping to update hop state
                for (const [outputName, mapping] of Object.entries(step.result_mapping)) {
                    if ((mapping as DiscardMapping).type === "discard") continue;

                    if ((mapping as AssetFieldMapping).type === "asset_field") {
                        // Use canonical outputs if available, otherwise fall back to regular outputs
                        const value = result.canonical_outputs?.[outputName] ?? result.outputs[outputName];

                        if (value !== undefined) {
                            const existingAsset = newHopState[(mapping as AssetFieldMapping).state_asset];

                            // Get the output schema from tool definition to preserve canonical type
                            const outputSchema = toolDefinition?.outputs?.find(output => output.name === outputName)?.schema_definition;

                            newHopState[(mapping as AssetFieldMapping).state_asset] = {
                                ...existingAsset,
                                status: AssetStatus.READY,
                                // Update the value_representation with the result
                                value_representation: typeof value === 'string' ? value : JSON.stringify(value).substring(0, 100)
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
                            ? { ...s, status: ToolExecutionStatus.COMPLETED }
                            : s
                    )
                };

                // Check if any updated assets are mapped to mission outputs
                const updatedMissionOutputs = new Map<string, Asset>();
                for (const [hopAssetKey, asset] of Object.entries(newHopState)) {
                    // Check if this hop asset should update a mission asset
                    // This would need to be configured in the hop design phase
                    // For now, we'll assume hop output assets with matching names update mission assets
                    if (asset.role === AssetRole.OUTPUT) {
                        const matchingMissionAsset = Object.values(state.mission?.mission_state || {}).find(
                            missionAsset => missionAsset.name === asset.name && missionAsset.role === AssetRole.OUTPUT
                        );

                        if (matchingMissionAsset) {
                            const missionAsset: Asset = {
                                ...matchingMissionAsset,
                                status: AssetStatus.READY,
                                value_representation: asset.value_representation,
                                asset_metadata: {
                                    ...matchingMissionAsset.asset_metadata,
                                    updatedAt: new Date().toISOString()
                                },
                                updated_at: new Date().toISOString()
                            };
                            updatedMissionOutputs.set(matchingMissionAsset.id, missionAsset);
                        }
                    }
                }

                // Check if all hop outputs are ready
                const allOutputsReady = Object.values(newHopState).every(asset => {
                    // Only check assets with output role
                    if (asset.role === AssetRole.OUTPUT) {
                        return asset.status === AssetStatus.READY;
                    }
                    return true; // Non-output assets don't need to be ready for hop completion
                });

                if (allOutputsReady) {
                    // Mark hop as complete
                    updatedHop.status = HopStatus.COMPLETED;
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
                            ? { ...s, status: ToolExecutionStatus.FAILED, error: result.errors.join('\n') }
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
                        ? { ...s, status: ToolExecutionStatus.FAILED, error: error instanceof Error ? error.message : 'Failed to execute tool step' }
                        : s
                )
            };
            dispatch({ type: 'UPDATE_HOP_STATE', payload: { hop: updatedHop, updatedMissionOutputs: new Map() } });
        }
    };

    const createMessage = useCallback((content: string, role: MessageRole): ChatMessage => {
        return {
            id: `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            chat_id: chatId || "temp", // Use actual chatId from auth context
            role,
            content,
            message_metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }, [chatId]);

    const processBotMessage = useCallback((data: StreamResponse) => {
        console.log("processBotMessage data", data);

        let token: string = "";
        let newCollabAreaContent: any;

        // Check if this is an AgentResponse (has token or response_text)
        const isAgentResponse = 'token' in data || 'response_text' in data;

        if (isAgentResponse) {
            const agentData = data as AgentResponse;

            if (agentData.token) {
                console.log("agentData.token", agentData.token);
                token = agentData.token;
            }

            if (agentData.response_text) {
                console.log("agentData.response_text", agentData.response_text);
                const chatMessage = createMessage(agentData.response_text, MessageRole.ASSISTANT);
                addMessage(chatMessage);
            }
        }

        // Both AgentResponse and StatusResponse have status
        if (data.status) {
            console.log("data.status", data.status);
            const statusMessage = createMessage(data.status, MessageRole.STATUS);
            addMessage(statusMessage);
        }

        // Both AgentResponse and StatusResponse have payload
        if (data.payload) {

            // set tracking variables
            let isMissionProposal = false
            let isHopProposal = false;
            let isHopImplementationProposal = false;
            let hopPayload: Partial<Hop> | null = null;
            let missionPayload: Partial<Mission> | null = null;

            // determine proposal type
            if (typeof data.payload === 'object' && data.payload !== null && 'mission' in data.payload) {
                missionPayload = data.payload.mission as Partial<Mission>;
            }
            if (typeof data.payload === 'object' && data.payload !== null && 'hop' in data.payload && data.payload.hop) {
                hopPayload = data.payload.hop as Partial<Hop>;
            }
            if (data.status === 'mission_specialist_completed' && missionPayload) {
                isMissionProposal = true
            } else if (data.status === 'hop_designer_completed' && hopPayload) {
                isHopProposal = true;
            } else if (data.status === 'hop_implementer_completed' && hopPayload) {
                isHopImplementationProposal = true;
            }

            // process proposal based on type
            newCollabAreaContent = data.payload;

            if (isMissionProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'mission-proposal', content: newCollabAreaContent } });
            } else if (isHopImplementationProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop-implementation-proposal', content: newCollabAreaContent } });
            } else if (isHopProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop-proposal', content: newCollabAreaContent } });
            }

            return token || "";
        }
    }, [addMessage, updateStreamingMessage, state.collabArea.type, createMessage]);

    const sendMessage = useCallback(async (message: ChatMessage) => {

        addMessage(message);
        let finalContent = '';
        let streamingContent = '';

        try {
            const filteredMessages = state.currentMessages.filter(msg =>
                msg.role !== MessageRole.STATUS && msg.role !== MessageRole.TOOL
            );

            const chatRequest: ChatRequest = {
                messages: [...filteredMessages, message],
                payload: {
                }
            };

            for await (const response of chatApi.streamMessage(chatRequest)) {
                const token = processBotMessage(response);
                if (token) {
                    streamingContent += token;
                    updateStreamingMessage(streamingContent);
                    finalContent += token;
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

    const createNewSession = useCallback(async () => {
        try {
            // Create new session (name will be auto-generated as "Session N")
            const newSessionResponse = await sessionApi.initializeSession({
                session_metadata: {
                    source: 'web_app',
                    initialized_at: new Date().toISOString()
                }
            });

            // Clear current state
            dispatch({
                type: 'SET_STATE',
                payload: {
                    currentMessages: [],
                    currentStreamingMessage: '',
                    collabArea: {
                        type: null,
                        content: null
                    },
                    mission: null
                }
            });

            // Switch to the new session
            switchToNewSession({
                session_id: newSessionResponse.user_session.id,
                session_name: newSessionResponse.user_session.name || "New Session",
                chat_id: newSessionResponse.chat.id,
                mission_id: newSessionResponse.user_session.mission?.id || undefined,
                session_metadata: newSessionResponse.user_session.session_metadata
            });

        } catch (error) {
            console.error('Error creating new session:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to create new session' });
        }
    }, [user, switchToNewSession]);

    return (
        <JamBotContext.Provider value={{
            state,
            addMessage,
            updateStreamingMessage,
            sendMessage,
            createMessage,
            setCollabArea,
            clearCollabArea,
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
            clearError,
            createNewSession
        }}>
            {children}
        </JamBotContext.Provider>
    );
};