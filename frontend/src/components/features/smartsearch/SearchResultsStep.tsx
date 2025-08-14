import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink } from 'lucide-react';
import type { SearchResults } from '@/types/smart-search';

interface SearchResultsStepProps {
  searchResults: SearchResults;
  selectedArticles: Set<number>;
  onToggleArticle: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSubmit: () => void;
  onLoadMore: () => void;
  loading: boolean;
  loadingMore: boolean;
}

export function SearchResultsStep({
  searchResults,
  selectedArticles,
  onToggleArticle,
  onSelectAll,
  onDeselectAll,
  onSubmit,
  onLoadMore,
  loading,
  loadingMore
}: SearchResultsStepProps) {
  return (
    <Card className="p-6 dark:bg-gray-800 flex flex-col h-[calc(100vh-280px)]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Review & Curate Search Results
      </h2>

      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
        <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Step Completed:</h3>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ✓ Found {searchResults.pagination.returned} articles (showing {searchResults.pagination.returned} of {searchResults.pagination.total_available} total) from {searchResults.sources_searched.join(', ')}
        </p>
        <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
          Review the articles below and uncheck any that are obviously irrelevant before proceeding to semantic filtering.
        </p>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedArticles.size} of {searchResults.articles.length} articles selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onSelectAll}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={onDeselectAll}>
                Deselect All
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto flex-1 pr-2">
          {searchResults.articles.map((article, index) => (
            <div
              key={index}
              className={`p-2 border rounded transition-all ${
                selectedArticles.has(index)
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedArticles.has(index)}
                  onChange={() => onToggleArticle(index)}
                  className="h-4 w-4 text-blue-600 rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {article.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span className="truncate">
                      {article.authors.slice(0, 2).join(', ')}
                      {article.authors.length > 2 && ' et al.'}
                      {article.year && ` (${article.year})`}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {article.source}
                    </Badge>
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {searchResults.pagination.has_more && (
          <div className="flex justify-center py-4 flex-shrink-0">
            <Button
              onClick={onLoadMore}
              disabled={loadingMore}
              variant="outline"
              className="w-full max-w-xs"
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Loading More...
                </>
              ) : (
                `Load More (${searchResults.pagination.total_available - searchResults.pagination.returned} remaining)`
              )}
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 flex-shrink-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tip: Uncheck articles that are clearly off-topic to save on filtering costs
          </p>
          <Button
            onClick={onSubmit}
            disabled={selectedArticles.size === 0 || loading}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            {loading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Generate Filter Criteria
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}