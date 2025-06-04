import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi, getDataFromLine } from '@/lib/api/chatApi';
import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { Mission, MissionStatus, HopStatus, defaultMission } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';
import { Asset, AssetType } from '@/types/asset';

interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: CollabAreaState;
    assets: Asset[];
    mission: Mission;
    payload_history: Record<string, any>[];
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: CollabAreaState }
    | { type: 'SET_ASSETS'; payload: Asset[] }
    | { type: 'SET_MISSION'; payload: Mission }
    | { type: 'ADD_PAYLOAD_HISTORY'; payload: Record<string, any> }
    | { type: 'ACCEPT_MISSION_PROPOSAL' }
    | { type: 'ACCEPT_HOP_PROPOSAL' };

const initialState: JamBotState = {
    currentMessages: [],
    currentStreamingMessage: '',
    collabArea: {
        type: 'default',
        content: null
    },
    assets: [],
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
        case 'SET_ASSETS':
            return {
                ...state,
                assets: action.payload
            };
        case 'SET_MISSION':
            return {
                ...state,
                mission: action.payload
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
            return {
                ...state,
                mission: {
                    ...state.mission,
                    hop_status: HopStatus.HOP_READY_TO_RESOLVE
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
    acceptHopProposal: () => void;
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

    useEffect(() => {
        const fetchAssets = async () => {
            const fetchedAssets = await assetApi.getAssets();
            dispatch({ type: 'SET_ASSETS', payload: fetchedAssets });
        };
        fetchAssets();
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

    const acceptHopProposal = useCallback(() => {
        dispatch({ type: 'ACCEPT_HOP_PROPOSAL' });
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
                // newCollabAreaContent = data.payload;
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

            if (data.payload) {
                newCollabAreaContent = data.payload;

                // Check if this is a mission proposal (status was mission_specialist_completed)
                const isMissionProposal = data.status === 'mission_specialist_completed' &&
                    typeof data.payload === 'object' &&
                    data.payload !== null &&
                    'mission' in data.payload;

                // Check if this is a hop proposal - either by status or by having current_hop in mission
                const isHopProposal = (data.status === 'hop_designer_completed' ||
                    data.status === 'supervisor_routing_completed') &&
                    typeof data.payload === 'object' &&
                    data.payload !== null &&
                    'mission' in data.payload &&
                    data.payload.mission &&
                    typeof data.payload.mission === 'object' &&
                    'current_hop' in data.payload.mission &&
                    (data.payload.mission as any).current_hop !== null;


                // Set the collab area to the appropriate type
                if (isMissionProposal) {
                    dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'mission-proposal', content: newCollabAreaContent } });
                } else if (isHopProposal) {
                    dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'hop-proposal', content: newCollabAreaContent } });
                } else {
                    dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'object', content: newCollabAreaContent } });
                }

                addPayloadHistory({ [lastMessageId]: newCollabAreaContent });
            }
        }

        if (typeof data.payload === 'object' && data.payload !== null && 'mission' in data.payload) {
            dispatch({ type: 'SET_MISSION', payload: (data.payload as any).mission });
        }

        return token;

    }, [addMessage, updateStreamingMessage, addPayloadHistory]);

    const sendMessage = useCallback(async (message: ChatMessage) => {
        addMessage(message);
        let finalContent = '';
        let streamingContent = '';

        try {
            // Filter out status messages before sending to backend
            const filteredMessages = state.currentMessages.filter(msg => msg.role !== MessageRole.STATUS);
            const chatRequest: ChatRequest = {
                messages: [...filteredMessages, message],
                payload: {
                    mission: state.mission,
                    assets: state.assets
                }
            };

            for await (const update of chatApi.streamMessage(chatRequest)) {
                const lines = update.data.split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue; // Skip empty lines
                    const data = getDataFromLine(line);
                    const token = processBotMessage(data);
                    if (token) {
                        streamingContent += token;
                        // Update UI immediately after each token
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
            acceptHopProposal
        }}>
            {children}
        </JamBotContext.Provider>
    );
};
