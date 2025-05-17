import React, { useState } from 'react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';

// Constants for text truncation
const MAX_TEXT_LENGTH = 200;
const MAX_ARRAY_LENGTH = 3;
const MAX_ARRAY_ITEM_LENGTH = 100;

type FormatValueFunction = (value: any, isOutput?: boolean) => React.ReactNode;

interface UseValueFormatterReturn {
    formatValue: FormatValueFunction;
}

export const useValueFormatter = (): UseValueFormatterReturn => {
    const [expandedValues, setExpandedValues] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpandedValues(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const formatValue: FormatValueFunction = (value: any, isOutput = false) => {
        if (value === undefined || value === null) {
            return (
                <span className="text-gray-400 dark:text-gray-500 italic">
                    Not set
                </span>
            );
        }

        // Handle arrays
        if (Array.isArray(value)) {
            const id = `array-${JSON.stringify(value).slice(0, 50)}`;
            const isExpanded = expandedValues[id];  
            const items = value;
            const displayItems = isExpanded ? items : items.slice(0, MAX_ARRAY_LENGTH);
            const hasMore = items.length > MAX_ARRAY_LENGTH;

            return (
                <div className="space-y-2 p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    {displayItems.map((item: any, index: number) => (
                        <div
                            key={index}
                            className="text-sm font-medium text-gray-700 dark:text-gray-100 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                        >
                            <span className="font-normal text-gray-500 dark:text-gray-400 mr-2">
                                {index + 1}.
                            </span>
                            {String(item)}
                        </div>
                    ))}
                    {hasMore && (
                        <button
                            onClick={() => toggleExpand(id)}
                            className="mt-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            {isExpanded ? 'Show Less' : `Show ${items.length - MAX_ARRAY_LENGTH} More...`}
                        </button>
                    )}
                </div>
            );
        }

        // Handle objects
        if (typeof value === 'object') {
            return (
                <div className="p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                    <pre className="text-sm text-gray-700 dark:text-gray-100">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                </div>
            );
        }

        const text = String(value);
        const id = `text-${text.slice(0, 50)}`;
        const isExpanded = expandedValues[id];

        // Use markdown formatting if explicitly requested for output
        // or if the text contains markdown-like characters
        if (isOutput || text.includes('|') || text.includes('#') || text.includes('*') || text.includes('\n')) {
            const displayText = text.length > MAX_TEXT_LENGTH && !isExpanded
                ? `${text.substring(0, MAX_TEXT_LENGTH)}...`
                : text;

            return (
                <div className="space-y-2">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                        <MarkdownRenderer content={displayText} />
                    </div>
                    {text.length > MAX_TEXT_LENGTH && (
                        <button
                            onClick={() => toggleExpand(id)}
                            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        >
                            {isExpanded ? 'Show Less' : 'Show More...'}
                        </button>
                    )}
                </div>
            );
        }

        // For simple text values, just return the text directly
        return text;
    };

    return { formatValue };
}; 