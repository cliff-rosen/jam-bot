import React, { useEffect, useState } from 'react';
import { Asset, AssetType } from '@/types/asset';
import { getAssetIcon } from '@/lib/utils/assets/assetIconUtils';
import { assetApi } from '@/lib/api/assetApi';

interface AssetInspectorPanelProps {
    asset?: Asset;
}

const AssetInspectorPanel: React.FC<AssetInspectorPanelProps> = ({ asset }) => {
    const [detailedAsset, setDetailedAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAssetDetails = async () => {
            if (!asset) return;

            // Only fetch details for database entity assets
            if (asset.type === AssetType.DATABASE_ENTITY && !asset.content) {
                setLoading(true);
                setError(null);
                try {
                    const response = await assetApi.getAssetDetails(asset.id);
                    setDetailedAsset(response);
                } catch (err) {
                    setError('Failed to fetch asset details');
                    console.error('Error fetching asset details:', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setDetailedAsset(asset);
            }
        };

        fetchAssetDetails();
    }, [asset]);

    if (!asset) {
        return (
            <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">Select an asset to view its details</p>
            </div>
        );
    }

    const displayAsset = detailedAsset || asset;

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    {getAssetIcon(displayAsset.type, displayAsset.subtype)}
                    <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {displayAsset.name}
                    </h2>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {displayAsset.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {displayAsset.description}
                    </p>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                    </div>
                )}

                {error && (
                    <div className="text-red-500 text-sm mb-4">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        {displayAsset.type === AssetType.DATABASE_ENTITY ? (
                            <div className="space-y-4">
                                {Array.isArray(displayAsset.content) ? (
                                    <div className="space-y-2">
                                        {displayAsset.content.map((item: any, index: number) => (
                                            <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                                                <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                                                    {JSON.stringify(item, null, 2)}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                                        {JSON.stringify(displayAsset.content, null, 2)}
                                    </pre>
                                )}
                            </div>
                        ) : (
                            <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                                {JSON.stringify(displayAsset.content, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetInspectorPanel; 