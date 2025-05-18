import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import { emailApi } from '@/lib/api/emailApi';
import { Message } from '@/types.old/message';
import { MessageRole } from '@/types.old/message';
import { getDataFromLine } from '@/lib/api/botApi';
import { botApi, DataFromLine } from '@/lib/api/botApi';


const getCollabAreaData = async () => {
    try {
        const response = await emailApi.getNewsletters({
            page: 1,
            page_size: 10
        });
        return response.newsletters;
    } catch (error) {
        console.error('Error fetching newsletters:', error);
        return {
            newsletters: [],
            pagination: {
                page: 1,
                page_size: 10,
                total_count: 0,
                total_pages: 0
            }
        };
    }
}

interface CollabAreaState {
    type: 'default' | 'workflow' | 'document' | 'code' | 'object-list';
    content: any;
}

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
        type: 'object-list',
        content: await getCollabAreaData()
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

            let message = "";
            let error = "";
            if (data.message) {
                message = data.message;
            }
            if (data.error) {
                error = data.error;
            }
            const messageToAdd = newStatusMessage + " " + message + " " + error;

        }


        return data.token || "";
    }, []);


    const addMessage = useCallback((message: ChatMessage) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
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

            for await (const update of botApi.streamMessage(message.content, messages)) {
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


        } catch (error) {
            console.error('Error streaming message:', error);
        } finally {

            const updateStreamingMessage = useCallback((message: string) => {
                dispatch({ type: 'UPDATE_STREAMING_MESSAGE', payload: message });
            }, []);

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
        }
    }, [state, addMessage]);
};
