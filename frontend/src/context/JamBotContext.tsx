import { createContext, useContext, useReducer, useCallback } from 'react';
import { getDataFromLine } from '@/lib/api/chatApi';
import { chatApi } from '@/lib/api/chatApi';

import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { CollabAreaState } from '@/types/collabArea';


interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: CollabAreaState;
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: CollabAreaState };

const initialState: JamBotState = {
    currentMessages: [],
    currentStreamingMessage: '',
    collabArea: {
        type: 'default',
        content: null
    }
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

    const processBotMessage = useCallback((data: AgentResponse) => {
        console.log("data", data);
        if (data.supervisor_response) {
            const response = data.supervisor_response.response_content;
            const newMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
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

    const setCollabArea = useCallback((type: CollabAreaState['type'], content?: any) => {
        dispatch({
            type: 'SET_COLLAB_AREA',
            payload: { type, content }
        });
    }, []);

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

            const chatRequest: ChatRequest = {
                message: message.content,
                history: messages
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
