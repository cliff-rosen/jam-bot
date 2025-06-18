import React, { useState, useEffect } from 'react';
import { ToolDefinition } from '@/types/tool';
import { toolsApi } from '@/lib/api/toolsApi';
import { VariableRenderer } from '@/components/common/VariableRenderer';
import { Search, Filter, Code, Database, Globe, FileText, BarChart3, Settings } from 'lucide-react';

interface ToolBrowserProps {
    className?: string;
}

export const ToolBrowser: React.FC<ToolBrowserProps> = ({ className = '' }) => {
    const [tools, setTools] = useState<ToolDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);

    useEffect(() => {
        const fetchTools = async () => {
            try {
                setLoading(true);
                const response = await toolsApi.getAvailableTools();
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

    // Get unique categories
    const categories = ['all', ...Array.from(new Set(tools.map(tool => tool.category)))];

    // Filter tools based on search and category
    const filteredTools = tools.filter(tool => {
        const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Get category icon
    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'data_retrieval':
                return <Database className="w-4 h-4" />;
            case 'data_processing':
                return <BarChart3 className="w-4 h-4" />;
            case 'data_analysis':
                return <BarChart3 className="w-4 h-4" />;
            case 'web':
                return <Globe className="w-4 h-4" />;
            case 'file':
                return <FileText className="w-4 h-4" />;
            case 'system':
                return <Settings className="w-4 h-4" />;
            default:
                return <Code className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <div className="text-gray-500 dark:text-gray-400">Loading tools...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 text-red-600 dark:text-red-400 ${className}`}>
                Error: {error}
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b dark:border-gray-700">

                {/* Search and Filter */}
                <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tools..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="pl-10 pr-8 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm appearance-none"
                        >
                            {categories.map(category => (
                                <option key={category} value={category}>
                                    {category === 'all' ? 'All Categories' : category.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Results count */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredTools.length} of {tools.length} tools
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                    {/* Tool List */}
                    <div className="w-1/2 border-r dark:border-gray-700 overflow-y-auto">
                        <div className="p-2">
                            {filteredTools.map(tool => (
                                <div
                                    key={tool.id}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTool?.id === tool.id
                                        ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                    onClick={() => setSelectedTool(tool)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getCategoryIcon(tool.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {tool.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {tool.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {tool.category.replace(/_/g, ' ')}
                                                </span>
                                                {tool.resource_dependencies.length > 0 && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                                        {tool.resource_dependencies.length} resource{tool.resource_dependencies.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tool Details */}
                    <div className="w-1/2 overflow-y-auto">
                        {selectedTool ? (
                            <div className="p-4">
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        {getCategoryIcon(selectedTool.category)}
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {selectedTool.name}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        {selectedTool.description}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            {selectedTool.category.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            ID: {selectedTool.id}
                                        </span>
                                    </div>
                                </div>

                                {/* Parameters */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                        Parameters ({selectedTool.parameters.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedTool.parameters.map(param => (
                                            <div key={param.name} className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {param.name}
                                                    </span>
                                                    <span className={`text-xs px-2 py-1 rounded ${param.required
                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}>
                                                        {param.required ? 'Required' : 'Optional'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    {param.description}
                                                </p>
                                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                                    Type: {param.schema?.type || 'unknown'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Outputs */}
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                        Outputs ({selectedTool.outputs.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedTool.outputs.map(output => (
                                            <div key={output.name} className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {output.name}
                                                    </span>
                                                    <span className={`text-xs px-2 py-1 rounded ${output.required
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}>
                                                        {output.required ? 'Required' : 'Optional'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    {output.description}
                                                </p>
                                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                                    Type: {output.schema?.type || 'unknown'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Resource Dependencies */}
                                {selectedTool.resource_dependencies.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                            Resource Dependencies ({selectedTool.resource_dependencies.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedTool.resource_dependencies.map(resource => (
                                                <div key={resource.id} className="bg-orange-50 dark:bg-orange-900/20 rounded p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {resource.name}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                                            {resource.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {resource.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Examples */}
                                {selectedTool.examples && selectedTool.examples.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                            Examples ({selectedTool.examples.length})
                                        </h4>
                                        <div className="space-y-3">
                                            {selectedTool.examples.map((example, index) => (
                                                <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                                                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                                        {example.description}
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <h6 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                                Input
                                                            </h6>
                                                            <div className="text-xs">
                                                                <VariableRenderer value={example.input} />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h6 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                                                                Output
                                                            </h6>
                                                            <div className="text-xs">
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
                            <div className="h-full flex items-center justify-center">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Select a tool to view details
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}; 