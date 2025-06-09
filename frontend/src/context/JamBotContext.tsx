import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi, getDataFromLine } from '@/lib/api/chatApi';
import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { Mission, MissionStatus, HopStatus, defaultMission, Hop, ExecutionStatus } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';
import { Asset } from '@/types/asset';
import { markHopOutputsReady } from '@/types/schema';

interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: CollabAreaState;
    mission: Mission;
    payload_history: Record<string, any>[];
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: CollabAreaState }
    | { type: 'CLEAR_COLLAB_AREA' }
    | { type: 'SET_MISSION'; payload: Mission }
    | { type: 'ADD_PAYLOAD_HISTORY'; payload: Record<string, any> }
    | { type: 'ACCEPT_MISSION_PROPOSAL' }
    | { type: 'ACCEPT_HOP_PROPOSAL'; payload: Hop }
    | { type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL'; payload: Hop }
    | { type: 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE'; payload: Hop }
    | { type: 'START_HOP_EXECUTION'; payload: string }
    | { type: 'COMPLETE_HOP_EXECUTION'; payload: string }
    | { type: 'FAIL_HOP_EXECUTION'; payload: { hopId: string; error: string } }
    | { type: 'RETRY_HOP_EXECUTION'; payload: string }
    | { type: 'UPDATE_HOP_STATE'; payload: { hop: Hop; missionOutputs: Map<string, Asset> } };

const initialState: JamBotState = {
    currentMessages: [],
    currentStreamingMessage: '',
    collabArea: {
        type: 'default',
        content: null
    },
    mission: defaultMission,
    payload_history: []
};

const jamBotReducer = (state: JamBotState, action: JamBotAction): JamBotState => {
    switch (action.type) {
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
            const newMission = action.payload as Mission;
            const combinedState: Record<string, Asset> = { ...(newMission.state || {}) };

            if (Array.isArray(newMission.inputs)) {
                newMission.inputs.forEach(asset => {
                    if (asset && asset.id) {
                        combinedState[asset.id] = asset;
                    }
                });
            }

            if (Array.isArray(newMission.outputs)) {
                newMission.outputs.forEach(asset => {
                    if (asset && asset.id) {
                        combinedState[asset.id] = asset;
                    }
                });
            }

            return {
                ...state,
                mission: {
                    ...newMission,
                    state: combinedState,
                }
            };
        case 'ADD_PAYLOAD_HISTORY':
            return {
                ...state,
                payload_history: [...state.payload_history, action.payload]
            };
        case 'ACCEPT_MISSION_PROPOSAL':
            return {
                ...state,
                mission: {
                    ...state.mission,
                    mission_status: MissionStatus.ACTIVE,
                    hop_status: HopStatus.READY_TO_DESIGN
                },
                collabArea: {
                    type: 'default',
                    content: null
                }
            };
        case 'ACCEPT_HOP_PROPOSAL':
            const acceptedHop = action.payload;
            const existingHops = Array.isArray(state.mission.hops) ? state.mission.hops : [];
            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: acceptedHop,
                    hops: [...existingHops, acceptedHop],
                    current_hop_index: existingHops.length,
                    hop_status: HopStatus.HOP_READY_TO_RESOLVE
                }
            };
        case 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL':
            const implementedHop = action.payload;

            const updatedCurrentHop = {
                ...state.mission.current_hop,
                ...implementedHop,
                steps: implementedHop.steps || [],
                is_resolved: true,
                status: ExecutionStatus.PENDING
            };

            const updatedHopsArray = [...state.mission.hops];
            const implCurrentHopIndex = state.mission.current_hop_index;
            if (implCurrentHopIndex < updatedHopsArray.length) {
                updatedHopsArray[implCurrentHopIndex] = updatedCurrentHop;
            }

            return {
                ...state,
                mission: {
                    ...state.mission,
                    current_hop: updatedCurrentHop,
                    hops: updatedHopsArray,
                    hop_status: HopStatus.HOP_READY_TO_EXECUTE
                }
            };
        case 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE':
            const completedHop = action.payload;
            const updatedHops = [...state.mission.hops];
            const completeCurrentHopIndex = state.mission.current_hop_index;
            const isFinalHop = completedHop.is_final;

            if (completeCurrentHopIndex < updatedHops.length) {
                updatedHops[completeCurrentHopIndex] = {
                    ...completedHop,
                    status: ExecutionStatus.COMPLETED
                };
            }

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHops,
                    current_hop: undefined,
                    current_hop_index: completeCurrentHopIndex + 1,
                    mission_status: isFinalHop ? MissionStatus.COMPLETE : state.mission.mission_status,
                    hop_status: isFinalHop ? HopStatus.ALL_HOPS_COMPLETE : HopStatus.READY_TO_DESIGN
                }
            };
        case 'START_HOP_EXECUTION':
            const hopIdToStart = action.payload;
            const updatedHopsForStart = state.mission.hops.map(hop => {
                if (hop.id === hopIdToStart) {
                    const updatedSteps = hop.steps?.map((step, index) => {
                        if (index === 0) {
                            return { ...step, status: ExecutionStatus.RUNNING };
                        }
                        return step;
                    }) || [];

                    return {
                        ...hop,
                        status: ExecutionStatus.RUNNING,
                        steps: updatedSteps,
                        current_step_index: 0
                    };
                }
                return hop;
            });

            const updatedCurrentHopForStart = state.mission.current_hop?.id === hopIdToStart
                ? {
                    ...state.mission.current_hop,
                    status: ExecutionStatus.RUNNING,
                    steps: state.mission.current_hop.steps?.map((step, index) => {
                        if (index === 0) {
                            return { ...step, status: ExecutionStatus.RUNNING };
                        }
                        return step;
                    }) || [],
                    current_step_index: 0
                }
                : state.mission.current_hop;

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHopsForStart,
                    current_hop: updatedCurrentHopForStart,
                    hop_status: HopStatus.HOP_RUNNING
                }
            };
        case 'COMPLETE_HOP_EXECUTION':
            const hopIdToComplete = action.payload;

            const updatedHopsForComplete = state.mission.hops.map(hop => {
                if (hop.id === hopIdToComplete) {
                    const updatedSteps = hop.steps?.map(step => ({
                        ...step,
                        status: ExecutionStatus.COMPLETED
                    })) || [];

                    return {
                        ...hop,
                        status: ExecutionStatus.COMPLETED,
                        steps: updatedSteps
                    };
                }
                return hop;
            });

            const completedHopForExecution = updatedHopsForComplete.find(h => h.id === hopIdToComplete);

            if (!completedHopForExecution) {
                console.error('Completed hop not found in hops array');
                return state;
            }

            // Mark hop output assets as ready when hop completes successfully
            const updatedMissionState = { ...state.mission.state };
            if (completedHopForExecution.output_mapping && completedHopForExecution.state) {
                const markedReady = markHopOutputsReady(
                    completedHopForExecution.state,
                    completedHopForExecution.output_mapping,
                    updatedMissionState,
                    "hop_execution"
                );

                if (markedReady.length > 0) {
                    console.log(`Hop '${completedHopForExecution.name}' completion marked ${markedReady.length} assets as ready: ${markedReady.join(', ')}`);
                }
            }

            let newMissionStatus = state.mission.mission_status;
            let newHopStatus: HopStatus;
            let newCurrentHop: Hop | undefined;
            let newCurrentHopIndex = state.mission.current_hop_index;

            if (completedHopForExecution.is_final) {
                newMissionStatus = MissionStatus.COMPLETE;
                newHopStatus = HopStatus.ALL_HOPS_COMPLETE;
                newCurrentHop = undefined;
            } else {
                newHopStatus = HopStatus.READY_TO_DESIGN;
                newCurrentHop = undefined;
                newCurrentHopIndex = state.mission.current_hop_index + 1;
            }

            console.log('Hop completion:', {
                hopId: hopIdToComplete,
                isFinal: completedHopForExecution.is_final,
                newHopStatus,
                newCurrentHopIndex,
                hopName: completedHopForExecution.name
            });

            return {
                ...state,
                mission: {
                    ...state.mission,
                    state: updatedMissionState, // Include updated mission state with ready assets
                    hops: updatedHopsForComplete,
                    current_hop: newCurrentHop,
                    current_hop_index: newCurrentHopIndex,
                    mission_status: newMissionStatus,
                    hop_status: newHopStatus
                }
            };
        case 'FAIL_HOP_EXECUTION':
            const { hopId: hopIdToFail, error } = action.payload;
            const updatedHopsForFail = state.mission.hops.map(hop => {
                if (hop.id === hopIdToFail) {
                    const updatedSteps = hop.steps?.map((step, index) => {
                        if (index === hop.current_step_index) {
                            return { ...step, status: ExecutionStatus.FAILED };
                        }
                        return step;
                    }) || [];

                    return {
                        ...hop,
                        status: ExecutionStatus.FAILED,
                        steps: updatedSteps
                    };
                }
                return hop;
            });

            const updatedCurrentHopForFail = state.mission.current_hop?.id === hopIdToFail
                ? {
                    ...state.mission.current_hop,
                    status: ExecutionStatus.FAILED,
                    steps: state.mission.current_hop.steps?.map((step, index) => {
                        if (index === (state.mission.current_hop?.current_step_index || 0)) {
                            return { ...step, status: ExecutionStatus.FAILED };
                        }
                        return step;
                    }) || []
                }
                : state.mission.current_hop;

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHopsForFail,
                    current_hop: updatedCurrentHopForFail,
                    hop_status: HopStatus.HOP_READY_TO_EXECUTE
                }
            };
        case 'RETRY_HOP_EXECUTION':
            const hopIdToRetry = action.payload;
            const updatedHopsForRetry = state.mission.hops.map(hop => {
                if (hop.id === hopIdToRetry) {
                    const updatedSteps = hop.steps?.map(step => ({
                        ...step,
                        status: ExecutionStatus.PENDING
                    })) || [];

                    return {
                        ...hop,
                        status: ExecutionStatus.PENDING,
                        steps: updatedSteps,
                        current_step_index: 0
                    };
                }
                return hop;
            });

            const updatedCurrentHopForRetry = state.mission.current_hop?.id === hopIdToRetry
                ? {
                    ...state.mission.current_hop,
                    status: ExecutionStatus.PENDING,
                    steps: state.mission.current_hop.steps?.map(step => ({
                        ...step,
                        status: ExecutionStatus.PENDING
                    })) || [],
                    current_step_index: 0
                }
                : state.mission.current_hop;

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHopsForRetry,
                    current_hop: updatedCurrentHopForRetry,
                    hop_status: HopStatus.HOP_READY_TO_EXECUTE
                }
            };
        case 'CLEAR_COLLAB_AREA':
            return {
                ...state,
                collabArea: {
                    type: 'default',
                    content: null
                }
            };
        case 'UPDATE_HOP_STATE':
            const { hop: updatedHop, missionOutputs } = action.payload;

            // Update the hop in the hops array
            const stateUpdatedHops = state.mission.hops.map(h =>
                h.id === updatedHop.id ? updatedHop : h
            );

            // Update current_hop if it matches
            const stateUpdatedCurrentHop = state.mission.current_hop?.id === updatedHop.id
                ? updatedHop
                : state.mission.current_hop;

            // Update mission state with any new outputs
            const stateUpdatedMissionState = { ...state.mission.state };
            missionOutputs.forEach((asset, missionOutputId) => {
                stateUpdatedMissionState[missionOutputId] = asset;
            });

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: stateUpdatedHops,
                    current_hop: stateUpdatedCurrentHop,
                    state: stateUpdatedMissionState
                }
            };
        default:
            return state;
    }
};

