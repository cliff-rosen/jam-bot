import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Agent } from '@/components/fractal-bot/types/state';
import EmailSearchButton from './EmailSearchButton';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFractalBot } from '@/context/FractalBotContext';
import { Button } from '@/components/ui/button';
import { Pencil, Save } from 'lucide-react';

interface EmailSearchAgentProps {
    agent: Agent;
}

interface DateRange {
    start: string | null;
    end: string | null;
}

interface AgentMetadata {
    searchParams?: {
        operation?: string;
        folders?: string[];
        query_terms?: string[];
        max_results?: number;
        date_range?: DateRange;
        include_attachments?: boolean;
        include_metadata?: boolean;
    };
    progress?: number;
    createdAt?: string;
    estimatedCompletion?: string;
}

export default function EmailSearchAgent({ agent }: EmailSearchAgentProps) {
    const { updateAgent } = useFractalBot();
    const [isEditing, setIsEditing] = useState(false);

    // Extract parameters from both metadata.searchParams and input_parameters
    const searchParams = (agent.metadata as AgentMetadata)?.searchParams || {};
    const inputParams = agent.input_parameters || {};

    // Combine parameters, preferring input_parameters if they exist
    const [operation, setOperation] = useState(inputParams.operation || searchParams.operation || 'get_messages');
    const [folders, setFolders] = useState(inputParams.folders || searchParams.folders || []);
    const [queryTerms, setQueryTerms] = useState(inputParams.query_terms || searchParams.query_terms || []);
    const [maxResults, setMaxResults] = useState(inputParams.max_results || searchParams.max_results || 100);
    const [dateRange, setDateRange] = useState<DateRange>(inputParams.date_range || searchParams.date_range || { start: null, end: null });
    const [includeAttachments, setIncludeAttachments] = useState(inputParams.include_attachments ?? searchParams.include_attachments ?? false);
    const [includeMetadata, setIncludeMetadata] = useState(inputParams.include_metadata ?? searchParams.include_metadata ?? true);

    const handleSave = () => {
        const updatedParams = {
            operation,
            folders,
            query_terms: queryTerms,
            max_results: maxResults,
            date_range: dateRange,
            include_attachments: includeAttachments,
            include_metadata: includeMetadata
        };

        updateAgent(agent.agent_id, {
            input_parameters: updatedParams,
            metadata: {
                ...agent.metadata,
                progress: agent.metadata?.progress,
                createdAt: agent.metadata?.createdAt,
                estimatedCompletion: agent.metadata?.estimatedCompletion
            }
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        // Reset to original values from either input_parameters or searchParams
        setOperation(inputParams.operation || 'get_messages');
        setFolders(inputParams.folders || []);
        setQueryTerms(inputParams.query_terms || []);
        setMaxResults(inputParams.max_results || 100);
        setDateRange(inputParams.date_range || { start: null, end: null });
        setIncludeAttachments(inputParams.include_attachments ?? false);
        setIncludeMetadata(inputParams.include_metadata ?? true);
        setIsEditing(false);
    };

    return (
        <Card className="w-full bg-white dark:bg-gray-800">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                    <span>Email Search Agent</span>
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
                        <EmailSearchButton
                            agentId={agent.agent_id}
                            operation={operation}
                            searchParams={{
                                folders,
                                query_terms: queryTerms,
                                max_results: maxResults,
                                include_attachments: includeAttachments,
                                include_metadata: includeMetadata
                            }}
                        />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Operation Details</h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 space-y-2 text-sm">
                            <div className="grid grid-cols-3 gap-2">
                                <Label className="text-gray-500 dark:text-gray-400">Operation:</Label>
                                {isEditing ? (
                                    <select
                                        className="col-span-2 bg-white dark:bg-gray-800 border rounded px-2 py-1"
                                        value={operation}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOperation(e.target.value)}
                                    >
                                        <option value="get_messages">Get Messages</option>
                                        <option value="list_labels">List Labels</option>
                                    </select>
                                ) : (
                                    <span className="col-span-2 text-gray-900 dark:text-white">{operation}</span>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Label className="text-gray-500 dark:text-gray-400">Folders:</Label>
                                {isEditing ? (
                                    <Input
                                        className="col-span-2"
                                        value={folders.join(', ')}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFolders(e.target.value.split(',').map((f: string) => f.trim()).filter(Boolean))}
                                        placeholder="INBOX, SENT, etc. (comma-separated)"
                                    />
                                ) : (
                                    <span className="col-span-2 text-gray-900 dark:text-white">
                                        {folders.length > 0 ? folders.join(', ') : 'All folders'}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Label className="text-gray-500 dark:text-gray-400">Search Terms:</Label>
                                {isEditing ? (
                                    <Input
                                        className="col-span-2"
                                        value={queryTerms.join(', ')}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQueryTerms(e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                                        placeholder="Search terms (comma-separated)"
                                    />
                                ) : (
                                    <span className="col-span-2 text-gray-900 dark:text-white">
                                        {queryTerms.length > 0 ? queryTerms.join(', ') : 'None'}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Label className="text-gray-500 dark:text-gray-400">Max Results:</Label>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        className="col-span-2"
                                        value={maxResults}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxResults(parseInt(e.target.value) || 100)}
                                        min={1}
                                        max={500}
                                    />
                                ) : (
                                    <span className="col-span-2 text-gray-900 dark:text-white">{maxResults}</span>
                                )}
                            </div>
                            {dateRange && (
                                <div className="grid grid-cols-3 gap-2">
                                    <Label className="text-gray-500 dark:text-gray-400">Date Range:</Label>
                                    {isEditing ? (
                                        <div className="col-span-2 space-y-2">
                                            <Input
                                                type="date"
                                                value={dateRange.start ? new Date(dateRange.start).toISOString().split('T')[0] : ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                                            />
                                            <Input
                                                type="date"
                                                value={dateRange.end ? new Date(dateRange.end).toISOString().split('T')[0] : ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                                            />
                                        </div>
                                    ) : (
                                        <span className="col-span-2 text-gray-900 dark:text-white">
                                            {dateRange.start && `From: ${new Date(dateRange.start).toLocaleDateString()}`}
                                            {dateRange.end && ` To: ${new Date(dateRange.end).toLocaleDateString()}`}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                                <Label className="text-gray-500 dark:text-gray-400">Include:</Label>
                                {isEditing ? (
                                    <div className="col-span-2 space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={includeAttachments}
                                                onCheckedChange={setIncludeAttachments}
                                            />
                                            <Label>Attachments</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={includeMetadata}
                                                onCheckedChange={setIncludeMetadata}
                                            />
                                            <Label>Metadata</Label>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="col-span-2 text-gray-900 dark:text-white">
                                        {[
                                            includeAttachments && 'Attachments',
                                            includeMetadata && 'Metadata'
                                        ].filter(Boolean).join(', ') || 'Basic content only'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3">
                            <p className="text-sm text-gray-900 dark:text-white">
                                {agent.status}
                                {(agent.metadata as AgentMetadata)?.progress !== undefined && (
                                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                                        ({(agent.metadata as AgentMetadata).progress}% complete)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 