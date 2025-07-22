import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WorkbenchSearchParams } from './types';

interface SearchControlsProps {
    searchParams: WorkbenchSearchParams;
    loading: boolean;
    onSearchParamsChange: (params: WorkbenchSearchParams) => void;
    onSearch: () => void;
}

export default function SearchControls({
    searchParams,
    loading,
    onSearchParamsChange,
    onSearch
}: SearchControlsProps) {
    return (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto">
                {/* Main search row */}
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Search Query
                        </label>
                        <Input
                            value={searchParams.query}
                            onChange={(e) => onSearchParamsChange({ ...searchParams, query: e.target.value })}
                            placeholder="Enter search terms..."
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            className="dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <Button
                        className="px-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium"
                        onClick={onSearch}
                        disabled={loading || !searchParams.query.trim()}
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </Button>
                </div>

                {/* Advanced options row */}
                <div className="mt-4 flex flex-wrap gap-3">
                    <div className="w-32">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Results
                        </label>
                        <Input
                            type="number"
                            min="1"
                            max="20"
                            value={searchParams.num_results}
                            onChange={(e) => onSearchParamsChange({
                                ...searchParams,
                                num_results: parseInt(e.target.value) || 10
                            })}
                            className="dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <div className="w-40">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Sort By
                        </label>
                        <select
                            className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            value={searchParams.sort_by}
                            onChange={(e) => onSearchParamsChange({
                                ...searchParams,
                                sort_by: e.target.value as 'relevance' | 'date'
                            })}
                        >
                            <option value="relevance">Relevance</option>
                            <option value="date">Date</option>
                        </select>
                    </div>
                    <div className="w-28">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            From Year
                        </label>
                        <Input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={searchParams.year_low || ''}
                            onChange={(e) => onSearchParamsChange({
                                ...searchParams,
                                year_low: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            placeholder="2020"
                            className="dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <div className="w-28">
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            To Year
                        </label>
                        <Input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={searchParams.year_high || ''}
                            onChange={(e) => onSearchParamsChange({
                                ...searchParams,
                                year_high: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            placeholder="2024"
                            className="dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 