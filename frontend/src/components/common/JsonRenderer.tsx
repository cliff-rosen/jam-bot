import React, { useState } from 'react';
import { JsonView, darkStyles, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

export interface JsonRendererProps {
    data: any;
    initialCollapsed?: boolean;
    className?: string;
    maxInitialDepth?: number;
}

/**
 * An enhanced JSON renderer component that provides interactive visualization
 * of JSON objects and arrays with collapsible sections.
 */
export const JsonRenderer: React.FC<JsonRendererProps> = ({
    data,
    initialCollapsed = false,
    className = '',
    maxInitialDepth = 2
}) => {
    const [isExpanded, setIsExpanded] = useState(!initialCollapsed);

    // Determine if we're in dark mode by checking for dark class on html element
    const isDarkMode = document.documentElement.classList.contains('dark');

    // If the data is empty, show a message
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return <span className="text-gray-500 dark:text-gray-400 italic">Empty data</span>;
    }

    // Check if this is an array of objects
    const isArrayOfObjects = Array.isArray(data) &&
        data.length > 0 &&
        data.every(item => typeof item === 'object' && item !== null);

    // Use the default styles from the library
    const baseStyles = isDarkMode ? darkStyles : defaultStyles;

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isExpanded ? (
                    <div className="overflow-auto max-h-96">
                        <JsonView
                            data={data}
                            shouldExpandNode={(level) => level < maxInitialDepth}
                            style={baseStyles}
                        />
                    </div>
                ) : (
                    <div
                        className="text-gray-800 dark:text-gray-200 cursor-pointer"
                        onClick={() => setIsExpanded(true)}
                    >
                        {Array.isArray(data) ? (
                            isArrayOfObjects ? (
                                <div>
                                    <div>Array of {data.length} objects</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        Click to expand and view details
                                    </div>
                                </div>
                            ) : (
                                `Array (${data.length} items)`
                            )
                        ) : (
                            <div>
                                <div>Object ({Object.keys(data).length} properties)</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    Click to expand and view details
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 
                         dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                         dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
            >
                {isExpanded ? "Collapse" : "Expand"}
            </button>
        </div>
    );
};

export default JsonRenderer; 