import React, { useEffect, useState } from 'react';
import { Tool, ToolType } from '@/types/tools';
import { TOOL_TYPES } from '@/lib/tool/toolRegistry';

interface ToolSelectorProps {
    tools: Tool[];
    selectedTool: Tool | undefined;
    onSelect: (tool: Tool | undefined) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({
    tools,
    selectedTool,
    onSelect
}) => {

    const [selectedToolType, setSelectedToolType] = useState<string | undefined>(selectedTool?.tool_type || undefined);

    // Function to get the tool type config
    const getToolTypeConfig = (typeId: string) => {
        return TOOL_TYPES.find(type => type.tool_type_id === typeId);
    };

    useEffect(() => {
        if (selectedTool) {
            setSelectedToolType(selectedTool.tool_type);
        }
    }, [selectedTool]);

    // Function to check if a tool belongs to a type
    const isToolOfType = (tool: Tool, typeId: string) => {
        const config = getToolTypeConfig(typeId);
        if (!config) return false;
        return tool.tool_type === typeId;
    };

    return (
        <div className="space-y-3">
            {/* Tool Type Selection - More Compact */}
            <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Select Tool Type
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {TOOL_TYPES.map((type) => (
                        <button
                            key={type.tool_type_id}
                            onClick={() => {
                                // If LLM is selected, automatically set the LLM tool
                                if (type.tool_type_id === 'llm') {
                                    const llmTool = tools.find(t => t.tool_type === 'llm');
                                    if (llmTool) onSelect(llmTool);
                                } else {
                                    // For other tool types, clear the selected tool
                                    onSelect(undefined);
                                    setSelectedToolType(type.tool_type_id);
                                }
                            }}
                            className={`px-2 py-1 rounded-lg border-2 transition-all duration-200 text-left
                                ${selectedToolType === type.tool_type_id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-lg">{type.icon}</span>
                                <div>
                                    <h4 className="font-medium text-xs text-gray-900 dark:text-gray-100">
                                        {type.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight line-clamp-1">
                                        {type.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tool Selection - More Compact */}
            {selectedToolType && selectedToolType !== 'llm' && (
                <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Select Tool
                    </h3>
                    <div className="space-y-2">
                        {getToolTypeConfig(selectedToolType)?.tools ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {getToolTypeConfig(selectedToolType)?.tools?.map(tool => (
                                    <button
                                        key={tool.tool_id}
                                        onClick={() => {
                                            const toolToUse = tools.find(t =>
                                                t.tool_id === tool.tool_id ||
                                                t.name.toLowerCase() === tool.name.toLowerCase()
                                            );
                                            if (toolToUse) onSelect(toolToUse);
                                        }}
                                        className={`p-2 rounded-lg border text-left transition-colors
                                            ${(selectedTool?.tool_id === tool.tool_id || selectedTool?.name.toLowerCase() === tool.name.toLowerCase())
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                            {tool.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                            {tool.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <select
                                value={selectedTool?.tool_id || ''}
                                onChange={(e) => {
                                    const tool = tools.find(t => t.tool_id === e.target.value);
                                    onSelect(tool);
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">Select a tool...</option>
                                {tools
                                    .filter(tool => isToolOfType(tool, selectedToolType))
                                    .map(tool => (
                                        <option key={tool.tool_id} value={tool.tool_id}>
                                            {tool.name}
                                        </option>
                                    ))}
                            </select>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolSelector;
