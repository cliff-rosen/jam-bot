import React from 'react';
import { Asset } from '@/types/asset';

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

    // Helper function to truncate content
    const truncateContent = (content: any, maxLength: number = 50): string => {
        if (content === null || content === undefined) return 'N/A';

        let displayText: string;
        if (typeof content === 'string') {
            displayText = content;
        } else if (typeof content === 'object') {
            displayText = JSON.stringify(content);
        } else {
            displayText = String(content);
        }

        if (displayText.length <= maxLength) return displayText;
        return displayText.substring(0, maxLength) + '...';
    };

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Name</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Type</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Description</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Content</th>
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
                            <td className="py-2 px-2">
                                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    {asset.type || 'unknown'}
                                </span>
                            </td>
                            <td className="py-2 px-2 text-gray-700 dark:text-gray-300">
                                {truncateContent(asset.description, 40)}
                            </td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 font-mono">
                                {truncateContent(asset.content, 30)}
                            </td>
                            <td className="py-2 px-2">
                                {asset.asset_metadata?.version ? (
                                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                        v{asset.asset_metadata.version}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MissionStateTable; 