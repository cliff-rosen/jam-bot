import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useFractalBot } from '@/context/FractalBotContext';
import { EmailSearchParams } from '@/lib/api/emailApi';

interface EmailSearchButtonProps {
    agentId: string;
    operation: string;
    searchParams: EmailSearchParams;
}

export default function EmailSearchButton({ agentId, operation, searchParams }: EmailSearchButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { executeAgent, updateAgent, state } = useFractalBot();

    const handleOperation = async () => {
        if (!agentId) return;

        setIsLoading(true);

        try {
            // Get the current agent state
            const currentAgent = state.agents[agentId];
            if (!currentAgent) {
                console.error('Agent not found:', agentId);
                return;
            }

            // Update the agent with current parameters
            updateAgent(agentId, {
                input_parameters: {
                    ...currentAgent.input_parameters,
                    ...searchParams,
                    operation
                }
            });

            // Execute the agent
            await executeAgent(agentId);
        } catch (error) {
            console.error('Error executing agent:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleOperation}
            disabled={isLoading}
            variant="secondary"
            size="sm"
        >
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? 'Running...' : 'Run'}
        </Button>
    );
} 