import React, { useState } from 'react';
import { Hop, ToolStep, ExecutionStatus } from '@/types/workflow';
import { Asset } from '@/types/asset';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { getExecutionStatusDisplay, getStatusBadgeClass } from '@/utils/statusUtils';
import { toolsApi } from '@/lib/api/toolsApi';

interface CurrentHopDetailsProps {
    hop: Hop;
    className?: string;
    onHopUpdate?: (updatedHop: Hop, updatedMissionOutputs: Map<string, Asset>) => void;
}

export const CurrentHopDetails: React.FC<CurrentHopDetailsProps> = ({
    hop,
    className = '',
    onHopUpdate
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSteps, setShowSteps] = useState(true);
    const [showAssets, setShowAssets] = useState(false);
    const [executingStepId, setExecutingStepId] = useState<string | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);

    const statusDisplay = getExecutionStatusDisplay(hop.status);
    const completedSteps = hop.steps?.filter(step => step.status === ExecutionStatus.COMPLETED).length || 0;
    const totalSteps = hop.steps?.length || 0;

    const executeToolStep = async (step: ToolStep) => {
        console.log("Executing tool step:", step);
        setExecutingStepId(step.id);
        setExecutionError(null);

        try {
            const result = await toolsApi.executeTool(step.tool_id, step, hop.state);
            console.log("Result:", result);

            if (result.success) {
                // Update hop state with execution results
                const updatedHop = {
                    ...hop,
                    state: result.hop_state
                };

                // Check if any updated assets are mapped to mission outputs
                const updatedMissionOutputs = new Map<string, Asset>();
                for (const [hopAssetKey, asset] of Object.entries(result.hop_state)) {
                    // If this hop asset is mapped to a mission output
                    const missionOutputId = hop.output_mapping[hopAssetKey];
                    if (missionOutputId) {
                        updatedMissionOutputs.set(missionOutputId, asset);
                    }
                }

                // Call onHopUpdate with both hop and mission updates
                if (onHopUpdate) {
                    onHopUpdate(updatedHop, updatedMissionOutputs);
                }
            } else {
                setExecutionError(result.errors.join('\n'));
            }
        } catch (error) {
            console.error("Error executing tool step:", error);
            setExecutionError(error instanceof Error ? error.message : 'Failed to execute tool step');
        } finally {
            setExecutingStepId(null);
        }
    };

    return (
        <div className={`space-y-4 mb-8 ${className}`}>
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {hop.name}
                        </h3>
                        {hop.is_final && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                                Final
                            </span>
                        )}
                        <span className={`${getStatusBadgeClass(statusDisplay.color)} flex items-center gap-1 text-xs`}>
                            {statusDisplay.icon}
                            {statusDisplay.text}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                    {hop.description}
                </p>

                {totalSteps > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Progress</span>
                            <span>{completedSteps}/{totalSteps}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-1">
                            <div
                                className="bg-blue-500 h-1 rounded transition-all"
                                style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="space-y-4 text-xs">
                    {/* Inputs/Outputs */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Inputs</div>
                            {Object.keys(hop.input_mapping || {}).length > 0 ? (
                                Object.entries(hop.input_mapping).map(([localKey, assetId]) => {
                                    const asset = hop.state?.[localKey];
                                    const assetName = asset?.name || `Asset ${assetId}`;
                                    const tooltipText = [
                                        `Hop Variable: ${localKey}`,
                                        `Asset ID: ${assetId}`,
                                        `Asset Name: ${assetName}`,
                                        asset?.description ? `Description: ${asset.description}` : null,
                                        asset?.schema ? `Type: ${asset.schema.type}${asset.is_collection ? ` (${asset.collection_type})` : ''}` : null
                                    ].filter(Boolean).join('\n');

                                    return (
                                        <div
                                            key={localKey}
                                            className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-help transition-colors"
                                            title={tooltipText}
                                        >
                                            {assetName}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-gray-400">None</div>
                            )}
                        </div>

                        <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Outputs</div>
                            {Object.keys(hop.output_mapping || {}).length > 0 ? (
                                Object.entries(hop.output_mapping).map(([localKey, assetId]) => {
                                    const asset = hop.state?.[localKey];
                                    const assetName = asset?.name || `Asset ${assetId}`;
                                    const tooltipText = [
                                        `Hop Variable: ${localKey}`,
                                        `Asset ID: ${assetId}`,
                                        `Asset Name: ${assetName}`,
                                        asset?.description ? `Description: ${asset.description}` : null,
                                        asset?.schema ? `Type: ${asset.schema.type}${asset.is_collection ? ` (${asset.collection_type})` : ''}` : null
                                    ].filter(Boolean).join('\n');

                                    return (
                                        <div
                                            key={localKey}
                                            className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-help transition-colors"
                                            title={tooltipText}
                                        >
                                            {assetName}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-gray-400">None</div>
                            )}
                        </div>
                    </div>

                    {/* Steps */}
                    {hop.steps && hop.steps.length > 0 && (
                        <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Steps</div>
                                <button
                                    onClick={() => setShowSteps(!showSteps)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    {showSteps ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            {showSteps && (
                                <div className="space-y-2">
                                    {hop.steps.map((step, index) => {
                                        const stepStatus = getExecutionStatusDisplay(step.status);

                                        return (
                                            <div key={step.id || index} className="border-l-2 border-gray-300 pl-3 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                        {index + 1}. {step.tool_id}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {step.status !== ExecutionStatus.COMPLETED && (
                                                            <button
                                                                onClick={() => executeToolStep(step)}
                                                                disabled={executingStepId === step.id}
                                                                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${executingStepId === step.id
                                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                                    }`}
                                                            >
                                                                {executingStepId === step.id ? (
                                                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <Play className="w-3 h-3" />
                                                                )}
                                                                Execute
                                                            </button>
                                                        )}
                                                        <span className={`${getStatusBadgeClass(stepStatus.color)} text-xs`}>
                                                            {stepStatus.text}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-gray-500">{step.description}</div>

                                                {step.parameter_mapping && Object.keys(step.parameter_mapping).length > 0 && (
                                                    <div className="ml-3 space-y-0.5">
                                                        <div className="text-xs font-medium text-gray-600">Inputs</div>
                                                        {Object.entries(step.parameter_mapping).map(([param, mapping]) => {
                                                            if (mapping.type === "literal") {
                                                                // Handle date range objects
                                                                let displayValue = mapping.value;
                                                                if (mapping.value && typeof mapping.value === 'object' && 'start_date' in mapping.value && 'end_date' in mapping.value) {
                                                                    displayValue = `${mapping.value.start_date} to ${mapping.value.end_date}`;
                                                                }
                                                                return (
                                                                    <div key={param} className="text-xs text-gray-500">
                                                                        <span className="text-blue-600 dark:text-blue-400">{param}:</span>
                                                                        <span className="ml-1">{displayValue}</span>
                                                                    </div>
                                                                );
                                                            } else if (mapping.type === "asset_field") {
                                                                const asset = hop.state?.[mapping.state_asset];
                                                                const assetName = asset?.name || `${mapping.state_asset} (name not available)`;
                                                                const tooltipText = [
                                                                    `Parameter: ${param}`,
                                                                    `Hop Variable: ${mapping.state_asset}`,
                                                                    mapping.path ? `Path: ${mapping.path}` : null,
                                                                    asset?.name ? `Asset Name: ${asset.name}` : null,
                                                                    asset?.description ? `Description: ${asset.description}` : null
                                                                ].filter(Boolean).join('\n');

                                                                return (
                                                                    <div key={param} className="text-xs text-gray-500">
                                                                        <span className="text-blue-600 dark:text-blue-400">{param}:</span>
                                                                        <span
                                                                            className="ml-1 hover:text-blue-600 dark:hover:text-blue-400 cursor-help transition-colors"
                                                                            title={tooltipText}
                                                                        >
                                                                            {asset?.name || 'Unknown Asset'}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </div>
                                                )}

                                                {step.result_mapping && Object.keys(step.result_mapping).length > 0 && (
                                                    <div className="ml-3 space-y-0.5">
                                                        <div className="text-xs font-medium text-gray-600">Outputs</div>
                                                        {Object.entries(step.result_mapping).map(([result, assetId]) => {
                                                            const asset = hop.state?.[assetId];
                                                            const assetName = asset?.name || `${assetId} (name not available)`;
                                                            const tooltipText = [
                                                                `Result: ${result}`,
                                                                `Hop Variable: ${assetId}`,
                                                                asset?.name ? `Asset Name: ${asset.name}` : null,
                                                                asset?.description ? `Description: ${asset.description}` : null
                                                            ].filter(Boolean).join('\n');

                                                            return (
                                                                <div key={result} className="text-xs text-gray-500">
                                                                    <span className="text-green-600 dark:text-green-400">{result}:</span>
                                                                    <span
                                                                        className="ml-1 hover:text-green-600 dark:hover:text-green-400 cursor-help transition-colors"
                                                                        title={tooltipText}
                                                                    >
                                                                        {assetName || 'Unknown Asset'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {step.error && (
                                                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-1 rounded">
                                                        Error: {step.error}
                                                    </div>
                                                )}

                                                {executionError && executingStepId === step.id && (
                                                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-1 rounded mt-1">
                                                        {executionError}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assets */}
                    {hop.state && Object.keys(hop.state).length > 0 && (
                        <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Assets ({Object.keys(hop.state).length})
                                </div>
                                <button
                                    onClick={() => setShowAssets(!showAssets)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    {showAssets ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            {showAssets && (
                                <div className="space-y-1">
                                    {Object.entries(hop.state).map(([key, asset]) => (
                                        <div key={key} className="text-xs">
                                            <div className="text-gray-700 dark:text-gray-300">
                                                <span className="text-blue-600 dark:text-blue-400">{key}:</span> {asset.name}
                                            </div>
                                            <div className="text-gray-500 ml-2">
                                                {asset.schema?.type}{asset.is_collection ? ` (${asset.collection_type})` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="flex gap-4 text-xs text-gray-500">
                        <span>Resolved: {hop.is_resolved ? 'Yes' : 'No'}</span>
                        <span>Created: {new Date(hop.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrentHopDetails; 