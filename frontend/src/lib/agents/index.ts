import { agentRegistry } from './registry';
import { EmailAccessAgentExecutor } from './executors/emailAccessAgent';
import { EmailLabelsAgentExecutor } from './executors/emailLabelsAgent';
import { EmailMessageAgentExecutor } from './executors/emailMessageAgent';
import { EmailSummarizerAgentExecutor } from './executors/emailSummarizerAgent';
import { EmailListSummarizerAgentExecutor } from './executors/emailListSummarizerAgent';
import { LLMAssetAgentExecutor } from './executors/llmAssetAgent';


// Register all agent executors
export function registerAgentExecutors() {
    // Register email access agents
    agentRegistry.registerExecutor(new EmailAccessAgentExecutor());
    agentRegistry.registerExecutor(new EmailLabelsAgentExecutor());
    agentRegistry.registerExecutor(new EmailMessageAgentExecutor());

    // Register email summarizer agents
    agentRegistry.registerExecutor(new EmailSummarizerAgentExecutor());
    agentRegistry.registerExecutor(new EmailListSummarizerAgentExecutor());

    // Register LLM asset agent
    agentRegistry.registerExecutor(new LLMAssetAgentExecutor());

    // Add more agent registrations here as they are implemented
}

// Export the registry for use in other parts of the application
export { agentRegistry } from './registry';
export * from './types'; 