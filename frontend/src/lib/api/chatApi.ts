import { ChatRequest, ChatMessage, AgentResponse, StatusResponse, StreamResponse, StreamParseResult } from '../../types/chat';
import { makeStreamRequest, StreamUpdate } from './streamUtils';
import { api } from './index';


export function parseStreamLine(line: string): StreamParseResult {
    if (!line.startsWith('data: ')) {
        return {
            response: {
                token: null,
                status: null,
                error: null,
                response_text: null,
                payload: null,
                debug: null
            },
            isValid: false,
            parseError: 'Invalid data line format'
        };
    }

    const jsonStr = line.slice(6);

    try {
        const data = JSON.parse(jsonStr);

        // Determine if this is an AgentResponse or StatusResponse
        const isStatusResponse = data.status && !data.token && !data.response_text;

        if (isStatusResponse) {
            const statusResponse: StatusResponse = {
                status: data.status || null,
                payload: data.payload || null,
                error: data.error || null,
                debug: data.debug || null
            };
            return {
                response: statusResponse,
                isValid: true
            };
        } else {
            const agentResponse: AgentResponse = {
                token: data.token || null,
                response_text: data.response_text || null,
                payload: data.payload || null,
                status: data.status || null,
                error: data.error || null,
                debug: data.debug || null
            };
            return {
                response: agentResponse,
                isValid: true
            };
        }
    } catch (e) {
        return {
            response: {
                token: null,
                status: null,
                error: e instanceof Error ? e.message : String(e),
                response_text: null,
                payload: null,
                debug: null
            },
            isValid: false,
            parseError: e instanceof Error ? e.message : String(e)
        };
    }
}

// Keep the old function for backward compatibility
export function getDataFromLine(line: string): AgentResponse {
    const result = parseStreamLine(line);
    return result.response as AgentResponse; // Cast for backward compatibility
}


export const chatApi = {

    streamMessage: async function* (
        chatRequest: ChatRequest,
    ): AsyncGenerator<StreamUpdate> {
        try {
            yield* makeStreamRequest('/api/chat/stream', chatRequest, 'POST');
        } catch (error) {
            // Yield an error update if the stream fails
            const errorUpdate: StreamUpdate = {
                data: `data: ${JSON.stringify({
                    error: error instanceof Error ? error.message : String(error),
                    status: 'stream_error'
                })}\n`
            };
            yield errorUpdate;
        }
    },

    // New helper function for parsing stream responses
    parseStreamResponse: async function* (
        streamGenerator: AsyncGenerator<StreamUpdate>
    ): AsyncGenerator<StreamParseResult> {
        for await (const update of streamGenerator) {
            const lines = update.data.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                yield parseStreamLine(line);
            }
        }
    },

    getMessages: async function (chatId: string): Promise<{ messages: ChatMessage[] }> {
        const response = await api.get(`/api/chat/${chatId}/messages`);
        return response.data;
    },



}; 