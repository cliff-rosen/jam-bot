import { ChatRequest, AgentResponse } from '../../types/chat';
import { makeStreamRequest, StreamUpdate } from './streamUtils';



export function getDataFromLine(line: string): AgentResponse {
    const res: AgentResponse = {
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


export const chatApi = {

    streamMessage: async function* (
        chatRequest: ChatRequest,
    ): AsyncGenerator<StreamUpdate> {

        yield* makeStreamRequest('/api/bot/stream', chatRequest, 'POST');
    },



}; 