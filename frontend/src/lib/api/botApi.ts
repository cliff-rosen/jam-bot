import { Message, ChatResponse } from '../../components/fractal-bot/types/state';
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
}

export interface SendMessageResponse extends ChatResponse { }


export interface DataFromLine {
    token: string | null;
    status: string | null;
    error: string | null;
    message: string | null;
}

export function getDataFromLine(line: string): DataFromLine {
    const res: DataFromLine = {
        token: null,
        status: null,
        error: null,
        message: null,
    };

    if (!line.startsWith('data: ')) {
        return res;
    }

    const jsonStr = line.slice(6);

    try {
        const data = JSON.parse(jsonStr);
        if (data.token) {
            res.token = data.token;
        }
        if (data.status) {
            res.status = data.status;
        }
        if (data.message) {
            res.message = data.message;
        }
        if (data.error) {
            res.error = data.error;
        }
    } catch (e) {
        res.error = e instanceof Error ? e.message : String(e);
    }

    return res;
}


export const botApi = {

    streamMessage: async function* (
        message: string,
        history: Message[],
    ): AsyncGenerator<StreamUpdate> {
        // Convert Message[] to MessageHistory[]
        const messageHistory: MessageHistory[] = history.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
        }));

        const requestBody = {
            message,
            history: messageHistory,
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