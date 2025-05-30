import { ChatRequest, AgentResponse } from '../../types/chat';
import { makeStreamRequest, StreamUpdate } from './streamUtils';
import { api } from './index';
import { ChatMessage } from '@/types/chat';


export function getDataFromLine(line: string): AgentResponse {
    const res: AgentResponse = {
        token: null,
        status: null,
        error: null,
        response_text: null,
        payload: null,
        debug: null
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
        if (data.response_text) {
            res.response_text = data.response_text;
        }
        if (data.payload) {
            res.payload = data.payload;
        }
        if (data.status) {
            res.status = data.status;
        }
        if (data.error) {
            res.error = data.error;
        }
        if (data.debug) {
            res.debug = data.debug;
        }
    } catch (e) {
        res.error = e instanceof Error ? e.message : String(e);
    }

    return res;
}


export const invokeLLM = async (messages: ChatMessage[], model: string): Promise<string> => {
    const response = await api.post('/api/chat/llm', {
        messages,
        model,
        stream: false,
        provider: 'openai'  // Default to OpenAI provider
    });
    return response.data.message.content;
}


export const chatApi = {

    streamMessage: async function* (
        chatRequest: ChatRequest,
    ): AsyncGenerator<StreamUpdate> {

        yield* makeStreamRequest('/api/chat/stream', chatRequest, 'POST');
    },



}; 