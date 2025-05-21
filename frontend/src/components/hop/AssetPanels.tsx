import React, { useState } from 'react';
import { Asset } from '@/types/asset';
import AssetLibraryPanel from './AssetLibraryPanel';
import AssetInspectorPanel from './AssetInspectorPanel';

interface AssetPanelsProps {
    assets: Asset[];
}

const AssetPanels: React.FC<AssetPanelsProps> = ({ assets }) => {
    const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();

    return (
        <div className="flex h-full w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg border-l border-gray-200 dark:border-gray-700">
            {/* Asset Library Panel - Fixed width */}
            <div className="w-[300px] h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
                <AssetLibraryPanel
                    assets={assets}
                    onAssetSelect={setSelectedAsset}
                    selectedAssetId={selectedAsset?.id}
                />
            </div>
            {/* Asset Inspector Panel - Grows to fill space */}
            <div className="flex-1 h-full">
                <AssetInspectorPanel asset={selectedAsset} />
            </div>
        </div>
    );
};

export default AssetPanels; 