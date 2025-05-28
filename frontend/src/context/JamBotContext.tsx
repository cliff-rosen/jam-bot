import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { chatApi, getDataFromLine } from '@/lib/api/chatApi';
import { ChatMessage, AgentResponse, ChatRequest, MessageRole } from '@/types/chat';
import { Mission, WorkflowStatus, defaultMission } from '@/types/workflow';
import { CollabAreaState } from '@/types/collabArea';
import { assetApi } from '@/lib/api/assetApi';
import { Asset, AssetType } from '@/types/asset';

interface JamBotState {
    currentMessages: ChatMessage[];
    currentStreamingMessage: string;
    collabArea: CollabAreaState;
    assets: Asset[];
    mission: Mission;
}

type JamBotAction =
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_STREAMING_MESSAGE'; payload: string }
    | { type: 'SEND_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_COLLAB_AREA'; payload: CollabAreaState }
    | { type: 'SET_ASSETS'; payload: Asset[] }
    | { type: 'SET_MISSION'; payload: Mission };

const initialState: JamBotState = {
    currentMessages: [],
    currentStreamingMessage: '',
    collabArea: {
        type: 'default',
        content: null
    },
    assets: [],
    mission: defaultMission
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
        case 'SET_ASSETS':
            return {
                ...state,
                assets: action.payload
            };
        case 'SET_MISSION':
            return {
                ...state,
                mission: action.payload
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

    useEffect(() => {
        const fetchAssets = async () => {
            const fetchedAssets = await assetApi.getAssets();
            dispatch({ type: 'SET_ASSETS', payload: fetchedAssets });
        };
        fetchAssets();
    }, []);

    const addMessage = useCallback((message: ChatMessage) => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
    }, []);

    const updateStreamingMessage = useCallback((message: string) => {
        dispatch({ type: 'UPDATE_STREAMING_MESSAGE', payload: message });
    }, []);

    const createPlaceholderAsset = (name: string, description: string, isInput: boolean): Asset => {
        return {
            id: `${name.toLowerCase().replace(/\s+/g, '-')}-${isInput ? 'input' : 'output'}`,
            name,
            description,
            type: AssetType.PRIMITIVE,
            is_collection: false,
            content: null,
            asset_metadata: {
                is_placeholder: true,
                is_input: isInput
            }
        };
    };

    const processBotMessage = useCallback((data: AgentResponse) => {
        console.log("data", data);

        if (data.mission_response) {
            const response = data.mission_response.response_content;
            const newMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: MessageRole.ASSISTANT,
                content: response,
                timestamp: new Date().toISOString()
            };
            addMessage(newMessage);

            if (data.mission_response.response_type === "MISSION_DEFINITION" &&
                data.mission_response.mission_proposal) {
                const mission = data.mission_response.mission_proposal;

                // Create placeholder assets for inputs and outputs
                const inputAssets = mission.required_inputs.map(input =>
                    createPlaceholderAsset(input, `Required input for ${mission.title}`, true)
                );
                const outputAssets = mission.expected_outputs.map(output =>
                    createPlaceholderAsset(output, `Expected output for ${mission.title}`, false)
                );

                const newMission: Mission = {
                    id: mission.title.toLowerCase().replace(/\s+/g, '-'),
                    name: mission.title,
                    description: mission.goal,
                    goal: mission.goal,
                    success_criteria: mission.success_criteria,
                    inputs: inputAssets,
                    outputs: outputAssets,
                    possible_stage_sequence: mission.possible_stage_sequence,
                    status: WorkflowStatus.PENDING,
                    workflows: [],
                    metadata: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                dispatch({ type: 'SET_MISSION', payload: newMission });
            }
        }

        if (data.supervisor_payload) {
            console.log("supervisor_payload", data.supervisor_payload);
            // set collab area to document
            dispatch({ type: 'SET_COLLAB_AREA', payload: { type: 'object', content: data } });
        }

        // Handle streaming content
        if (data.status) {
            console.log("updating status", data.status);
            updateStreamingMessage(data.status);
        }

        // Return the token content for accumulation
        return data.token || "";
    }, [addMessage, updateStreamingMessage]);

    const sendMessage = useCallback(async (message: ChatMessage) => {
        addMessage(message);
        let finalContent = '';
        let streamingContent = '';

        try {
            // Convert ChatMessage[] to Message[]
            const messages: ChatMessage[] = state.currentMessages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }));

            const chatRequest: ChatRequest = {
                message: message.content,
                history: messages,
                payload: {
                    mission: state.mission,
                    assets: state.assets
                }
            };

            for await (const update of chatApi.streamMessage(chatRequest)) {
                const lines = update.data.split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue; // Skip empty lines
                    const data = getDataFromLine(line);
                    const token = processBotMessage(data);
                    if (token) {
                        streamingContent += token;
                        // Update UI immediately after each token
                        updateStreamingMessage(streamingContent);
                        finalContent += token;
                    }
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
            addMessage(finalMessage);

        } catch (error) {
            console.error('Error streaming message:', error);
        } finally {
            updateStreamingMessage('');
        }
    }, [state, addMessage, processBotMessage, updateStreamingMessage]);

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
};
