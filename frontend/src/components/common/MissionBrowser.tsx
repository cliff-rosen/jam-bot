import React, { useState } from 'react';
import { Mission, Hop, ToolStep } from '@/types/workflow';
import { Asset } from '@/types/asset';

interface MissionBrowserProps {
    mission: Mission;
    className?: string;
}

export const MissionBrowser: React.FC<MissionBrowserProps> = ({ mission, className = '' }) => {
    const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);

    // Helper to check if a mapping row should be hot
    const isMappingHot = (assetId: string) => hoveredAssetId === assetId;
    // Helper to check if a hop state row should be hot
    const isHopStateHot = (assetId: string, hop: Hop) => {
        if (!hoveredAssetId) return false;
        // If hovering a mapping row, highlight the asset row if IDs match
        if (hoveredAssetId === assetId) return true;
        // If hovering a hop state asset row, highlight all mapping rows that reference it
        const isHoveredAsset = assetId === hoveredAssetId;
        if (isHoveredAsset) return true;
        // If hovering a hop state asset, highlight mapping rows that reference it
        const mappingRefs = Object.values(hop.input_mapping).concat(Object.values(hop.output_mapping));
        return mappingRefs.includes(hoveredAssetId);
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Mission Overview */}
            <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Mission Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Inputs</h4>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Name</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">ID</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Type</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Value</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mission.inputs.map((input, idx) => (
                                        <tr key={input.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{input.name}</td>
                                            <td className="py-1 px-2 font-mono text-gray-700 dark:text-gray-300">{input.id?.slice(-8)}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{input.schema_definition.type || 'unknown'}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(input.value, null, 2)}</pre>
                                            </td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{input.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Outputs</h4>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Name</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">ID</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Type</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Value</th>
                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mission.outputs.map((output, idx) => (
                                        <tr key={output.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{output.name}</td>
                                            <td className="py-1 px-2 font-mono text-gray-700 dark:text-gray-300">{output.id?.slice(-8)}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{output.schema_definition?.type || 'unknown'}</td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(output.value, null, 2)}</pre>
                                            </td>
                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{output.status}</td>
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
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Mission State</h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Key</th>
                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Name</th>
                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">ID</th>
                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Type</th>
                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Value</th>
                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(mission.mission_state).map(([key, asset]) => {
                                // Find if this asset is referenced in any hop input/output mapping
                                const isMapped = mission.hops.some(hop => Object.values(hop.input_mapping).includes(asset.id) || Object.values(hop.output_mapping).includes(asset.id));
                                return (
                                    <tr
                                        key={key}
                                        className={`border-b border-gray-100 dark:border-gray-700 ${hoveredAssetId === asset.id && isMapped ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                        onMouseEnter={() => isMapped && setHoveredAssetId(asset.id)}
                                        onMouseLeave={() => isMapped && setHoveredAssetId(null)}
                                    >
                                        <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{key}</td>
                                        <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{asset.name}</td>
                                        <td className="py-1 px-2 font-mono text-gray-700 dark:text-gray-300">{asset.id?.slice(-8)}</td>
                                        <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{asset.schema_definition?.type || 'unknown'}</td>
                                        <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(asset.value, null, 2)}</pre>
                                        </td>
                                        <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{asset.status}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hops */}
            {mission.hops.map((hop, hopIndex) => (
                <div key={hop.id}>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                        Hop {hopIndex + 1}: {hop.name}
                    </h3>
                    <div className="space-y-4">
                        {/* Hop Mappings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Input Mapping</h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Local Key</th>
                                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Mission Asset ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(hop.input_mapping).map(([key, assetId]) => (
                                                <tr
                                                    key={key}
                                                    className={`border-b border-gray-100 dark:border-gray-700 ${isMappingHot(assetId) || (hoveredAssetId && assetId === hoveredAssetId) ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                                    onMouseEnter={() => setHoveredAssetId(assetId)}
                                                    onMouseLeave={() => setHoveredAssetId(null)}
                                                >
                                                    <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{key}</td>
                                                    <td className="py-1 px-2 font-mono text-gray-700 dark:text-gray-300">{assetId.slice(-8)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Output Mapping</h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Local Key</th>
                                                <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Mission Asset ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(hop.output_mapping).map(([key, assetId]) => (
                                                <tr
                                                    key={key}
                                                    className={`border-b border-gray-100 dark:border-gray-700 ${isMappingHot(assetId) || (hoveredAssetId && assetId === hoveredAssetId) ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                                    onMouseEnter={() => setHoveredAssetId(assetId)}
                                                    onMouseLeave={() => setHoveredAssetId(null)}
                                                >
                                                    <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{key}</td>
                                                    <td className="py-1 px-2 font-mono text-gray-700 dark:text-gray-300">{assetId.slice(-8)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Hop State */}
                        <div>
                            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Hop State</h4>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Key</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Name</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">ID</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Type</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Value</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(hop.hop_state).map(([key, asset]) => {
                                            // Find if this asset is referenced in input or output mapping
                                            const mappingRefs = Object.values(hop.input_mapping).concat(Object.values(hop.output_mapping));
                                            const isMapped = mappingRefs.includes(asset.id);
                                            // Highlight if hovered asset is this asset, or if this asset is referenced by hovered mapping
                                            const isHot = hoveredAssetId && (asset.id === hoveredAssetId || mappingRefs.includes(hoveredAssetId));
                                            return (
                                                <tr
                                                    key={key}
                                                    className={`border-b border-gray-100 dark:border-gray-700 ${isHot && isMapped ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}
                                                    onMouseEnter={() => isMapped && setHoveredAssetId(asset.id)}
                                                    onMouseLeave={() => isMapped && setHoveredAssetId(null)}
                                                >
                                                    <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{key}</td>
                                                    <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{asset.name}</td>
                                                    <td className="py-1 px-2 font-mono text-gray-700 dark:text-gray-300">{asset.id?.slice(-8)}</td>
                                                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{asset.schema_definition?.type || 'unknown'}</td>
                                                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                                        <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(asset.value, null, 2)}</pre>
                                                    </td>
                                                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{asset.status}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tool Steps */}
                        {hop.tool_steps.map((step, stepIndex) => (
                            <div key={step.id}>
                                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                    Tool Step {stepIndex + 1}: {step.description}
                                </h4>
                                <div className="space-y-4">
                                    {/* Parameter Mapping */}
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Parameter Mapping</h5>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Parameter</th>
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Type</th>
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(step.parameter_mapping).map(([param, mapping]) => (
                                                        <tr key={param} className="border-b border-gray-100 dark:border-gray-700">
                                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{param}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{mapping.type}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                                                {mapping.type === 'asset_field' ?
                                                                    `Asset: ${mapping.state_asset.slice(-8)}${mapping.path ? ` (${mapping.path})` : ''}` :
                                                                    JSON.stringify(mapping.value)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Result Mapping */}
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Result Mapping</h5>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Result</th>
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Type</th>
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Target</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(step.result_mapping).map(([result, mapping]) => (
                                                        <tr key={result} className="border-b border-gray-100 dark:border-gray-700">
                                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{result}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{mapping.type}</td>
                                                            <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                                                                {mapping.type === 'asset_field' ?
                                                                    `Asset: ${mapping.state_asset.slice(-8)}${mapping.path ? ` (${mapping.path})` : ''}` :
                                                                    'Discarded'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Resource Configs */}
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Resource Configs</h5>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Resource</th>
                                                        <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Config</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(step.resource_configs).map(([resource, config]) => (
                                                        <tr key={resource} className="border-b border-gray-100 dark:border-gray-700">
                                                            <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{resource}</td>
                                                            <td className="py-1 px-2">
                                                                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                                                    {JSON.stringify(config, null, 2)}
                                                                </pre>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Tool Steps Summary */}
                        <div>
                            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tool Steps</h4>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">#</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Tool ID</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Description</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Status</th>
                                            <th className="text-left py-1 px-2 text-gray-600 dark:text-gray-300">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hop.tool_steps.map((step, idx) => (
                                            <tr key={step.id} className="border-b border-gray-100 dark:border-gray-700">
                                                <td className="py-1 px-2">{idx + 1}</td>
                                                <td className="py-1 px-2 font-mono">{step.tool_id}</td>
                                                <td className="py-1 px-2">{step.description}</td>
                                                <td className="py-1 px-2">{step.status}</td>
                                                <td className="py-1 px-2 font-mono">{step.created_at}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}; 