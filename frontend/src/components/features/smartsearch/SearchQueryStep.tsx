import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Target, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { useState } from 'react';

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
  loading: boolean;
}

export function SearchQueryStep({
  editedSearchQuery,
  setEditedSearchQuery,
  evidenceSpec,
  sessionId,
  onSubmit,
  onOptimize,
  loading
}: SearchQueryStepProps) {
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const result = await onOptimize(evidenceSpec, sessionId);
      setOptimization(result);
      setEditedSearchQuery(result.final_query);
      setShowOptimization(true);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Search Keywords
        </h2>
        
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing || loading}
          variant="outline"
          size="sm"
          className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400"
        >
          {isOptimizing ? (
            <>
              <div className="animate-spin mr-2 h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
              Optimizing...
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Optimize for Volume
            </>
          )}
        </Button>
      </div>

      {/* Optimization Results */}
      {showOptimization && optimization && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-3">
            <div className={getStatusColor(optimization.refinement_status)}>
              {getStatusIcon(optimization.refinement_status)}
            </div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              Query Optimization Results
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">Initial Query:</span>
              <p className="text-blue-700 dark:text-blue-300 font-mono text-xs mt-1 p-2 bg-blue-100 dark:bg-blue-800 rounded">
                {optimization.initial_query}
              </p>
              <Badge variant="outline" className="mt-1 text-xs">
                {optimization.initial_count.toLocaleString()} results
              </Badge>
            </div>
            
            <div>
              <span className="font-medium text-blue-800 dark:text-blue-200">Optimized Query:</span>
              <p className="text-blue-700 dark:text-blue-300 font-mono text-xs mt-1 p-2 bg-blue-100 dark:bg-blue-800 rounded">
                {optimization.final_query}
              </p>
              <Badge 
                variant={optimization.final_count <= 250 ? "default" : "destructive"} 
                className="mt-1 text-xs"
              >
                {optimization.final_count.toLocaleString()} results {optimization.final_count <= 250 ? '✓' : '⚠️'}
              </Badge>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">Refinements Applied:</span>
            <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
              {optimization.refinement_applied}
            </p>
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
            onChange={(e) => setEditedSearchQuery(e.target.value)}
            rows={3}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
            placeholder="(cannabis OR marijuana) AND (motivation OR apathy) AND (study OR research)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Boolean search query with AND, OR operators. Target: <250 results for optimal filtering.
          </p>
        </div>
        
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
    </Card>
  );
}