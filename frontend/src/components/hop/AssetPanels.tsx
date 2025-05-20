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
        <div className="h-full flex">
            {/* Asset Library Panel */}
            <div className="w-1/2 h-full">
                <AssetLibraryPanel
                    assets={assets}
                    onAssetSelect={setSelectedAsset}
                    selectedAssetId={selectedAsset?.id}
                />
            </div>

            {/* Asset Inspector Panel */}
            <div className="w-1/2 h-full">
                <AssetInspectorPanel asset={selectedAsset} />
            </div>
        </div>
    );
};

export default AssetPanels; 