import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { useFractalBot } from '@/context/FractalBotContext';

interface EmailListSummarizerButtonProps {
    agentId: string;
}

export default function EmailListSummarizerButton({ agentId }: EmailListSummarizerButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { executeAgent, state } = useFractalBot();

    const handleApprove = async () => {
        console.log('EmailListSummarizerButton: handleApprove');
        if (!agentId) return;

        setIsLoading(true);

        try {
            // Get the current agent state
            const currentAgent = state.agents[agentId];
            if (!currentAgent) {
                console.error('Agent not found:', agentId);
                return;
            }

            // Execute the agent with current input parameters
            await executeAgent(agentId);
        } catch (error) {
            console.error('Error executing agent:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleApprove}
            disabled={isLoading}
            variant="secondary"
            size="sm"
        >
            <Check className="h-4 w-4 mr-2" />
            {isLoading ? 'Processing...' : 'Approve & Run'}
        </Button>
    );
} 