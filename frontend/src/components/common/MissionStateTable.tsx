import React from 'react';
import { Asset, AssetStatus } from '@/types/schema';
import { getStatusBadgeClass } from '@/utils/statusUtils';

interface MissionStateTableProps {
    state: Record<string, Asset>;
    className?: string;
}

export const MissionStateTable: React.FC<MissionStateTableProps> = ({
    state,
    className = ''
}) => {
    // Convert state object to array of assets
    const assets = Object.values(state);

    if (!assets || assets.length === 0) {
        return (
            <div className={`text-xs text-gray-400 italic ${className}`}>
                No assets in mission state
            </div>
        );
    }

    // Helper to get badge color for asset status
    const getAssetStatusColor = (status: AssetStatus): string => {
        switch (status) {
            case AssetStatus.PENDING:
                return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
            case AssetStatus.IN_PROGRESS:
                return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
            case AssetStatus.READY:
                return 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
            case AssetStatus.ERROR:
                return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
            case AssetStatus.EXPIRED:
                return 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
            default:
                return 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        }
    };

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Name</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">ID</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Type</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Role</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map((asset, index) => (
                        <tr
                            key={asset.id || index}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                            <td className="py-2 px-2 text-gray-900 dark:text-gray-100 font-medium">
                                {asset.name || 'Unnamed'}
                            </td>
                            <td className="py-2 px-2 text-gray-700 dark:text-gray-300 font-mono">
                                {asset.id?.slice(-8)}
                            </td>
                            <td className="py-2 px-2">
                                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    {asset.schema.type || 'unknown'}
                                </span>
                            </td>
                            <td className="py-2 px-2 text-gray-700 dark:text-gray-300 capitalize">
                                {asset.role || '—'}
                            </td>
                            <td className="py-2 px-2">
                                <span className={getStatusBadgeClass(getAssetStatusColor(asset.status))}>
                                    {asset.status.toUpperCase()}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MissionStateTable; 