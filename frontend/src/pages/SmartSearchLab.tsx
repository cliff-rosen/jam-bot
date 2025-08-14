import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { smartSearchApi } from '@/lib/api/smartSearchApi';

import type {
  SmartSearchRefinement,
  SearchQueryGeneration,
  SearchResults,
  FilteredArticle,
  FilteringProgress,
  StreamMessage
} from '@/types/smart-search';
import {
  Search,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export default function SmartSearchLab() {
  // Step management
  const [step, setStep] = useState<'query' | 'refinement' | 'search-query' | 'searching' | 'search-results' | 'filtering' | 'results'>('query');

  // Step 1: Query input
  const [query, setQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);

  // Step 2: Refinement
  const [refinement, setRefinement] = useState<SmartSearchRefinement | null>(null);
  const [editedQuery, setEditedQuery] = useState('');
  
  // Step 3: Search Query Generation
  const [searchQueryGeneration, setSearchQueryGeneration] = useState<SearchQueryGeneration | null>(null);
  const [editedSearchQuery, setEditedSearchQuery] = useState('');
  const [searchQueryLoading, setSearchQueryLoading] = useState(false);

  // Step 4: Search results and curation
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Step 5: Filtering
  const [filteringProgress, setFilteringProgress] = useState<FilteringProgress | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<FilteredArticle[]>([]);
  const [strictness, setStrictness] = useState<'low' | 'medium' | 'high'>('medium');

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll for messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteringProgress]);

  // Step 1: Submit query for refinement
  const handleRefineQuery = async () => {
    if (!query.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a research question',
        variant: 'destructive'
      });
      return;
    }

    setQueryLoading(true);
    try {
      const response = await smartSearchApi.refineQuestion({ query });
      setRefinement(response);
      setEditedQuery(response.refined_query);
      setStep('refinement');

      toast({
        title: 'Query Refined',
        description: 'Review and edit the refined query'
      });
    } catch (error) {
      toast({
        title: 'Refinement Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setQueryLoading(false);
    }
  };

  // Step 2: Generate search query from refined query
  const handleGenerateSearchQuery = async () => {
    if (!editedQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a refined query',
        variant: 'destructive'
      });
      return;
    }
    
    setSearchQueryLoading(true);
    try {
      const response = await smartSearchApi.generateSearchQuery({ 
        refined_query: editedQuery 
      });
      setSearchQueryGeneration(response);
      setEditedSearchQuery(response.search_query);
      setStep('search-query');
      
      toast({
        title: 'Search Query Generated',
        description: 'Review and edit the boolean search query'
      });
    } catch (error) {
      toast({
        title: 'Search Query Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setSearchQueryLoading(false);
    }
  };

  // Step 3: Execute search
  const handleExecuteSearch = async () => {
    if (!editedSearchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a search query',
        variant: 'destructive'
      });
      return;
    }

    setSearchLoading(true);
    setStep('searching');

    try {
      const results = await smartSearchApi.executeSearch({
        search_query: editedSearchQuery,
        max_results: 50
      });

      if (results.articles.length === 0) {
        toast({
          title: 'No Results',
          description: 'No articles found. Try a different search query.',
          variant: 'destructive'
        });
        setStep('search-query');
      } else {
        toast({
          title: 'Search Complete',
          description: `Found ${results.total_found} articles from ${results.sources_searched.join(', ')}`
        });
        // Automatically start filtering
        handleStartFiltering(results);
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      setStep('refinement');
    } finally {
      setSearchLoading(false);
    }
  };

  // Step 3: Start filtering
  const handleStartFiltering = async (results: SearchResults) => {
    setStep('filtering');
    setFilteredArticles([]);
    setFilteringProgress({
      total: results.articles.length,
      processed: 0,
      accepted: 0,
      rejected: 0
    });

    try {
      await smartSearchApi.filterArticlesStreaming(
        {
          articles: results.articles,
          refined_query: editedQuery,
          search_query: editedSearchQuery,
          strictness
        },
        // onMessage
        (message: StreamMessage) => {
          if (message.type === 'progress' && message.data) {
            setFilteringProgress(message.data as FilteringProgress);
          }
        },
        // onArticle
        (article: FilteredArticle) => {
          setFilteredArticles(prev => [...prev, article]);
        },
        // onComplete
        (stats: any) => {
          setStep('results');
          toast({
            title: 'Filtering Complete',
            description: `${stats.accepted} of ${stats.total_processed} articles passed the filter`
          });
        },
        // onError
        (error: string) => {
          toast({
            title: 'Filtering Failed',
            description: error,
            variant: 'destructive'
          });
        }
      );
    } catch (error) {
      toast({
        title: 'Failed to Start Filtering',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };


  // Reset to start
  const handleReset = () => {
    setStep('query');
    setQuery('');
    setRefinement(null);
    setEditedQuery('');
    setSearchQueryGeneration(null);
    setEditedSearchQuery('');
    setFilteredArticles([]);
    setFilteringProgress(null);
  };

  // Get accepted articles
  const acceptedArticles = filteredArticles.filter(fa => fa.passed);
  const rejectedArticles = filteredArticles.filter(fa => !fa.passed);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Smart Search Lab
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI-powered research article discovery with semantic filtering
            </p>
          </div>
          {step !== 'query' && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="dark:border-gray-600 dark:text-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>

        {/* Progress Steps - Updated to show the actual flow */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge variant={step === 'query' ? 'default' : 'secondary'}>1. Enter Query</Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'refinement' ? 'default' : step !== 'query' ? 'secondary' : 'outline'}>
            2. Refine Query
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'refinement' ? 'default' : step !== 'query' ? 'secondary' : 'outline'}>
            3. Generate Keywords
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'searching' ? 'default' : ['filtering', 'results'].includes(step) ? 'secondary' : 'outline'}>
            4. Search
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'filtering' ? 'default' : step === 'results' ? 'secondary' : 'outline'}>
            5. Filter (Discriminator)
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'results' ? 'default' : 'outline'}>6. Results</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Step 1: Question Input */}
          {step === 'query' && (
            <Card className="p-6 dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Enter Your Research Question
              </h2>
              <div className="space-y-4">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., What are the effects of CRISPR gene editing on cancer treatment outcomes?"
                  rows={4}
                  className="dark:bg-gray-700 dark:text-gray-100"
                />
                <Button
                  onClick={handleRefineQuery}
                  disabled={queryLoading || !query.trim()}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {queryLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Refine & Generate Keywords
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Question Review */}
          {step === 'refinement' && refinement && (
            <Card className="p-6 dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Review Refined Question
              </h2>

              {/* Show the flow */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Step Completed:</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ✓ Original query refined for clarity and specificity
                </p>
              </div>

              <div className="space-y-4">
                {/* Original vs Refined Query */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Original Query
                    </label>
                    <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm text-gray-900 dark:text-gray-100">
                      {refinement.original_query}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Refined Query (Step 2 Output)
                    </label>
                    <Textarea
                      value={editedQuery}
                      onChange={(e) => setEditedQuery(e.target.value)}
                      rows={3}
                      className="dark:bg-gray-700 dark:text-gray-100 text-sm"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerateSearchQuery}
                  disabled={searchQueryLoading || !editedQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {searchQueryLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Generate Search Query
                    </>
                  )}
                </Button>

              </div>
            </Card>
          )}
          
          {/* Step 3: Search Query Review */}
          {step === 'search-query' && searchQueryGeneration && (
            <Card className="p-6 dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Review Search Query
              </h2>
              
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Step Completed:</h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Boolean search query generated from refined question
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Generated Search Query
                  </label>
                  <Textarea
                    value={editedSearchQuery}
                    onChange={(e) => setEditedSearchQuery(e.target.value)}
                    rows={3}
                    className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
                    placeholder="(cancer OR carcinoma) AND (treatment OR therapy) AND CRISPR"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Boolean search query with AND, OR, NOT operators and parentheses for grouping
                  </p>
                </div>
                
                {/* Strictness Setting */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Filter Strictness
                  </label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <Button
                        key={level}
                        variant={strictness === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStrictness(level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {strictness === 'low' && 'More inclusive - accepts somewhat related articles'}
                    {strictness === 'medium' && 'Balanced - accepts clearly related articles'}
                    {strictness === 'high' && 'Strict - only accepts directly relevant articles'}
                  </p>
                </div>
                
                <Button
                  onClick={handleExecuteSearch}
                  disabled={searchLoading || !editedSearchQuery.trim()}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                >
                  {searchLoading ? (
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
          )}

          {/* Step 4: Search & Filter Progress */}
          {step === 'searching' && (
            <Card className="p-6 dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Searching Articles...
              </h2>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Searching across multiple databases...
                </p>
              </div>
            </Card>
          )}

          {/* Step 5: Filtering Progress */}
          {step === 'filtering' && filteringProgress && (
            <Card className="p-6 dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Applying Semantic Filter
              </h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{filteringProgress.processed} / {filteringProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(filteringProgress.processed / filteringProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {filteringProgress.accepted}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {filteringProgress.rejected}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {filteringProgress.total - filteringProgress.processed}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
                </div>
              </div>

              {/* Current Article */}
              {filteringProgress.current_article && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Currently evaluating:</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {filteringProgress.current_article}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </Card>
          )}

          {/* Step 6: Results Display */}
          {step === 'results' && (
            <>
              {/* Summary Card */}
              <Card className="p-6 dark:bg-gray-800">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Filtering Complete
                </h2>

                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {filteredArticles.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {acceptedArticles.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {rejectedArticles.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {acceptedArticles.length > 0
                        ? Math.round((acceptedArticles.reduce((sum, a) => sum + a.confidence, 0) / acceptedArticles.length) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</div>
                  </div>
                </div>
              </Card>

              {/* Accepted Articles */}
              {acceptedArticles.length > 0 && (
                <Card className="p-6 dark:bg-gray-800">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-2" />
                    Accepted Articles ({acceptedArticles.length})
                  </h3>
                  <div className="space-y-3">
                    {acceptedArticles.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex-1">
                            {item.article.title}
                          </h4>
                          <Badge variant="secondary" className="ml-2">
                            {Math.round(item.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {item.article.authors.slice(0, 3).join(', ')}
                          {item.article.authors.length > 3 && ' et al.'}
                          {item.article.year && ` (${item.article.year})`}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                          {item.article.abstract}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            {item.reasoning}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.article.source}
                            </Badge>
                            {item.article.url && (
                              <a
                                href={item.article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                </Card>
              )}

          {/* Rejected Articles (Collapsed by default) */}
          {rejectedArticles.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer">
                <Card className="p-6 dark:bg-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                    <X className="w-5 h-5 text-red-600 mr-2" />
                    Rejected Articles ({rejectedArticles.length})
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      (Click to expand)
                    </span>
                  </h3>
                </Card>
              </summary>
              <Card className="p-6 dark:bg-gray-800 mt-2">
                <div className="space-y-3">
                  {rejectedArticles.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg opacity-60"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                          {item.article.title}
                        </h4>
                        <Badge variant="outline" className="ml-2 text-red-600">
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Reason: {item.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </details>
          )}
        </>
          )}

      </div>
    </div>
    </div >
  );
}