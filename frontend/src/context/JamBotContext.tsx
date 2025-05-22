import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { getDataFromLine } from '@/lib/api/chatApi';
import { chatApi } from '@/lib/api/chatApi';

import { ChatMessage, AgentResponse, ChatRequest, MessageRole, Asset, AssetReference } from '@/types/chat';
import { Mission, defaultMission } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';

interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: CollabAreaState;
    assets: Asset[];
    mission: Mission;
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: CollabAreaState }
    | { type: 'SET_ASSETS'; payload: Asset[] }
    | { type: 'SET_MISSION'; payload: Mission };

const initialState: JamBotState = {
    currentMessages: [],
    currentStreamingMessage: '',
    collabArea: {
        type: 'default',
        content: null
    },
    assets: [],
    mission: defaultMission
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

    const processBotMessage = useCallback((data: AgentResponse) => {
        console.log("data", data);
        if (data.supervisor_response) {
            const response = data.supervisor_response.response_content;
            const newMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: MessageRole.ASSISTANT,
                content: response,
                timestamp: new Date().toISOString()
            };
            console.log("newMessage", newMessage);
            addMessage(newMessage);
        }

        if (data.status) {
            updateStreamingMessage(data.status);
        }

        return data.token || "";
    }, []);

    const addMessage = useCallback((message: ChatMessage) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
    }, []);

    const updateStreamingMessage = useCallback((message: string) => {
        dispatch({ type: 'UPDATE_STREAMING_MESSAGE', payload: message });
    }, []);

    const sendMessage = useCallback(async (message: ChatMessage) => {
        addMessage(message);
        let finalContent = '';

        try {
            // Convert ChatMessage[] to Message[]
            const messages: ChatMessage[] = state.currentMessages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }));

            const chatRequest: ChatRequest = {
                message: message.content,
                history: messages,
                payload: {
                    mission: state.mission,
                    assets: state.assets
                }

            };

            for await (const update of chatApi.streamMessage(chatRequest)) {
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
                role: MessageRole.ASSISTANT,
                content: finalContent,
                timestamp: new Date().toISOString()
            };

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
            setCollabArea
        }}>
            {children}
        </JamBotContext.Provider>
    );
};
