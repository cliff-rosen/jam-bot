import { Message, ChatResponse, Asset } from '../../components/fractal-bot/types/state';
import { Mission, Tool } from '../../components/fractal-bot/types';
import { api, handleApiError } from './index';
import { makeStreamRequest, StreamUpdate } from './streamUtils';

export interface MessageHistory {
    role: string;
    content: string;
    timestamp: string;
}

export interface SendMessageRequest {
    message: string;
    history: MessageHistory[];
    mission: Mission;
    selectedTools: Tool[];
}

export interface SendMessageResponse extends ChatResponse { }

export const botApi = {

    streamMessage: async function* (
        message: string,
        history: Message[],
        mission: Mission,
        selectedTools: Tool[]): AsyncGenerator<StreamUpdate> {
        // Convert Message[] to MessageHistory[]
        const messageHistory: MessageHistory[] = history.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
        }));

        const requestBody = {
            message,
            history: messageHistory,
            mission,
            selectedTools
        };

        yield* makeStreamRequest('/api/bot/stream', requestBody, 'POST');
    },

    streamWorkflow: async function* (mission: Mission, selectedTools: Tool[]): AsyncGenerator<StreamUpdate> {

        const requestBody = {
            message: mission.goal,
            history: [],
            mission,
            selectedTools
        };

        yield* makeStreamRequest('/api/bot/workflow/stream', requestBody, 'POST');
    },

    sendMessage: async (message: string, history: Message[], mission: Mission, selectedTools: Tool[]): Promise<SendMessageResponse> => {
        try {
            // Convert Message[] to MessageHistory[]
            const messageHistory: MessageHistory[] = history.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString()
            }));

            const response = await api.post<SendMessageResponse>('/api/bot/run', {
                message,
                history: messageHistory,
                mission,
                selectedTools
            });
            return response.data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw new Error(handleApiError(error));
        }
    },


}; 