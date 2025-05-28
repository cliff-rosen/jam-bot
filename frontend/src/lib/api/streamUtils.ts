import settings from '../../config/settings';

export interface StreamUpdate {
    data: string;
}

// Add this to store the handleSessionExpired callback
let sessionExpiredHandler: (() => void) | null = null;

export const setStreamSessionExpiredHandler = (handler: () => void) => {
    sessionExpiredHandler = handler;
};

export async function* makeStreamRequest(endpoint: string, params: Record<string, any>, method: 'GET' | 'POST' = 'GET'): AsyncGenerator<StreamUpdate> {
    const queryString = Object.entries(params)
        .map(([key, value]) => {
            if (Array.isArray(value) || method === 'POST' || typeof value !== 'string') {
                // For arrays, objects, or POST requests, use POST with JSON body
                return null;
            }
            return `${key}=${encodeURI(value)}`;
        })
        .filter(Boolean)
        .join('&');

    const token = localStorage.getItem('authToken');
    const hasComplexParams = Object.values(params).some(value => Array.isArray(value) || typeof value !== 'string');
    const usePost = method === 'POST' || hasComplexParams;

    const response = await fetch(
        `${settings.apiUrl}${endpoint}${!usePost && queryString ? `?${queryString}` : ''}`,
        {
            method: usePost ? 'POST' : 'GET',
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(usePost ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(usePost ? { body: JSON.stringify(params) } : {}),
        }
    );

    if (!response.ok) {
        // Handle authentication/authorization errors
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            if (sessionExpiredHandler) {
                sessionExpiredHandler();
            }
            throw new Error('Authentication required');
        }
        throw new Error(`Stream request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Stream not available');
    }

    const decoder = new TextDecoder();

    try {
        console.log("Streaming response loop starting, waiting for data...");
        while (true) {
            const { done, value } = await reader.read();
            console.log("Stream read, done:", done);
            if (done) {
                console.log("Stream ended, flushing remaining data...");
                const final = decoder.decode(); // Flush any remaining bytes
                if (final) yield { data: final };
                break;
            }

            const decoded = decoder.decode(value, { stream: true });
            if (decoded) yield { data: decoded };
        }
    } finally {
        reader.releaseLock();
    }
} 