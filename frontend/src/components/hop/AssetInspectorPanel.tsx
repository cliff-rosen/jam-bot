import React from 'react';
import { Asset, AssetType } from '@/types/asset';
import { getAssetIcon } from '@/lib/utils/assets/assetIconUtils';

interface AssetInspectorPanelProps {
    asset?: Asset;
}

const AssetInspectorPanel: React.FC<AssetInspectorPanelProps> = ({ asset }) => {
    if (!asset) {
        return (
            <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">Select an asset to view its details</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    {getAssetIcon(asset.type, asset.subtype)}
                    <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {asset.name}
                    </h2>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {asset.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {asset.description}
                    </p>
                )}

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                        {JSON.stringify(asset.content, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default AssetInspectorPanel; 