const JamBotContext = createContext<{
    state: JamBotState;
    addMessage: (message: ChatMessage) => void;
    updateStreamingMessage: (message: string) => void;
    sendMessage: (message: ChatMessage) => void;
    setCollabArea: (type: CollabAreaState['type'], content?: any) => void;
    addPayloadHistory: (payload: Record<string, any>) => void;
    acceptMissionProposal: () => void;
    acceptHopProposal: (hop: Hop) => void;
    acceptHopImplementationProposal: (hop: Hop) => void;
    acceptHopImplementationAsComplete: (hop: Hop) => void;
    startHopExecution: (hopId: string) => void;
    completeHopExecution: (hopId: string) => void;
    failHopExecution: (hopId: string, error: string) => void;
    retryHopExecution: (hopId: string) => void;
    clearCollabArea: () => void;
    updateHopState: (hop: Hop, missionOutputs: Map<string, Asset>) => void;
} | undefined>(undefined);

export const useJamBot = () => {
    const context = useContext(JamBotContext);
    if (!context) {
        throw new Error('useJamBot must be used within a JamBotProvider');
    }
    return context;
};

export const JamBotProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(jamBotReducer, initialState);

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

    const acceptHopProposal = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_PROPOSAL', payload: hop });
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop', content: hop } });
    }, []);

    const acceptHopImplementationProposal = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL', payload: hop });
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop', content: hop } });
    }, []);

    const acceptHopImplementationAsComplete = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE', payload: hop });
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop', content: hop } });
    }, []);

    const startHopExecution = useCallback((hopId: string) => {
        dispatch({ type: 'START_HOP_EXECUTION', payload: hopId });
    }, []);

    const completeHopExecution = useCallback((hopId: string) => {
        dispatch({ type: 'COMPLETE_HOP_EXECUTION', payload: hopId });
    }, []);

    const failHopExecution = useCallback((hopId: string, error: string) => {
        dispatch({ type: 'FAIL_HOP_EXECUTION', payload: { hopId, error } });
    }, []);

    const retryHopExecution = useCallback((hopId: string) => {
        dispatch({ type: 'RETRY_HOP_EXECUTION', payload: hopId });
    }, []);

    const clearCollabArea = useCallback(() => {
        dispatch({ type: 'CLEAR_COLLAB_AREA' });
    }, []);

    const updateHopState = useCallback((hop: Hop, missionOutputs: Map<string, Asset>) => {
        dispatch({ type: 'UPDATE_HOP_STATE', payload: { hop, missionOutputs } });
    }, []);

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
            const isMissionProposal = data.status === 'mission_specialist_completed' &&
                typeof data.payload === 'object' && data.payload !== null && 'mission' in data.payload;
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

            const currentCollabType = state.collabArea.type;
            const isCurrentHopRelated = ['hop', 'hop-proposal', 'hop-implementation-proposal'].includes(currentCollabType);
            const isNewHopRelated = isMissionProposal || isHopProposal || isHopImplementationProposal;

            newCollabAreaContent = data.payload;
            if (typeof data.payload === 'object' && data.payload !== null && 'mission' in data.payload) {
                dispatch({ type: 'SET_MISSION', payload: (data.payload as any).mission });
            }

            if (isMissionProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'mission-proposal', content: newCollabAreaContent } });
            } else if (isHopImplementationProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop-implementation-proposal', content: newCollabAreaContent } });
            } else if (isHopProposal) {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop-proposal', content: newCollabAreaContent } });
            } else if (!isCurrentHopRelated) {
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
            const chatRequest: ChatRequest = {
                messages: [...filteredMessages, message],
                payload: {
                    mission: state.mission,
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

    const setCollabArea = useCallback((type: CollabAreaState['type'], content?: any) => {
        dispatch({
            type: 'SET_COLLAB_AREA',
            payload: { type, content }
        });
    }, []);

    return (
        <JamBotContext.Provider value={{
            state,
            addMessage,
            updateStreamingMessage,
            sendMessage,
            setCollabArea,
            addPayloadHistory,
            acceptMissionProposal,
            acceptHopProposal,
            acceptHopImplementationProposal,
            acceptHopImplementationAsComplete,
            startHopExecution,
            completeHopExecution,
            failHopExecution,
            retryHopExecution,
            clearCollabArea,
            updateHopState
        }}>
            {children}
        </JamBotContext.Provider>
    );
};
