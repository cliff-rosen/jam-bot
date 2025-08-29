import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Target, AlertTriangle, CheckCircle, Sparkles, Copy, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSmartSearch } from '@/context/SmartSearchContext';

interface OptimizationResult {
  initial_keywords: string;
  initial_count: number;
  final_keywords: string;
  final_count: number;
  refinement_applied: string;
  refinement_status: 'optimal' | 'refined' | 'manual_needed';
}


interface SearchQueryStepProps {
  editedSearchQuery: string;
  setEditedSearchQuery: (query: string) => void;
  evidenceSpec: string;
  selectedSource: string;
  onSubmit: () => void;
  onOptimize: (evidenceSpec: string) => Promise<OptimizationResult>;
  onTestCount: (query: string) => Promise<{ total_count: number; sources_searched: string[] }>;
  loading: boolean;
  initialCount?: { total_count: number; sources_searched: string[] } | null;
}

export function SearchQueryStep({
  editedSearchQuery,
  setEditedSearchQuery,
  evidenceSpec,
  selectedSource,
  onSubmit,
  onOptimize,
  onTestCount,
  loading,
  initialCount
}: SearchQueryStepProps) {
  const smartSearch = useSmartSearch();
  const [currentCount, setCurrentCount] = useState<number | null>(null);
  const [isTestingCount, setIsTestingCount] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Use query history from context
  const queryHistory = smartSearch.queryHistory;
  const setQueryHistory = smartSearch.updateQueryHistory;

  // Initialize with the generated query and count
  useEffect(() => {
    if (initialCount && editedSearchQuery?.trim() && queryHistory.length === 0) {
      setQueryHistory([{
        query: editedSearchQuery.trim(),
        count: initialCount.total_count || 0,
        changeDescription: "Generated from evidence specification",
        timestamp: new Date()
      }]);
      setCurrentCount(initialCount.total_count);
    }
  }, [initialCount, editedSearchQuery, queryHistory.length, setQueryHistory]);

  // Clear current count when query is edited
  const handleQueryChange = (newQuery: string) => {
    setEditedSearchQuery(newQuery);
    // Clear the current count since the query has changed
    setCurrentCount(null);
  };

  // Check if query is already in history
  const isQueryInHistory = (query: string) => {
    return queryHistory.some(attempt => attempt.query === query);
  };

  // Test current query count and add to history
  const handleTestQuery = async () => {
    if (!editedSearchQuery?.trim() || isQueryInHistory(editedSearchQuery)) return;

    setIsTestingCount(true);
    try {
      const result = await onTestCount(editedSearchQuery);
      setCurrentCount(result.total_count);

      // Add to history
      setQueryHistory([...queryHistory, {
        query: editedSearchQuery.trim(),
        count: result.total_count,
        changeDescription: "Tested query",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Query count test failed:', error);
    } finally {
      setIsTestingCount(false);
    }
  };

  // Optimize query using AI
  const handleOptimize = async () => {
    if (!editedSearchQuery?.trim()) return;

    setIsOptimizing(true);
    const previousQuery = editedSearchQuery;
    try {
      const result = await onOptimize(evidenceSpec);

      // Check if we got a valid result
      if (!result || !result.final_keywords) {
        throw new Error('Invalid optimization result received');
      }

      setEditedSearchQuery(result.final_keywords);
      setCurrentCount(result.final_count);

      // Add optimization to history
      setQueryHistory([...queryHistory, {
        query: result.final_keywords?.trim() || '',
        count: result.final_count || 0,
        changeDescription: "AI optimization applied",
        refinementDetails: result.refinement_applied || 'Query optimized',
        previousQuery: previousQuery,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Optimization failed:', error);

      // Add failed optimization attempt to history for transparency
      setQueryHistory([...queryHistory, {
        query: previousQuery,
        count: currentCount || 0,
        changeDescription: "AI optimization failed",
        refinementDetails: 'Optimization service error - query unchanged',
        timestamp: new Date()
      }]);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Copy query to textarea and load its count
  const handleCopyFromHistory = (query: string, count: number) => {
    setEditedSearchQuery(query);
    setCurrentCount(count);
  };

  // Delete query from history
  const handleDeleteFromHistory = (index: number) => {
    setQueryHistory(queryHistory.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6 dark:bg-gray-800 max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Search Keywords
      </h2>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Query History
          </h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-[80px_100px_1fr_60px] gap-3 text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div>Source</div>
              <div>Count</div>
              <div>Query</div>
              <div></div>
            </div>
            <div className="space-y-1 mt-2">
              {queryHistory.map((attempt, index) => (
                <div key={index} className="grid grid-cols-[80px_100px_1fr_60px] gap-3 items-center p-2 hover:bg-white dark:hover:bg-gray-800 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {attempt.changeDescription === "Generated from evidence specification" ? "System" :
                      attempt.changeDescription === "AI optimization applied" ? "AI" :
                        "User"}
                  </div>
                  <div className="flex items-center">
                    <Badge
                      variant={
                        attempt.count === 0 ? "destructive" :
                          attempt.count > 0 && attempt.count <= 250 ? "default" :
                            attempt.count <= 500 ? "secondary" : "destructive"
                      }
                      className="text-xs w-full justify-center"
                    >
                      {attempt.count === 0 ? (
                        "0"
                      ) : attempt.count > 0 && attempt.count <= 250 ? (
                        <>✅ {attempt.count.toLocaleString()}</>
                      ) : attempt.count <= 500 ? (
                        <>⚠️ {attempt.count.toLocaleString()}</>
                      ) : (
                        <>⚠️ {attempt.count.toLocaleString()}</>
                      )}
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                    {attempt.query && attempt.query.length > 80 ? `${attempt.query.substring(0, 80)}...` : (attempt.query || '')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                      onClick={() => handleCopyFromHistory(attempt.query || '', attempt.count || 0)}
                      title="Load this query"
                      disabled={!attempt.query}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => handleDeleteFromHistory(index)}
                      title="Delete from history"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Query Editor */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Current Search Query
          </label>
          <Textarea
            value={editedSearchQuery || ''}
            onChange={(e) => handleQueryChange(e.target.value)}
            rows={8}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
            placeholder={
              selectedSource === 'google_scholar'
                ? `"machine learning" healthcare diagnosis`
                : `(cannabis OR marijuana) AND (motivation OR apathy) AND (study OR research)`
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {selectedSource === 'google_scholar'
              ? 'Edit the natural language search query'
              : 'Edit the boolean search query'
            }
          </p>
        </div>

        {/* Current Count Display */}
        {currentCount !== null && (
          <div className={`p-4 rounded-lg border ${currentCount === 0
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : currentCount > 0 && currentCount <= 250
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : currentCount <= 500
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
            }`}>
            <div className="flex items-start gap-3">
              {currentCount === 0 ? (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              ) : currentCount > 0 && currentCount <= 250 ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : currentCount <= 500 ? (
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className={`text-sm font-medium mb-1 ${currentCount === 0
                    ? 'text-red-900 dark:text-red-100'
                    : currentCount > 0 && currentCount <= 250
                      ? 'text-green-900 dark:text-green-100'
                      : currentCount <= 500
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-amber-900 dark:text-amber-100'
                  }`}>
                  {currentCount === 0 ? (
                    'Query too restrictive - no results found'
                  ) : currentCount > 0 && currentCount <= 250 ? (
                    `Optimal range - all ${currentCount.toLocaleString()} articles will be processed`
                  ) : currentCount <= 500 ? (
                    `Good range - all ${currentCount.toLocaleString()} articles will be processed`
                  ) : (
                    `Large result set - only first 500 articles will be processed`
                  )}
                </div>
                <div className={`text-xs ${currentCount === 0
                    ? 'text-red-700 dark:text-red-300'
                    : currentCount > 0 && currentCount <= 250
                      ? 'text-green-700 dark:text-green-300'
                      : currentCount <= 500
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-amber-700 dark:text-amber-300'
                  }`}>
                  {currentCount === 0 ? (
                    'Broaden your search terms or remove restrictive filters'
                  ) : currentCount > 0 && currentCount <= 250 ? (
                    'Perfect size for comprehensive filtering'
                  ) : currentCount <= 500 ? (
                    'Good size for thorough analysis'
                  ) : (
                    'Consider refining your query for better relevance and faster processing'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestQuery}
              disabled={isTestingCount || !editedSearchQuery?.trim() || isQueryInHistory(editedSearchQuery)}
              variant="outline"
              size="sm"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400"
            >
              {isTestingCount ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  Testing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Test Count
                </>
              )}
            </Button>

            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !editedSearchQuery?.trim()}
              variant="outline"
              size="sm"
              className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Optimize
                </>
              )}
            </Button>
          </div>

          <Button
            onClick={onSubmit}
            disabled={loading || !editedSearchQuery?.trim()}
            className={
              currentCount === 0
                ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            }
          >
            {loading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                {currentCount === 0 ? 'Search Anyway' : 'Search with Current Query'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}