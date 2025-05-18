import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Agent } from '@/components/fractal-bot/types/state';
import { useState } from 'react';
import { useFractalBot } from '@/context/FractalBotContext';
import { Button } from '@/components/ui/button';
import { Pencil, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import EmailListSummarizerButton from './EmailListSummarizerButton';
import { AgentStatus } from '@/types/agent';

interface EmailListSummarizerAgentProps {
    agentId: string;
}

export default function EmailListSummarizerAgent({ agentId }: EmailListSummarizerAgentProps) {
    const { state, updateAgent } = useFractalBot();
    const agent = state.agents[agentId];
    const [isEditing, setIsEditing] = useState(false);
    const [maxEmails, setMaxEmails] = useState(agent?.input_parameters?.max_emails || 10);
    const [includeMetadata, setIncludeMetadata] = useState(agent?.input_parameters?.include_metadata || true);

    if (!agent) {
        return <div>Agent not found</div>;
    }

    const handleSave = () => {
        updateAgent(agentId, {
            input_parameters: {
                max_emails: maxEmails,
                include_metadata: includeMetadata
            }
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setMaxEmails(agent.input_parameters?.max_emails || 10);
        setIncludeMetadata(agent.input_parameters?.include_metadata || true);
        setIsEditing(false);
    };

    return (
        <Card className="w-full bg-white dark:bg-gray-800">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                    <span>Email List Summarizer</span>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        )}
                        {(agent.status === AgentStatus.IDLE || true) && (
                            <EmailListSummarizerButton agentId={agentId} />
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Operation Details</h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="maxEmails">Maximum Emails to Summarize</Label>
                                    <Input
                                        id="maxEmails"
                                        type="number"
                                        value={maxEmails}
                                        onChange={(e) => setMaxEmails(Number(e.target.value))}
                                        min={1}
                                        max={100}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="includeMetadata"
                                        checked={includeMetadata}
                                        onCheckedChange={setIncludeMetadata}
                                        disabled={!isEditing}
                                    />
                                    <Label htmlFor="includeMetadata">Include Email Metadata</Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Input Asset Section */}
                    {agent.input_asset_ids?.[0] && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Input Asset</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3">
                                <p className="text-sm text-gray-900 dark:text-white">
                                    Email List Asset
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Output Asset Section */}
                    {agent.output_asset_ids?.[0] && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Output Asset</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3">
                                <p className="text-sm text-gray-900 dark:text-white">
                                    Email Summaries List
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Status Section */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3">
                            <p className="text-sm text-gray-900 dark:text-white">
                                {agent.status}
                                {agent.metadata?.progress !== undefined && (
                                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                                        ({agent.metadata.progress}% complete)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Error Section */}
                    {agent.metadata?.lastError && (
                        <div>
                            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Error</h4>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {agent.metadata.lastError}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
} 