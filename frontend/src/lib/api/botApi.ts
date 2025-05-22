import { Message, ChatResponse, BotRequest } from '../../types/bot';
import { makeStreamRequest, StreamUpdate } from './streamUtils';


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
        const messageHistory: Message[] = botRequest.history;

        const requestBody = {
            message: botRequest.message,
            history: messageHistory,
        };

        yield* makeStreamRequest('/api/bot/stream', requestBody, 'POST');
    },



}; 