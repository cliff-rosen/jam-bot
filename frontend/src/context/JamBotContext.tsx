import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi, getDataFromLine } from '@/lib/api/chatApi';
import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { Mission, MissionStatus, Hop, ExecutionStatus, HopStatus, defaultMission } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';
import { Asset } from '@/types/asset';

interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: {
        type: 'mission-proposal' | 'hop-proposal' | 'hop-implementation-proposal' | 'hop' | null;
        content: any;
    };
    mission: Mission | null;
    payload_history: Record<string, any>[];
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: { type: 'mission-proposal' | 'hop-proposal' | 'hop-implementation-proposal' | 'hop' | null; content: any } }
    | { type: 'CLEAR_COLLAB_AREA' }
    | { type: 'SET_MISSION'; payload: Mission }
    | { type: 'UPDATE_MISSION'; payload: Partial<Mission> }
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
        type: null,
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
            const acceptedHop = action.payload;
            return {
                ...state,
                mission: {
                    ...state.mission,
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
            const { hop, missionOutputs } = action.payload;

            // Update the current hop
            const updatedMission = {
                ...state.mission,
                current_hop: hop
            };

            // If the hop is completed, add it to hop_history
            if (hop.status === HopStatus.ALL_HOPS_COMPLETE) {
                updatedMission.hop_history = [
                    ...(state.mission.hop_history || []),
                    hop
                ];
            }

            // Update any mission outputs that were modified
            if (missionOutputs.size > 0) {
                updatedMission.outputs = state.mission.outputs.map(output => {
                    const updatedOutput = missionOutputs.get(output.id);
                    return updatedOutput || output;
                });
            }

            return {
                ...state,
                mission: updatedMission
            };
        default:
            return state;
    }
};

interface JamBotContextValue {
    state: JamBotState;
    addMessage: (message: ChatMessage) => void;
    updateStreamingMessage: (message: string) => void;
    sendMessage: (message: ChatMessage) => void;
    setCollabArea: (type: 'mission-proposal' | 'hop-proposal' | 'hop-implementation-proposal' | 'hop' | null, content: any) => void;
    addPayloadHistory: (payload: Record<string, any>) => void;
    acceptMissionProposal: () => void;
    acceptHopProposal: (hop: Hop) => void;
    acceptHopImplementationProposal: (hop: Hop) => void;
    acceptHopImplementationAsComplete: (hop: Hop) => void;
    startHopExecution: (hopId: string) => void;
    completeHopExecution: (hopId: string) => void;
    failHopExecution: (hopId: string, error: string) => void;
    retryHopExecution: (hopId: string) => void;
    updateHopState: (hop: Hop, missionOutputs: Map<string, Asset>) => void;
    setState: (newState: JamBotState) => void;
}

const JamBotContext = createContext<JamBotContextValue | null>(null);

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
            const isCurrentHopRelated = currentCollabType !== null && ['hop', 'hop-proposal', 'hop-implementation-proposal'].includes(currentCollabType);
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
                    mission: state.mission || defaultMission,
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

    const setCollabArea = useCallback((type: 'mission-proposal' | 'hop-proposal' | 'hop-implementation-proposal' | 'hop' | null, content: any) => {
        dispatch({ type: 'SET_COLLAB_AREA', payload: { type, content } });
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
            updateHopState,
            setState
        }}>
            {children}
        </JamBotContext.Provider>
    );
};
