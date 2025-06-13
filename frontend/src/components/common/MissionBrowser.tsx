import React, { useState } from 'react';
import { Mission, Hop, ToolStep } from '@/types/workflow';
import { VariableRenderer } from '@/components/common/VariableRenderer';

interface MissionBrowserProps {
    mission: Mission | null;
    className?: string;
}

export const MissionBrowser: React.FC<MissionBrowserProps> = ({ mission, className = '' }) => {
    if (!mission) {
        return <div className={className}>No mission loaded.</div>;
    }
    const [hoveredAssetIds, setHoveredAssetIds] = useState<string[]>([]);

    console.log(mission);

    // Helper to check if a mapping row should be hot
    const isMappingHot = (assetId: string) => hoveredAssetIds.includes(assetId);
    // Helper to check if a hop state row should be hot
    const isHopStateHot = (assetId: string) => hoveredAssetIds.includes(assetId);

    // Helper to handle hover start
    const handleHoverStart = (assetId: string, hop: Hop) => {
        const ids = [assetId];

        // If this is a mapping key, also include the mapped asset ID
        if (hop.input_mapping[assetId]) {
            ids.push(hop.input_mapping[assetId]);
        }
        if (hop.output_mapping[assetId]) {
            ids.push(hop.output_mapping[assetId]);
        }

        // If this is a hop state asset, also include any mapping keys that reference it
        const inputKeys = Object.entries(hop.input_mapping)
            .filter(([_, id]) => id === assetId)
            .map(([key]) => key);
        const outputKeys = Object.entries(hop.output_mapping)
            .filter(([_, id]) => id === assetId)
            .map(([key]) => key);

        ids.push(...inputKeys, ...outputKeys);
        setHoveredAssetIds(ids);
    };

    // Helper to handle hover end
    const handleHoverEnd = () => {
        setHoveredAssetIds([]);
    };

    // Helper to determine if an asset ID is from mission state
    const isMissionAsset = (assetId: string) => {
        return Object.keys(mission.mission_state).includes(assetId);
    };

    // Helper to get the appropriate ID color class
    const getAssetIdColorClass = (assetId: string) => {
        if (isMissionAsset(assetId)) {
            return 'text-orange-600 dark:text-orange-400'; // Adjusted for better contrast
        }
        return 'text-green-600 dark:text-green-400'; // Adjusted for better contrast
    };

    // Helper to get color class for local key based on its mapped asset
    const getLocalKeyColorClass = (key: string, hop: Hop) => {
        return 'text-green-600 dark:text-green-400'; // Adjusted for better contrast
    };

    // Helper to render resource config
    const renderResourceConfig = (config: any) => {
        return <VariableRenderer value={config} />;
    };

    // Helper to render mapping value
    const renderMappingValue = (mapping: any) => {
        if (mapping.type === 'asset_field') {
            return (
                <span className="font-mono">
                    Asset: {mapping.state_asset.slice(-8)}
                    {mapping.path && <span className="text-gray-500 dark:text-gray-400"> ({mapping.path})</span>}
                </span>
            );
        } else if (mapping.type === 'literal') {
            return <VariableRenderer value={mapping.value} />;
        } else if (mapping.type === 'discard') {
            return <span className="text-gray-500 dark:text-gray-400 italic">Discarded</span>;
        }
        return null;
    };

    // Helper to get all hops (completed + current)
    const allHops: Hop[] = [
        ...mission.hop_history,
        ...(mission.current_hop ? [mission.current_hop] : [])
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Mission Overview */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Mission Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Inputs</h4>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Name</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">ID</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Type</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Role</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Value</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mission.inputs.map((input, idx) => (
                                        <tr key={input.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{input.name}</td>
                                            <td className={`py-1 px-2 font-mono ${getAssetIdColorClass(input.id)}`}>{input.id}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{input.schema_definition.type || 'unknown'}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{input.role || 'input'}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">
                                                <VariableRenderer value={input.value} />
                                            </td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{input.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Outputs</h4>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Name</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">ID</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Type</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Role</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Value</th>
                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mission.outputs.map((output, idx) => (
                                        <tr key={output.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{output.name}</td>
                                            <td className={`py-1 px-2 font-mono ${getAssetIdColorClass(output.id)}`}>{output.id}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{output.schema_definition?.type || 'unknown'}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{output.role || 'output'}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">
                                                <VariableRenderer value={output.value} />
                                            </td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{output.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mission State */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Mission State</h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Name</th>
                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">ID</th>
                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Type</th>
                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Role</th>
                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Value</th>
                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(mission.mission_state).map(([key, asset]) => {
                                const isMapped = allHops.some(hop =>
                                    Object.values(hop.input_mapping).includes(asset.id) ||
                                    Object.values(hop.output_mapping).includes(asset.id)
                                );
                                return (
                                    <tr
                                        key={key}
                                        className={`border-b border-gray-100 dark:border-gray-700 ${isHopStateHot(asset.id) ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                        onMouseEnter={() => isMapped && handleHoverStart(asset.id, allHops[0])}
                                        onMouseLeave={handleHoverEnd}
                                    >
                                        <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{asset.name}</td>
                                        <td className={`py-1 px-2 font-mono ${getAssetIdColorClass(asset.id)}`}>{asset.id}</td>
                                        <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{asset.schema_definition?.type || 'unknown'}</td>
                                        <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{asset.role || 'intermediate'}</td>
                                        <td className="py-1 px-2 text-gray-700 dark:text-gray-200">
                                            <VariableRenderer value={asset.value} />
                                        </td>
                                        <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{asset.status}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hops */}
            {allHops.map((hop, hopIndex) => (
                <div key={hop.id}>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Hop {hopIndex + 1}: {hop.name}
                    </h3>
                    <div className="space-y-4">
                        {/* Hop Mappings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Input Mapping</h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Local Key</th>
                                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Mission Asset ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(hop.input_mapping).map(([key, assetId]) => (
                                                <tr
                                                    key={key}
                                                    className={`border-b border-gray-100 dark:border-gray-700 ${isMappingHot(assetId) ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                                    onMouseEnter={() => handleHoverStart(key, hop)}
                                                    onMouseLeave={handleHoverEnd}
                                                >
                                                    <td className={`py-1 px-2 font-mono ${getLocalKeyColorClass(key, hop)}`}>{key}</td>
                                                    <td className={`py-1 px-2 font-mono ${getAssetIdColorClass(assetId)}`}>{assetId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Output Mapping</h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Local Key</th>
                                                <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Mission Asset ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(hop.output_mapping).map(([key, assetId]) => (
                                                <tr
                                                    key={key}
                                                    className={`border-b border-gray-100 dark:border-gray-700 ${isMappingHot(assetId) ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                                    onMouseEnter={() => handleHoverStart(key, hop)}
                                                    onMouseLeave={handleHoverEnd}
                                                >
                                                    <td className={`py-1 px-2 font-mono ${getLocalKeyColorClass(key, hop)}`}>{key}</td>
                                                    <td className={`py-1 px-2 font-mono ${getAssetIdColorClass(assetId)}`}>{assetId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Hop State */}
                        <div>
                            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Hop State</h4>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Name</th>
                                            <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">ID</th>
                                            <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Type</th>
                                            <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Role</th>
                                            <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Value</th>
                                            <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(hop.hop_state).map(([key, asset]) => {
                                            const mappingRefs = Object.values(hop.input_mapping).concat(Object.values(hop.output_mapping));
                                            const isMapped = mappingRefs.includes(asset.id);
                                            return (
                                                <tr
                                                    key={key}
                                                    className={`border-b border-gray-100 dark:border-gray-700 ${isHopStateHot(asset.id) ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                                    onMouseEnter={() => handleHoverStart(asset.id, hop)}
                                                    onMouseLeave={handleHoverEnd}
                                                >
                                                    <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{asset.name}</td>
                                                    <td className={`py-1 px-2 font-mono ${getAssetIdColorClass(asset.id)}`}>{asset.id}</td>
                                                    <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{asset.schema_definition?.type || 'unknown'}</td>
                                                    <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{asset.role || 'intermediate'}</td>
                                                    <td className="py-1 px-2 text-gray-700 dark:text-gray-200">
                                                        <VariableRenderer value={asset.value} />
                                                    </td>
                                                    <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{asset.status}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tool Steps */}
                        {hop.tool_steps.map((step, stepIndex) => (
                            <div key={step.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                        Tool Step {stepIndex + 1}: {step.description}
                                    </h4>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Resource Configs */}
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Resource Configs</h5>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Resource</th>
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Config</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(step.resource_configs).map(([resource, config]) => (
                                                        <tr key={resource} className="border-b border-gray-100 dark:border-gray-700">
                                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{resource}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">
                                                                {renderResourceConfig(config)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Parameter Mapping */}
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Parameter Mapping</h5>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Parameter</th>
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Type</th>
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(step.parameter_mapping).map(([param, mapping]) => (
                                                        <tr key={param} className="border-b border-gray-100 dark:border-gray-700">
                                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{param}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{mapping.type}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">
                                                                {renderMappingValue(mapping)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Result Mapping */}
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Result Mapping</h5>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Result</th>
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Type</th>
                                                        <th className="text-left py-1 px-2 text-gray-700 dark:text-gray-200">Target</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(step.result_mapping).map(([result, mapping]) => (
                                                        <tr key={result} className="border-b border-gray-100 dark:border-gray-700">
                                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{result}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">{mapping.type}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-200">
                                                                {renderMappingValue(mapping)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Step Status */}
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-gray-700 dark:text-gray-200">Status:</span>
                                            <span className={`px-2 py-1 rounded ${step.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' :
                                                step.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' :
                                                    step.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400'
                                                }`}>
                                                {step.status}
                                            </span>
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400">
                                            Created: {new Date(step.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}; 