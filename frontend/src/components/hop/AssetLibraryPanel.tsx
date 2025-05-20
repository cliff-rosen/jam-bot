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
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Asset Library</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Available resources for your workflow</p>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredAssets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No assets found
                    </div>
                ) : (
                    filteredAssets.map(asset => (
                        <div
                            key={asset.id}
                            onClick={() => onAssetSelect(asset)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors
                                     ${selectedAssetId === asset.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'}
                                     border`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                    {getAssetIcon(asset.type, asset.subtype)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {asset.name}
                                    </p>
                                    {asset.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {asset.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AssetLibraryPanel; 