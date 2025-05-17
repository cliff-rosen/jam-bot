import React from 'react';

export interface Tool {
    id: string;
    name: string;
    description: string;
    category: string;
}

interface ToolsProps {
    tools: Tool[];
    selectedToolIds: string[];
    onToolSelect: (toolId: string) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    onToggleItemView: () => void;
    isItemViewMode: boolean;
}

const Tools: React.FC<ToolsProps> = ({
    tools,
    selectedToolIds,
    onToolSelect,
    onSelectAll,
    onClearAll,
    onToggleItemView,
    isItemViewMode
}) => {
    return (
        <div className="flex flex-col h-full bg-white/95 dark:bg-gray-800/95">
            <div className="px-4 py-3 border-b dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tools</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={onToggleItemView}
                            className={`text-xs px-2 py-1 rounded ${isItemViewMode
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Manage Tools
                        </button>
                        <button
                            onClick={onSelectAll}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                            Select All
                        </button>
                        <button
                            onClick={onClearAll}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                    {tools.map((tool) => (
                        <div
                            key={tool.id}
                            className={`flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer group ${selectedToolIds.includes(tool.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                }`}
                            onClick={() => onToolSelect(tool.id)}
                        >
                            <div className="w-8 h-8 rounded bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                {tool.name.charAt(0)}
                            </div>
                            <div className="ml-3 flex-1">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{tool.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{tool.category}</div>
                            </div>
                            <div className={`w-4 h-4 rounded border ${selectedToolIds.includes(tool.id)
                                ? 'bg-blue-500 dark:bg-blue-400 border-blue-500 dark:border-blue-400'
                                : 'border-gray-300 dark:border-gray-600'
                                }`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Tools; 