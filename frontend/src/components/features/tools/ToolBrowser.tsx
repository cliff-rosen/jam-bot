import React, { useState, useEffect, useMemo } from 'react';
import { ToolDefinition } from '@/types/tool';
import { toolsApi } from '@/lib/api/toolsApi';
import { VariableRenderer } from '@/components/common/VariableRenderer';
import { SchemaRenderer } from '@/components/common';
import {
    Search,
    Filter,
    Code,
    Database,
    Globe,
    FileText,
    BarChart3,
    Settings,
    ChevronRight,
    AlertCircle,
    RefreshCw,
    CheckCircle,
    Info
} from 'lucide-react';

interface ToolBrowserProps {
    className?: string;
    onSelectTool: (tool: ToolDefinition | null) => void;
}

export const ToolBrowser: React.FC<ToolBrowserProps> = ({ className = '', onSelectTool }) => {
    const [tools, setTools] = useState<ToolDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);

    // Fetch tools on component mount
    useEffect(() => {
        const fetchTools = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await toolsApi.getTools();
                setTools(response);
            } catch (err) {
                setError('Failed to fetch tools');
                console.error('Error fetching tools:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTools();
    }, []);

    // Get unique categories with counts
    const categories = useMemo(() => {
        const categoryMap = new Map<string, number>();
        tools.forEach(tool => {
            categoryMap.set(tool.category, (categoryMap.get(tool.category) || 0) + 1);
        });

        return [
            { value: 'all', label: 'All Categories', count: tools.length },
            ...Array.from(categoryMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, count]) => ({
                    value: category,
                    label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    count
                }))
        ];
    }, [tools]);

    // Filter tools based on search and category
    const filteredTools = useMemo(() => {
        return tools.filter(tool => {
            const matchesSearch = !searchTerm ||
                tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tool.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [tools, searchTerm, selectedCategory]);

    // Get category icon
    const getCategoryIcon = (category: string) => {
        const iconClass = "w-4 h-4";
        switch (category.toLowerCase()) {
            case 'data_retrieval':
                return <Database className={iconClass} />;
            case 'data_processing':
                return <BarChart3 className={iconClass} />;
            case 'data_analysis':
                return <BarChart3 className={iconClass} />;
            case 'web':
                return <Globe className={iconClass} />;
            case 'file':
                return <FileText className={iconClass} />;
            case 'system':
                return <Settings className={iconClass} />;
            default:
                return <Code className={iconClass} />;
        }
    };

    const handleSelectTool = (tool: ToolDefinition) => {
        setSelectedTool(tool);
        onSelectTool(tool);
    };

    const handleRefresh = () => {
        setTools([]);
        setSelectedTool(null);
        setLoading(true);
        setError(null);
    };

    // Loading state
    if (loading) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading tools...
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`p-4 ${className}`}>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
                <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Search and Filter */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tools by name, description, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                        />
                    </div>
                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full pl-10 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm appearance-none"
                        >
                            {categories.map(category => (
                                <option key={category.value} value={category.value}>
                                    {category.label} ({category.count})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Refresh tools"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {/* Results count */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>
                        {filteredTools.length} of {tools.length} tools
                        {selectedTool && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                                • {selectedTool.name} selected
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                    {/* Tool List */}
                    <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                        <div className="p-2">
                            {filteredTools.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No tools found matching your criteria</p>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2"
                                        >
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredTools.map(tool => (
                                    <div
                                        key={tool.id}
                                        className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all duration-200 cursor-pointer group ${selectedTool?.id === tool.id
                                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-sm'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-transparent'
                                            }`}
                                        onClick={() => handleSelectTool(tool)}
                                    >
                                        <div className={`transition-colors ${selectedTool?.id === tool.id
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                            }`}>
                                            {getCategoryIcon(tool.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className={`text-sm font-medium truncate ${selectedTool?.id === tool.id
                                                    ? 'text-blue-900 dark:text-blue-100'
                                                    : 'text-gray-900 dark:text-gray-100'
                                                    }`}>
                                                    {tool.name}
                                                </h3>
                                                <ChevronRight className={`w-4 h-4 transition-transform ${selectedTool?.id === tool.id
                                                    ? 'rotate-90 text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                                    }`} />
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {tool.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {tool.category.replace(/_/g, ' ')}
                                                </span>
                                                {tool.parameters.filter(p => p.required).length > 0 && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                        {tool.parameters.filter(p => p.required).length} required
                                                    </span>
                                                )}
                                                {tool.resource_dependencies.length > 0 && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                                        {tool.resource_dependencies.length} resource{tool.resource_dependencies.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Tool Details */}
                    <div className="w-2/3 overflow-y-auto">
                        {selectedTool ? (
                            <div className="p-4">
                                {/* Tool Header */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="text-blue-600 dark:text-blue-400">
                                            {getCategoryIcon(selectedTool.category)}
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                            {selectedTool.name}
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                        {selectedTool.description}
                                    </p>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            {selectedTool.category.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{selectedTool.id}</code>
                                        </span>
                                    </div>
                                </div>

                                {/* Parameters */}
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                        <Info className="w-5 h-5" />
                                        Parameters ({selectedTool.parameters.length})
                                    </h4>
                                    {selectedTool.parameters.length === 0 ? (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">No parameters required</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedTool.parameters.map(param => (
                                                <div key={param.name} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {param.name}
                                                        </span>
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${param.required
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                            }`}>
                                                            {param.required ? 'Required' : 'Optional'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                        {param.description}
                                                    </p>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        <strong>Type:</strong>
                                                        <div className="mt-1 ml-2">
                                                            {param.schema_definition ? (
                                                                <SchemaRenderer
                                                                    schema={param.schema_definition}
                                                                    compact={false}
                                                                />
                                                            ) : (
                                                                <span className="text-gray-500">unknown</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Outputs */}
                                <div className="mb-6">
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Outputs ({selectedTool.outputs.length})
                                    </h4>
                                    {selectedTool.outputs.length === 0 ? (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">No outputs defined</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedTool.outputs.map(output => (
                                                <div key={output.name} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {output.name}
                                                        </span>
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${output.required
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                            }`}>
                                                            {output.required ? 'Always returned' : 'Optional'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                        {output.description}
                                                    </p>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        <strong>Type:</strong>
                                                        <div className="mt-1 ml-2">
                                                            {output.schema_definition ? (
                                                                <SchemaRenderer
                                                                    schema={output.schema_definition}
                                                                    compact={false}
                                                                />
                                                            ) : (
                                                                <span className="text-gray-500">unknown</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Resource Dependencies */}
                                {selectedTool.resource_dependencies.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5" />
                                            Resource Dependencies ({selectedTool.resource_dependencies.length})
                                        </h4>
                                        <div className="space-y-3">
                                            {selectedTool.resource_dependencies.map(resource => (
                                                <div key={resource.id} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {resource.name}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                                            {resource.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                        {resource.description}
                                                    </p>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        <strong>ID:</strong> <code className="bg-orange-100 dark:bg-orange-900/30 px-1 py-0.5 rounded">{resource.id}</code>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Examples */}
                                {selectedTool.examples && selectedTool.examples.length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                            <Code className="w-5 h-5" />
                                            Examples ({selectedTool.examples.length})
                                        </h4>
                                        <div className="space-y-4">
                                            {selectedTool.examples.map((example, index) => (
                                                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                                                        {example.description}
                                                    </h5>
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                        <div>
                                                            <h6 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1">
                                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                                Input
                                                            </h6>
                                                            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-xs overflow-x-auto">
                                                                <VariableRenderer value={example.input} />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h6 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1">
                                                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                                Output
                                                            </h6>
                                                            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-xs overflow-x-auto">
                                                                <VariableRenderer value={example.output} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center">
                                <div className="max-w-md">
                                    <div className="text-gray-400 dark:text-gray-500 mb-4">
                                        <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                                        Select a tool to view details
                                    </p>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                                        Click on any tool from the list to see its parameters, outputs, and examples
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}; 