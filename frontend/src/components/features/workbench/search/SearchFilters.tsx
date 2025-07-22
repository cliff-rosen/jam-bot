import { Button } from '@/components/ui/button';
import { WorkbenchFilters, SortOption } from './types';
import { countActiveFilters } from '../utils/filterUtils';
import { RELEVANCE_OPTIONS, STUDY_TYPE_OPTIONS, STUDY_OUTCOME_OPTIONS } from '../utils/constants';

interface SearchFiltersProps {
    filters: WorkbenchFilters;
    showFilters: boolean;
    sortBy: SortOption;
    articlesCount: number;
    filteredCount: number;
    onFiltersChange: (filters: WorkbenchFilters) => void;
    onShowFiltersChange: (show: boolean) => void;
    onSortByChange: (sortBy: SortOption) => void;
    onResetFilters: () => void;
}

export default function SearchFilters({
    filters,
    showFilters,
    sortBy,
    articlesCount,
    filteredCount,
    onFiltersChange,
    onShowFiltersChange,
    onSortByChange,
    onResetFilters
}: SearchFiltersProps) {
    const activeFilterCount = countActiveFilters(filters);

    const renderFilterButton = (
        value: string,
        currentValue: string,
        onClick: () => void,
        colorClass: string = 'blue'
    ) => {
        const isActive = currentValue === value;
        const baseClasses = 'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors';
        const activeClasses = {
            blue: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600',
            green: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600',
            purple: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600'
        };
        const inactiveClasses = 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700';

        return (
            <button
                onClick={onClick}
                className={`${baseClasses} ${isActive ? activeClasses[colorClass as keyof typeof activeClasses] : inactiveClasses}`}
            >
                {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
        );
    };

    return (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter & Sort Results</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => onSortByChange(e.target.value as SortOption)}
                                className="px-2 py-1 text-xs border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            >
                                <option value="none">Default order</option>
                                <option value="relevance_score">Relevance score (high to low)</option>
                                <option value="confidence_score">Confidence (high to low)</option>
                            </select>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onShowFiltersChange(!showFilters)}
                            className="dark:border-gray-600 dark:text-gray-300"
                        >
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                            {activeFilterCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {showFilters && (
                    <div className="space-y-6">
                        {/* Row 1: Yes/No Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* PoI Relevance Filter */}
                            <div>
                                <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">PoI Relevance</label>
                                <div className="flex gap-2">
                                    {RELEVANCE_OPTIONS.map((option) => renderFilterButton(
                                        option,
                                        filters.poi_relevance,
                                        () => onFiltersChange({ ...filters, poi_relevance: option }),
                                        'blue'
                                    ))}
                                </div>
                            </div>

                            {/* DoI Relevance Filter */}
                            <div>
                                <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">DoI Relevance</label>
                                <div className="flex gap-2">
                                    {RELEVANCE_OPTIONS.map((option) => renderFilterButton(
                                        option,
                                        filters.doi_relevance,
                                        () => onFiltersChange({ ...filters, doi_relevance: option }),
                                        'blue'
                                    ))}
                                </div>
                            </div>

                            {/* Systematic Filter */}
                            <div>
                                <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">Systematic Study</label>
                                <div className="flex gap-2">
                                    {RELEVANCE_OPTIONS.map((option) => renderFilterButton(
                                        option,
                                        filters.is_systematic,
                                        () => onFiltersChange({ ...filters, is_systematic: option }),
                                        'blue'
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Study Type Filter */}
                        <div>
                            <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">Study Type</label>
                            <div className="flex flex-wrap gap-2">
                                {STUDY_TYPE_OPTIONS.map((option) => renderFilterButton(
                                    option,
                                    filters.study_type,
                                    () => onFiltersChange({ ...filters, study_type: option }),
                                    'green'
                                ))}
                            </div>
                        </div>

                        {/* Row 3: Study Outcome Filter */}
                        <div>
                            <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">Study Outcome</label>
                            <div className="flex flex-wrap gap-2">
                                {STUDY_OUTCOME_OPTIONS.map((option) => renderFilterButton(
                                    option,
                                    filters.study_outcome,
                                    () => onFiltersChange({ ...filters, study_outcome: option }),
                                    'purple'
                                ))}
                            </div>
                        </div>

                        {/* Row 4: Confidence Filter */}
                        <div>
                            <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                                Minimum Confidence: {filters.min_confidence}%
                            </label>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500 dark:text-gray-400">0%</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="10"
                                    value={filters.min_confidence}
                                    onChange={(e) => onFiltersChange({ ...filters, min_confidence: parseInt(e.target.value) })}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">100%</span>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
                                {[0, 20, 40, 60, 80, 100].map(val => (
                                    <span key={val} className={filters.min_confidence === val ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>
                                        {val}%
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Row 5: Relevance Score Filter */}
                        <div>
                            <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                                Minimum Relevance Score: {filters.min_relevance_score}/10
                            </label>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500 dark:text-gray-400">0</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="1"
                                    value={filters.min_relevance_score}
                                    onChange={(e) => onFiltersChange({ ...filters, min_relevance_score: parseInt(e.target.value) })}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">10</span>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
                                {[0, 2, 4, 6, 8, 10].map(val => (
                                    <span key={val} className={filters.min_relevance_score === val ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                                        {val}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter summary */}
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredCount} of {articlesCount} articles
                    {filteredCount !== articlesCount && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={onResetFilters}
                            className="ml-2 h-auto p-0 text-blue-600 dark:text-blue-400"
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
} 