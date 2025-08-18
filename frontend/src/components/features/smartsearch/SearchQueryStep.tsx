import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Target, AlertTriangle, CheckCircle, Sparkles, Trash2, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';

interface OptimizationResult {
  initial_query: string;
  initial_count: number;
  final_query: string;
  final_count: number;
  refinement_applied: string;
  refinement_status: 'optimal' | 'refined' | 'manual_needed';
}

interface QueryAttempt {
  query: string;
  count: number;
  changeDescription?: string;
  refinementDetails?: string;
  previousQuery?: string;
  timestamp: Date;
}

interface SearchQueryStepProps {
  editedSearchQuery: string;
  setEditedSearchQuery: (query: string) => void;
  evidenceSpec: string;
  sessionId: string;
  selectedSource: string;
  onSubmit: () => void;
  onOptimize: (evidenceSpec: string, sessionId: string) => Promise<OptimizationResult>;
  onTestCount: (query: string, sessionId: string) => Promise<{total_count: number; sources_searched: string[]}>;
  loading: boolean;
  initialCount?: {total_count: number; sources_searched: string[]} | null;
}

export function SearchQueryStep({
  editedSearchQuery,
  setEditedSearchQuery,
  evidenceSpec,
  sessionId,
  selectedSource,
  onSubmit,
  onOptimize,
  onTestCount,
  loading,
  initialCount
}: SearchQueryStepProps) {
  const [queryHistory, setQueryHistory] = useState<QueryAttempt[]>([]);
  const [currentCount, setCurrentCount] = useState<number | null>(null);
  const [isTestingCount, setIsTestingCount] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Initialize with the generated query and count
  useEffect(() => {
    if (initialCount && editedSearchQuery && queryHistory.length === 0) {
      setQueryHistory([{
        query: editedSearchQuery,
        count: initialCount.total_count,
        changeDescription: "Generated from evidence specification",
        timestamp: new Date()
      }]);
      setCurrentCount(initialCount.total_count);
    }
  }, [initialCount, editedSearchQuery]);

  // Clear current count when query is edited
  const handleQueryChange = (newQuery: string) => {
    setEditedSearchQuery(newQuery);
    // Clear the current count since the query has changed
    setCurrentCount(null);
  };

  // Test current query count
  const handleTestQuery = async () => {
    if (!editedSearchQuery.trim()) return;
    
    setIsTestingCount(true);
    try {
      const result = await onTestCount(editedSearchQuery, sessionId);
      setCurrentCount(result.total_count);
      
      // Add to history only if it's different from the last entry
      const lastEntry = queryHistory[queryHistory.length - 1];
      if (!lastEntry || lastEntry.query !== editedSearchQuery) {
        setQueryHistory(prev => [...prev, {
          query: editedSearchQuery,
          count: result.total_count,
          changeDescription: "Manual edit and test",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Query count test failed:', error);
    } finally {
      setIsTestingCount(false);
    }
  };

  // Optimize query to reduce volume
  const handleOptimize = async () => {
    setIsOptimizing(true);
    const previousQuery = editedSearchQuery;
    try {
      const result = await onOptimize(evidenceSpec, sessionId);
      setEditedSearchQuery(result.final_query);
      setCurrentCount(result.final_count);
      
      // Add optimization to history with clear explanation
      setQueryHistory(prev => [...prev, {
        query: result.final_query,
        count: result.final_count,
        changeDescription: `Suggested optimization applied`,
        refinementDetails: result.refinement_applied,
        previousQuery: previousQuery,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Card className="p-6 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Search Keywords
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Target:</span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-medium text-gray-900 dark:text-gray-100">
            {selectedSource === 'google_scholar' ? 'Google Scholar' : 'PubMed'}
          </span>
        </div>
      </div>

      {/* Evidence Specification - Always Visible */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
          Evidence Specification
        </div>
        <div className="text-sm text-blue-700 dark:text-blue-300">
          {evidenceSpec}
        </div>
      </div>

      {/* Query History - Always Visible */}
      {queryHistory.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Query Optimization History
          </div>
          
          {queryHistory.map((attempt, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border ${
                attempt.count > 0 && attempt.count <= 250
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    attempt.count > 0 && attempt.count <= 250
                      ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {attempt.changeDescription}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={attempt.count > 0 && attempt.count <= 250 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {attempt.count.toLocaleString()} results
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => {
                      setEditedSearchQuery(attempt.query);
                      setCurrentCount(attempt.count);
                    }}
                    title="Use this query"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => {
                      setQueryHistory(prev => prev.filter((_, i) => i !== index));
                    }}
                    title="Delete from history"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="ml-8 text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                {attempt.query}
              </div>
              {attempt.refinementDetails && (
                <div className="ml-8 mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-medium">What changed: </span>
                  {attempt.refinementDetails}
                </div>
              )}
              {index > 0 && queryHistory[index - 1] && (
                <div className="ml-8 mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Result change: {attempt.count - queryHistory[index - 1].count < 0 ? '↓' : '↑'} 
                  {' '}{Math.abs(attempt.count - queryHistory[index - 1].count).toLocaleString()} results
                  {attempt.count > 0 && attempt.count <= 250 && (queryHistory[index - 1].count > 250 || queryHistory[index - 1].count === 0) && (
                    <span className="ml-2 text-green-600 dark:text-green-400 font-medium">✓ Target achieved</span>
                  )}
                  {attempt.count === 0 && (
                    <span className="ml-2 text-red-600 dark:text-red-400 font-medium">⚠ Too restrictive - no results</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Current Query Editor */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Current Search Query
          </label>
          <Textarea
            value={editedSearchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            rows={3}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
            placeholder={
              selectedSource === 'google_scholar' 
                ? `"machine learning" healthcare diagnosis`
                : `(cannabis OR marijuana) AND (motivation OR apathy) AND (study OR research)`
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {selectedSource === 'google_scholar' 
              ? 'Edit the natural language search query and test to see the result count'
              : 'Edit the boolean search query and test to see the result count'
            }
          </p>
        </div>

        {/* Current Count Display */}
        {currentCount !== null && (
          <div className={`p-3 rounded-lg border ${
            currentCount > 0 && currentCount <= 250
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : currentCount === 0
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentCount > 0 && currentCount <= 250 ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className={`w-4 h-4 ${
                    currentCount === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                  }`} />
                )}
                <span className={`text-sm font-medium ${
                  currentCount > 0 && currentCount <= 250
                    ? 'text-green-900 dark:text-green-100'
                    : currentCount === 0
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-amber-900 dark:text-amber-100'
                }`}>
                  Current query will return {currentCount.toLocaleString()} results
                </span>
              </div>
              {(currentCount > 250 || currentCount === 0) && (
                <Badge variant="destructive" className="text-xs">
                  Target: 1-250
                </Badge>
              )}
            </div>
            {currentCount > 250 && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                Consider optimizing to reduce the result set for better filtering performance
              </p>
            )}
            {currentCount === 0 && (
              <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                Query is too restrictive. Try removing some filters or using broader terms
              </p>
            )}
          </div>
        )}

        {/* Action Buttons - Test and Optimize Section */}
        <div className="space-y-3">
          {/* Test Count and Optimization Row */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleTestQuery}
              disabled={isTestingCount || !editedSearchQuery.trim()}
              variant="outline"
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

            {currentCount !== null && (currentCount > 250 || currentCount === 0) && (
              <>
                <span className="text-xs text-gray-500">or</span>
                <Button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  variant="outline"
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
                      Suggest Optimization
                    </>
                  )}
                </Button>
              </>
            )}

            {currentCount === null && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                Test the query to see result count
              </span>
            )}
          </div>

          {/* Optimization Help Text */}
          {currentCount !== null && (currentCount > 250 || currentCount === 0) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 ml-1">
              {currentCount > 250 
                ? 'The "Suggest Optimization" button will analyze the current query text above and add filters to reduce results below 250'
                : 'The "Suggest Optimization" button will analyze the current query text above and adjust filters to find results'
              }
            </p>
          )}

          {/* Search Button - Separate Row */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={onSubmit}
              disabled={loading || !editedSearchQuery.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {loading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search Articles with Current Query
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}