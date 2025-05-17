import React from 'react';
import { Journey, Asset } from './types';
import { getAssetIcon, getAssetColor } from './assetUtils';

interface AssetPanelProps {
    journey: Journey | null;
}

export const AssetPanel: React.FC<AssetPanelProps> = ({ journey }) => {
    if (!journey) {
        return <div className="text-gray-500 dark:text-gray-400">No journey selected</div>;
    }

    const assets = journey.assets || [];

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="p-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Assets</h3>
                {assets.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400">
                        No assets generated yet
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assets.map(asset => (
                            <div
                                key={asset.id}
                                className={`p-3 rounded-lg border ${getAssetColor(asset.type)}`}
                            >
                                <div className="flex items-center space-x-2">
                                    <div className="text-4xl">{getAssetIcon(asset.format)}</div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {asset.title}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {asset.type} • {asset.format}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}; 