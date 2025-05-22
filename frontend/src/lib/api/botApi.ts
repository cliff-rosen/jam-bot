import { Message, ChatResponse, BotRequest } from '../../types/bot';
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
    message: string | null;
    status: string | null;
    supervisor_response: string | null;
    error: string | null;
}

export function getDataFromLine(line: string): DataFromLine {
    const res: DataFromLine = {
        token: null,
        status: null,
        supervisor_response: null,
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
        if (data.supervisor_response) {
            res.supervisor_response = data.supervisor_response;
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
        botRequest: BotRequest,
    ): AsyncGenerator<StreamUpdate> {
        // Convert Message[] to MessageHistory[]
        const messageHistory: MessageHistory[] = botRequest.history.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
        }));

        const requestBody = {
            message: botRequest.message,
            history: messageHistory,
        };

        yield* makeStreamRequest('/api/bot/stream', requestBody, 'POST');
    },



}; 