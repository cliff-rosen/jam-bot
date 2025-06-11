import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi, getDataFromLine } from '@/lib/api/chatApi';
import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { Mission, MissionStatus, HopStatus, defaultMission, Hop, ExecutionStatus, markHopOutputsReady } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';
import { Asset } from '@/types/asset';

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
    | { type: 'UPDATE_HOP_STATE'; payload: { hop: Hop; missionOutputs: Map<string, Asset> } }
    | { type: 'SET_STATE'; payload: JamBotState };

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
            const newMission = action.payload as Mission;
            const combinedState: Record<string, Asset> = { ...(newMission.mission_state || {}) };

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
                    mission_state: combinedState,
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
            if (!state.mission?.current_hop) {
                return state;
            }
            const updatedCurrentHop = {
                ...state.mission.current_hop,
                status: HopStatus.HOP_READY_TO_EXECUTE,
                is_resolved: true
            };
            const updatedHopsArray = state.mission.hops.map(hop =>
                hop.id === updatedCurrentHop.id ? updatedCurrentHop : hop
            );
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
            const isFinalHop = completedHop.is_final;
            const completeCurrentHopIndex = state.mission.current_hop_index ?? 0;

            if (completeCurrentHopIndex < updatedHops.length) {
                updatedHops[completeCurrentHopIndex] = {
                    ...completedHop,
                    status: HopStatus.ALL_HOPS_COMPLETE
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
                    const updatedSteps = hop.tool_steps?.map((step, index) => {
                        if (index === 0) {
                            return { ...step, status: ExecutionStatus.RUNNING };
                        }
                        return step;
                    }) || [];

                    return {
                        ...hop,
                        status: HopStatus.HOP_RUNNING,
                        tool_steps: updatedSteps,
                    };
                }
                return hop;
            });

            const updatedCurrentHopForStart = state.mission.current_hop?.id === hopIdToStart
                ? {
                    ...state.mission.current_hop,
                    status: HopStatus.HOP_RUNNING,
                    tool_steps: state.mission.current_hop.tool_steps?.map((step, index) => {
                        if (index === 0) {
                            return { ...step, status: ExecutionStatus.RUNNING };
                        }
                        return step;
                    }) || [],
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
                    const updatedSteps = hop.tool_steps?.map(step => ({
                        ...step,
                        status: ExecutionStatus.COMPLETED
                    })) || [];

                    return {
                        ...hop,
                        status: HopStatus.ALL_HOPS_COMPLETE,
                        tool_steps: updatedSteps
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
            const updatedMissionState = { ...state.mission.mission_state };
            if (completedHopForExecution.output_mapping && completedHopForExecution.hop_state) {
                const markedReady = markHopOutputsReady(
                    completedHopForExecution.hop_state,
                    completedHopForExecution.output_mapping,
                    updatedMissionState,
                    "hop_execution"
                );
                // TODO: Do something with markedReady
            }

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHopsForComplete,
                    current_hop: completedHopForExecution,
                    hop_status: HopStatus.ALL_HOPS_COMPLETE
                }
            };
        case 'FAIL_HOP_EXECUTION':
            const { hopId, error } = action.payload;
            const updatedHopsForFail = state.mission.hops.map(hop => {
                if (hop.id === hopId) {
                    const updatedSteps = hop.tool_steps?.map(step => ({
                        ...step,
                        status: ExecutionStatus.FAILED,
                        error
                    })) || [];

                    return {
                        ...hop,
                        status: HopStatus.FAILED,
                        error,
                        tool_steps: updatedSteps
                    };
                }
                return hop;
            });

            const failedHop = updatedHopsForFail.find(h => h.id === hopId);

            if (!failedHop) {
                console.error('Failed hop not found in hops array');
                return state;
            }

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHopsForFail,
                    current_hop: failedHop,
                    hop_status: HopStatus.FAILED
                }
            };
        case 'RETRY_HOP_EXECUTION':
            const hopIdToRetry = action.payload;
            const updatedHopsForRetry = state.mission.hops.map(hop => {
                if (hop.id === hopIdToRetry) {
                    const updatedSteps = hop.tool_steps?.map(step => ({
                        ...step,
                        status: ExecutionStatus.PENDING,
                        error: undefined
                    })) || [];

                    return {
                        ...hop,
                        status: HopStatus.HOP_READY_TO_EXECUTE,
                        error: undefined,
                        tool_steps: updatedSteps
                    };
                }
                return hop;
            });

            const retriedHop = updatedHopsForRetry.find(h => h.id === hopIdToRetry);

            if (!retriedHop) {
                console.error('Retried hop not found in hops array');
                return state;
            }

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHopsForRetry,
                    current_hop: retriedHop,
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
            const { hop: updatedHopData, missionOutputs } = action.payload;
            const updatedHopsForState = state.mission.hops.map(hop =>
                hop.id === updatedHopData.id ? updatedHopData : hop
            );
            const currentHopForState = state.mission.current_hop?.id === updatedHopData.id
                ? updatedHopData
                : state.mission.current_hop;

            return {
                ...state,
                mission: {
                    ...state.mission,
                    hops: updatedHopsForState,
                    current_hop: currentHopForState,
                    mission_state: { ...state.mission.mission_state, ...Object.fromEntries(missionOutputs) },
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
    setState: (state: JamBotState) => void;
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

    const setState = useCallback((newState: JamBotState) => {
        dispatch({ type: 'SET_STATE', payload: newState });
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
            updateHopState,
            setState
        }}>
            {children}
        </JamBotContext.Provider>
    );
};
