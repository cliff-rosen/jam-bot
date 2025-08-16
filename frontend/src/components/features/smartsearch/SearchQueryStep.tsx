import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Target, AlertTriangle, CheckCircle, TrendingDown, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface OptimizationResult {
  initial_query: string;
  initial_count: number;
  final_query: string;
  final_count: number;
  refinement_applied: string;
  refinement_status: 'optimal' | 'refined' | 'manual_needed';
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
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [queryCount, setQueryCount] = useState<{total_count: number; sources_searched: string[]} | null>(null);
  const [isTestingCount, setIsTestingCount] = useState(false);
  const [hasTestedQuery, setHasTestedQuery] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState<Array<{
    step: number;
    query: string;
    count: number;
    action: string;
    timestamp: Date;
  }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Set initial count when component loads
  useEffect(() => {
    if (initialCount && editedSearchQuery) {
      setQueryCount(initialCount);
      setHasTestedQuery(true);
      
      // Initialize optimization history with the starting point
      setOptimizationHistory([{
        step: 1,
        query: editedSearchQuery,
        count: initialCount.total_count,
        action: "Generated from evidence specification",
        timestamp: new Date()
      }]);
    }
  }, [initialCount, editedSearchQuery]);
  
  // Test current query count
  const handleTestQuery = async () => {
    setIsTestingCount(true);
    try {
      const result = await onTestCount(editedSearchQuery, sessionId);
      setQueryCount(result);
      setHasTestedQuery(true);
      
      // Add to optimization history
      setOptimizationHistory(prev => [...prev, {
        step: prev.length + 1,
        query: editedSearchQuery,
        count: result.total_count,
        action: "Manual retest",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Query count test failed:', error);
    } finally {
      setIsTestingCount(false);
    }
  };

  // Optimize query to reduce volume
  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const result = await onOptimize(evidenceSpec, sessionId);
      setOptimization(result);
      setEditedSearchQuery(result.final_query);
      setShowOptimization(true);
      
      // Test the optimized query count
      const countResult = await onTestCount(result.final_query, sessionId);
      setQueryCount(countResult);
      
      // Add optimization step to history
      setOptimizationHistory(prev => [...prev, {
        step: prev.length + 1,
        query: result.final_query,
        count: result.final_count,
        action: `Auto-optimized: ${result.refinement_applied}`,
        timestamp: new Date()
      }]);
      
      // Auto-expand the timeline to show the optimization
      setShowHistory(true);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Reset to retest after manual edits
  const handleQueryChange = (newQuery: string) => {
    setEditedSearchQuery(newQuery);
    setHasTestedQuery(false);
    setQueryCount(null);
    setOptimization(null);
    setShowOptimization(false);
    // Only reset history if this is a completely different query
    // (don't reset if user is just making minor edits)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600 dark:text-green-400';
      case 'refined': return 'text-blue-600 dark:text-blue-400';
      case 'manual_needed': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal': return <CheckCircle className="w-4 h-4" />;
      case 'refined': return <TrendingDown className="w-4 h-4" />;
      case 'manual_needed': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Search Keywords
      </h2>

      {/* Optimization History Timeline */}
      {optimizationHistory.length > 0 && (
        <div className="mb-6">
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Query Evolution Timeline
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {optimizationHistory.length} step{optimizationHistory.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {showHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-3">
                {/* Evidence Specification Starting Point */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300">
                    📋
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Starting Evidence Specification
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 break-words">
                      {evidenceSpec}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>

                {/* Query Evolution Steps */}
                {optimizationHistory.map((step, index) => (
                  <div key={step.step}>
                    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                      index === optimizationHistory.length - 1 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        index === optimizationHistory.length - 1
                          ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`text-sm font-medium ${
                            index === optimizationHistory.length - 1
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {step.action}
                          </div>
                          <Badge 
                            variant={step.count <= 250 ? "default" : "destructive"} 
                            className="text-xs"
                          >
                            {step.count.toLocaleString()} results
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all mb-1">
                          {step.query}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {step.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    {index < optimizationHistory.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Query Count Results */}
      {hasTestedQuery && queryCount && (
        <div className={`mb-6 p-4 rounded-lg border ${
          queryCount.total_count > 250 
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={queryCount.total_count > 250 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>
              {queryCount.total_count > 250 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </div>
            <h3 className={`font-medium ${
              queryCount.total_count > 250 
                ? 'text-amber-900 dark:text-amber-100' 
                : 'text-green-900 dark:text-green-100'
            }`}>
              Search Results Preview
            </h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Badge 
                variant={queryCount.total_count <= 250 ? "default" : "destructive"} 
                className="text-sm"
              >
                {queryCount.total_count.toLocaleString()} results found
              </Badge>
              <p className={`text-xs mt-1 ${
                queryCount.total_count > 250 
                  ? 'text-amber-700 dark:text-amber-300' 
                  : 'text-green-700 dark:text-green-300'
              }`}>
                Sources: {queryCount.sources_searched.join(', ')}
              </p>
            </div>
            
            {queryCount.total_count > 250 && (
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing}
                variant="outline"
                size="sm"
                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400"
              >
                {isOptimizing ? (
                  <>
                    <div className="animate-spin mr-2 h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Optimize to Reduce Volume
                  </>
                )}
              </Button>
            )}
          </div>
          
          {queryCount.total_count > 250 && (
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                ⚠️ <strong>Large result set detected.</strong> Consider optimizing for better filtering performance.
                Target: &lt;250 results for optimal semantic filtering.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Optimization Results */}
      {showOptimization && optimization && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-3">
            <div className={getStatusColor(optimization.refinement_status)}>
              {getStatusIcon(optimization.refinement_status)}
            </div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Optimization Applied
            </h3>
          </div>
          
          <div className="text-sm">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <p className="text-blue-700 dark:text-blue-300 font-medium">Before</p>
                <Badge variant="destructive" className="text-xs">
                  {optimization.initial_count.toLocaleString()} results
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-blue-700 dark:text-blue-300 font-medium">After</p>
                <Badge variant={optimization.final_count <= 250 ? "default" : "destructive"} className="text-xs">
                  {optimization.final_count.toLocaleString()} results
                </Badge>
              </div>
            </div>
            
            <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
              <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">Applied:</span>
              <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                {optimization.refinement_applied}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Search Keywords
          </label>
          <Textarea
            value={editedSearchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            rows={3}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
            placeholder="(cannabis OR marijuana) AND (motivation OR apathy) AND (study OR research)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Boolean search query with AND, OR operators. Target: &lt;250 results for optimal filtering.
          </p>
        </div>
        
        <div className="flex gap-3">
          {!hasTestedQuery ? (
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
                  Test Query Volume
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleTestQuery}
              disabled={isTestingCount}
              variant="ghost"
              size="sm"
              className="text-gray-600 dark:text-gray-400"
            >
              {isTestingCount ? (
                <>
                  <div className="animate-spin mr-2 h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                  Retesting...
                </>
              ) : (
                'Retest Query'
              )}
            </Button>
          )}
          
          <Button
            onClick={onSubmit}
            disabled={loading || !editedSearchQuery.trim()}
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
                Search Articles
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}