import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Target, AlertTriangle, CheckCircle, Sparkles, Copy } from 'lucide-react';
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
      setQueryHistory(prev => [...prev, {
        query: editedSearchQuery,
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
      setEditedSearchQuery(result.final_query);
      setCurrentCount(result.final_count);
      
      // Add optimization to history
      setQueryHistory(prev => [...prev, {
        query: result.final_query,
        count: result.final_count,
        changeDescription: "AI optimization applied",
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

  // Copy query to textarea
  const handleCopyFromHistory = (query: string) => {
    setEditedSearchQuery(query);
    setCurrentCount(null);
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
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {queryHistory.map((attempt, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-gray-800 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {attempt.changeDescription}
                    </span>
                    <Badge 
                      variant={
                        attempt.count === 0 ? "destructive" : 
                        attempt.count > 0 && attempt.count <= 250 ? "default" : 
                        attempt.count <= 500 ? "secondary" : "destructive"
                      }
                      className="text-xs flex-shrink-0"
                    >
                      {attempt.count === 0 ? (
                        "0 results"
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
                    {attempt.query.length > 60 ? `${attempt.query.substring(0, 60)}...` : attempt.query}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                  onClick={() => handleCopyFromHistory(attempt.query)}
                  title="Copy to current query"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            ))}
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
              ? 'Edit the natural language search query'
              : 'Edit the boolean search query'
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
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {loading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search with Current Query
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}