import React, { useState } from 'react';
import { Asset, AssetType, CollectionType } from '@/types/asset';
import { getAssetIcon } from '@/lib/utils/assets/assetIconUtils';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface AssetLibraryPanelProps {
    assets: Asset[];
    onAssetSelect: (asset: Asset) => void;
    selectedAssetId?: string;
}

const AssetLibraryPanel: React.FC<AssetLibraryPanelProps> = ({
    assets,
    onAssetSelect,
    selectedAssetId
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<AssetType | 'all'>('all');

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || asset.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b dark:border-gray-700">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Library</h2>
            </div>

            {/* Search and Filter */}
            <div className="p-4 space-y-4">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as AssetType | 'all')}
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Types</option>
                        <option value={AssetType.FILE}>Files</option>
                        <option value={AssetType.PRIMITIVE}>Primitives</option>
                        <option value={AssetType.OBJECT}>Objects</option>
                    </select>
                </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto p-4">
                {filteredAssets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No assets found
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Non-final assets */}
                        <div className="grid grid-cols-2 gap-3">
                            {filteredAssets.filter(asset => !asset.asset_metadata?.is_final).map(asset => (
                                <div
                                    key={asset.id}
                                    onClick={() => onAssetSelect(asset)}
                                    className={`bg-white dark:bg-gray-700 border rounded-lg p-3 cursor-pointer transition
                                        ${selectedAssetId === asset.id
                                            ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-700'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400'}`}
                                >
                                    <div className="font-medium truncate text-xs text-gray-900 dark:text-gray-100">{asset.name}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 min-h-[32px]">{asset.description}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 w-fit border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                            {asset.type?.toUpperCase() || 'UNKNOWN'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Divider and Final Assets Section */}
                        {filteredAssets.some(asset => asset.asset_metadata?.is_final) && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white dark:bg-gray-800 px-2 text-xs text-gray-500 dark:text-gray-400">Final Assets</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {filteredAssets.filter(asset => asset.asset_metadata?.is_final).map(asset => (
                                        <div
                                            key={asset.id}
                                            onClick={() => onAssetSelect(asset)}
                                            className={`bg-white dark:bg-gray-700 border rounded-lg p-3 cursor-pointer transition
                                                ${selectedAssetId === asset.id
                                                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-700'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400'}`}
                                        >
                                            <div className="font-medium truncate text-xs text-gray-900 dark:text-gray-100">{asset.name}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 min-h-[32px]">{asset.description}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 w-fit border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                                    {asset.type?.toUpperCase() || 'UNKNOWN'}
                                                </div>
                                                <div className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 w-fit border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                                                    FINAL
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetLibraryPanel; 