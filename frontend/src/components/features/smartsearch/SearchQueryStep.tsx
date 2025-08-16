import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Target, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
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
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Search Keywords
      </h2>

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
                attempt.count <= 250
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    attempt.count <= 250
                      ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {attempt.changeDescription}
                  </div>
                </div>
                <Badge 
                  variant={attempt.count <= 250 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {attempt.count.toLocaleString()} results
                </Badge>
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
                  {attempt.count <= 250 && queryHistory[index - 1].count > 250 && (
                    <span className="ml-2 text-green-600 dark:text-green-400 font-medium">✓ Target achieved</span>
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
            placeholder="(cannabis OR marijuana) AND (motivation OR apathy) AND (study OR research)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Edit the boolean search query and test to see the result count
          </p>
        </div>

        {/* Current Count Display */}
        {currentCount !== null && (
          <div className={`p-3 rounded-lg border ${
            currentCount <= 250
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentCount <= 250 ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
                <span className={`text-sm font-medium ${
                  currentCount <= 250
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-amber-900 dark:text-amber-100'
                }`}>
                  Current query will return {currentCount.toLocaleString()} results
                </span>
              </div>
              {currentCount > 250 && (
                <Badge variant="destructive" className="text-xs">
                  Target: ≤250
                </Badge>
              )}
            </div>
            {currentCount > 250 && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                Consider optimizing to reduce the result set for better filtering performance
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

            {currentCount !== null && currentCount > 250 && (
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
          {currentCount !== null && currentCount > 250 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 ml-1">
              The "Suggest Optimization" button will analyze the current query text above and add filters to reduce results below 250
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