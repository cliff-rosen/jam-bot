import React, { useState } from 'react';
import { SchemaType } from '@/types/base';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface SchemaRendererProps {
    schema: SchemaType;
    depth?: number;
    compact?: boolean;
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({
    schema,
    depth = 0,
    compact = false
}) => {
    const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'string': return 'text-green-600 dark:text-green-400';
            case 'number': return 'text-blue-600 dark:text-blue-400';
            case 'boolean': return 'text-purple-600 dark:text-purple-400';
            case 'object': return 'text-orange-600 dark:text-orange-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const hasNestedFields = schema.type === 'object' && schema.fields && Object.keys(schema.fields).length > 0;

    if (compact) {
        return (
            <span className="inline-flex items-center">
                <span className={`font-mono text-xs ${getTypeColor(schema.type)}`}>
                    {schema.type}
                </span>
                {schema.is_array && (
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">[]</span>
                )}
                {hasNestedFields && (
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        ({Object.keys(schema.fields!).length} fields)
                    </span>
                )}
            </span>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <span className={`font-mono text-sm ${getTypeColor(schema.type)}`}>
                        {schema.type}
                    </span>
                    {schema.is_array && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">[]</span>
                    )}
                </div>

                {hasNestedFields && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                        ) : (
                            <ChevronRight className="w-3 h-3" />
                        )}
                        {Object.keys(schema.fields!).length} field{Object.keys(schema.fields!).length !== 1 ? 's' : ''}
                    </button>
                )}
            </div>

            {schema.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {schema.description}
                </p>
            )}

            {hasNestedFields && isExpanded && (
                <div className="ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                    {Object.entries(schema.fields!).map(([fieldName, fieldSchema]) => (
                        <div key={fieldName} className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {fieldName}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">:</span>
                            </div>
                            <div className="ml-2">
                                <SchemaRenderer
                                    schema={fieldSchema}
                                    depth={depth + 1}
                                    compact={false}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}; 