import React, { useState } from 'react';
import { assetApi } from '@/lib/api/assetApi';
import { VariableRenderer } from '@/components/common/VariableRenderer';
import { Asset } from '@/types/asset';

export default function LabPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAssets = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await assetApi.getAssets();
            setAssets(response);
        } catch (err) {
            setError('Failed to fetch assets');
            console.error('Error fetching assets:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Lab</h1>

            <div className="mb-6">
                <button
                    onClick={fetchAssets}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                    {loading ? 'Loading...' : 'Fetch Assets'}
                </button>
            </div>

            {error && (
                <div className="text-red-500 mb-4">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {assets.map((asset) => (
                    <div key={asset.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{asset.name}</h2>
                        {asset.description && (
                            <p className="text-gray-600 dark:text-gray-300 mb-4">{asset.description}</p>
                        )}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-4">
                            <VariableRenderer
                                value={asset.content}
                                useEnhancedJsonView={true}
                                maxTextLength={1000}
                                maxArrayItems={20}
                                maxArrayItemLength={500}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

