import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, Card, Typography, CircularProgress, Alert } from '@mui/material';
import { PlayArrow, Error } from '@mui/icons-material';
import { Hop, ToolStep, Asset } from '../types/workflow';
import { toolsApi, ToolDefinition, ToolExecutionResult } from '../api/toolsApi';

interface HopDetailProps {
    hop: Hop;
    onHopUpdate: (updatedHop: Hop) => void;
}

export const HopDetail: React.FC<HopDetailProps> = ({ hop, onHopUpdate }) => {
    const [availableTools, setAvailableTools] = useState<ToolDefinition[]>([]);
    const [executingStep, setExecutingStep] = useState<string | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAvailableTools();
    }, []);

    const loadAvailableTools = async () => {
        try {
            const tools = await toolsApi.getAvailableTools();
            setAvailableTools(tools);
        } catch (error) {
            console.error('Failed to load tools:', error);
        }
    };

    const executeToolStep = async (step: ToolStep) => {
        setExecutingStep(step.id);
        setExecutionError(null);
        setLoading(true);

        try {
            const result = await toolsApi.executeTool(step.tool_id, step, hop.state);

            if (result.success) {
                // Update hop state with execution results
                const updatedHop = {
                    ...hop,
                    state: result.hop_state
                };
                onHopUpdate(updatedHop);
            } else {
                setExecutionError(result.errors.join('\n'));
            }
        } catch (error) {
            setExecutionError(error instanceof Error ? error.message : 'Failed to execute tool step');
        } finally {
            setLoading(false);
            setExecutingStep(null);
        }
    };

    const getToolDefinition = (toolId: string): ToolDefinition | undefined => {
        return availableTools.find(tool => tool.id === toolId);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                {hop.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                {hop.description}
            </Typography>

            {executionError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {executionError}
                </Alert>
            )}

            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Tool Steps
                </Typography>

                {hop.steps.map((step) => {
                    const toolDef = getToolDefinition(step.tool_id);
                    return (
                        <Card key={step.id} sx={{ p: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="subtitle1">
                                        {toolDef?.name || step.tool_id}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {step.description}
                                    </Typography>
                                </Box>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={loading && executingStep === step.id ? <CircularProgress size={20} /> : <PlayArrow />}
                                    onClick={() => executeToolStep(step)}
                                    disabled={loading || step.status === 'completed'}
                                >
                                    {step.status === 'completed' ? 'Completed' : 'Execute'}
                                </Button>
                            </Box>

                            {step.error && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                    {step.error}
                                </Alert>
                            )}

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2">Parameters:</Typography>
                                <pre style={{ margin: 0, padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                    {JSON.stringify(step.parameter_mapping, null, 2)}
                                </pre>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2">Results:</Typography>
                                <pre style={{ margin: 0, padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                    {JSON.stringify(step.result_mapping, null, 2)}
                                </pre>
                            </Box>
                        </Card>
                    );
                })}
            </Box>
        </Box>
    );
}; 