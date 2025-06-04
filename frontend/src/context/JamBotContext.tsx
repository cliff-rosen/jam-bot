import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi, getDataFromLine } from '@/lib/api/chatApi';
import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { Mission, MissionStatus, HopStatus, defaultMission, Hop, ExecutionStatus } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';
import { Asset, AssetType } from '@/types/asset';

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
    | { type: 'SET_MISSION'; payload: Mission }
    | { type: 'ADD_PAYLOAD_HISTORY'; payload: Record<string, any> }
    | { type: 'ACCEPT_MISSION_PROPOSAL' }
    | { type: 'ACCEPT_HOP_PROPOSAL'; payload: Hop }
    | { type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL'; payload: Hop }
    | { type: 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE'; payload: Hop };

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
                },
                collabArea: {
                    type: 'default',
                    content: null
                }
            };
        case 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL':
            // Get the implemented hop from the action payload
            const implementedHop = action.payload;

            // Update the mission's current hop with the implemented version
            const updatedCurrentHop = {
                ...state.mission.current_hop,
                ...implementedHop,
                // Ensure we keep the original hop structure
                steps: implementedHop.steps || [],
                is_resolved: true,
                status: ExecutionStatus.PENDING
            };

            // Also update the hop in the hops array if it exists
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
                },
                collabArea: {
                    type: 'default',
                    content: null
                }
            };
        case 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE':
            const completedHop = action.payload;
            const updatedHops = [...state.mission.hops];
            const completeCurrentHopIndex = state.mission.current_hop_index;
            const isFinalHop = completedHop.is_final;

            // Mark the completed hop in the hops array
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
                    current_hop: undefined, // Clear current hop since it's now complete
                    current_hop_index: completeCurrentHopIndex + 1, // Move to next hop
                    // If it's the final hop, complete the mission; otherwise, ready for next hop
                    mission_status: isFinalHop ? MissionStatus.COMPLETE : state.mission.mission_status,
                    hop_status: isFinalHop ? HopStatus.ALL_HOPS_COMPLETE : HopStatus.READY_TO_DESIGN
                },
                collabArea: {
                    type: 'default',
                    content: null
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
    }, []);

    const acceptHopImplementationProposal = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_PROPOSAL', payload: hop });
    }, []);

    const acceptHopImplementationAsComplete = useCallback((hop: Hop) => {
        dispatch({ type: 'ACCEPT_HOP_IMPLEMENTATION_AS_COMPLETE', payload: hop });
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

        // add assistant message
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

        // handle payload
        if (data.payload) {
            // first deciphher payload type
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

            // then update state accordingly
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
            } else {
                dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'object', content: newCollabAreaContent } });
            }
            if (lastMessageId) {
                addPayloadHistory({ [lastMessageId]: newCollabAreaContent });
            }

            return token;

        }
    }, [addMessage, updateStreamingMessage, addPayloadHistory]);

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
                    assets: Object.values(state.mission.state || {})
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
            acceptHopImplementationAsComplete
        }}>
            {children}
        </JamBotContext.Provider>
    );
};
