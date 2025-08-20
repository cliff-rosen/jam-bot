import { useRef, useEffect } from 'react';
import { ChevronRight, RefreshCw, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

import { useSmartSearch } from '@/context/SmartSearchContext';

import { QueryInputStep } from '@/components/features/smartsearch/QueryInputStep';
import { RefinementStep } from '@/components/features/smartsearch/RefinementStep';
import { SearchQueryStep } from '@/components/features/smartsearch/SearchQueryStep';
import { SearchingStep } from '@/components/features/smartsearch/SearchingStep';
import { SearchResultsStep } from '@/components/features/smartsearch/SearchResultsStep';
import { DiscriminatorStep } from '@/components/features/smartsearch/DiscriminatorStep';
import { FilteringStep } from '@/components/features/smartsearch/FilteringStep';
import { ResultsStep } from '@/components/features/smartsearch/ResultsStep';

export default function SmartSearchLab() {
  const smartSearch = useSmartSearch();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll for messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [smartSearch.filteringProgress]);

  // ================== HANDLERS ==================

  // Step 1: Submit query for evidence specification
  const handleCreateEvidenceSpec = async () => {
    if (!smartSearch.query.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your document search query',
        variant: 'destructive'
      });
      return;
    }

    try {
      await smartSearch.createEvidenceSpecification(smartSearch.query, smartSearch.sessionId || undefined);
      smartSearch.updateStep('refinement');

      toast({
        title: 'Evidence Specification Created',
        description: 'Review and edit the evidence specification'
      });
    } catch (error) {
      toast({
        title: 'Evidence Specification Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Test query count without retrieving articles
  const handleTestQueryCount = async (query: string) => {
    if (!smartSearch.sessionId) throw new Error('No session ID');
    
    try {
      return await smartSearch.testQueryCount(query, smartSearch.sessionId, [smartSearch.selectedSource]);
    } catch (error) {
      console.error('Query count test failed:', error);
      throw error;
    }
  };

  // Handle query optimization for volume control
  const handleOptimizeQuery = async (evidenceSpecification: string) => {
    if (!smartSearch.sessionId) throw new Error('No session ID');
    
    try {
      return await smartSearch.generateOptimizedQuery(
        smartSearch.editedSearchQuery,
        evidenceSpecification,
        smartSearch.sessionId,
        [smartSearch.selectedSource]
      );
    } catch (error) {
      console.error('Query optimization failed:', error);
      throw error;
    }
  };

  // Step 2: Generate search keywords from evidence specification
  const handleGenerateKeywords = async (source?: string) => {
    if (!smartSearch.evidenceSpec.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide an evidence specification',
        variant: 'destructive'
      });
      return;
    }

    if (!smartSearch.sessionId) {
      toast({
        title: 'Error',
        description: 'No session found',
        variant: 'destructive'
      });
      return;
    }

    // Update selected source if provided
    if (source) {
      smartSearch.updateSelectedSource(source);
    }

    try {
      const response = await smartSearch.generateSearchKeywords(
        smartSearch.evidenceSpec,
        smartSearch.sessionId,
        [source || smartSearch.selectedSource]
      );

      // Automatically test the generated query count
      try {
        const countResult = await handleTestQueryCount(response.search_query);
        smartSearch.updateStep('search-query');

        if (countResult.total_count > 250) {
          toast({
            title: 'Keywords Generated',
            description: `Query generated ${countResult.total_count.toLocaleString()} results. Consider optimizing for better performance.`,
            variant: 'default'
          });
        } else {
          toast({
            title: 'Keywords Generated',
            description: `Query generated ${countResult.total_count.toLocaleString()} results. Ready to search!`
          });
        }
      } catch (countError) {
        // If count test fails, still proceed to search-query step
        smartSearch.updateStep('search-query');
        toast({
          title: 'Keywords Generated',
          description: 'Review and test the search keywords'
        });
      }

    } catch (error) {
      toast({
        title: 'Keyword Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Step 3: Execute search
  const handleExecuteSearch = async () => {
    if (!smartSearch.editedSearchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide search keywords',
        variant: 'destructive'
      });
      return;
    }

    if (!smartSearch.sessionId) {
      toast({
        title: 'Error',
        description: 'No session found',
        variant: 'destructive'
      });
      return;
    }

    smartSearch.updateStep('searching');

    try {
      const results = await smartSearch.executeSearch(
        smartSearch.editedSearchQuery,
        smartSearch.sessionId,
        [smartSearch.selectedSource]
      );

      if (results.articles.length === 0) {
        toast({
          title: 'No Results',
          description: 'No articles found. Try different search keywords',
          variant: 'destructive'
        });
        smartSearch.updateStep('search-query');
      } else {
        toast({
          title: 'Search Complete',
          description: `Found ${results.pagination.returned} articles (${results.pagination.total_available} total available) from ${results.sources_searched.join(', ')}`
        });
        // Go to search results review step
        smartSearch.updateStep('search-results');
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      smartSearch.updateStep('refinement');
    }
  };

  // Initialize filtering UI state
  const initializeFilteringState = (totalCount: number) => {
    smartSearch.updateStep('filtering');
    smartSearch.updateFilteringProgress({
      total: totalCount,
      processed: 0,
      accepted: 0,
      rejected: 0
    });
  };

  // Handle filtering errors
  const handleFilteringError = (error: unknown) => {
    toast({
      title: 'Failed to Start Filtering',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive'
    });
  };

  // Step 4: Start filtering - always filter all articles
  const handleStartFiltering = async () => {
    if (!smartSearch.searchResults || !smartSearch.sessionId) return;

    // Always filter all available search results
    const articlesToProcess = Math.min(smartSearch.searchResults.pagination.total_available, 500);

    initializeFilteringState(articlesToProcess);

    const request = {
      filter_mode: 'all' as const,
      evidence_specification: smartSearch.evidenceSpec,
      search_query: smartSearch.editedSearchQuery,
      strictness: smartSearch.strictness,
      discriminator_prompt: smartSearch.editedDiscriminator,
      session_id: smartSearch.sessionId,
      selected_sources: [smartSearch.selectedSource],
      max_results: articlesToProcess
    };

    try {
      // Always use parallel processing - it's much faster
      console.log(`Processing ${articlesToProcess} articles in parallel...`);

      const startTime = Date.now();
      const response = await smartSearch.filterArticles(request);
      const duration = Date.now() - startTime;

      // Update progress to show completion
      smartSearch.updateFilteringProgress({
        total: response.total_processed,
        processed: response.total_processed,
        accepted: response.total_accepted,
        rejected: response.total_rejected
      });

      // Complete immediately
      smartSearch.updateStep('results');

      toast({
        title: 'Filtering Complete',
        description: `Processed ${response.total_processed} articles in ${(duration / 1000).toFixed(1)}s: ${response.total_accepted} accepted, ${response.total_rejected} rejected`
      });

    } catch (error) {
      handleFilteringError(error);
    }
  };

  // Generate discriminator for review
  const handleGenerateDiscriminator = async () => {
    if (!smartSearch.searchResults || !smartSearch.sessionId) return;

    try {
      await smartSearch.generateDiscriminator(
        smartSearch.evidenceSpec,
        smartSearch.editedSearchQuery,
        smartSearch.strictness,
        smartSearch.sessionId
      );

      smartSearch.updateStep('discriminator');

      toast({
        title: 'Discriminator Generated',
        description: 'Review and edit the semantic evaluation criteria'
      });
    } catch (error) {
      toast({
        title: 'Discriminator Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Generate discriminator - always filters all results
  const handleProceedToDiscriminator = async () => {
    if (!smartSearch.searchResults) return;

    // Generate discriminator for filtering all results
    await handleGenerateDiscriminator();
  };

  // Load more search results
  const handleLoadMoreResults = async () => {
    if (!smartSearch.searchResults || !smartSearch.editedSearchQuery.trim() || !smartSearch.sessionId) return;

    try {
      const batchSize = smartSearch.selectedSource === 'google_scholar' ? 20 : 50;
      const moreResults = await smartSearch.executeSearch(
        smartSearch.editedSearchQuery,
        smartSearch.sessionId,
        [smartSearch.selectedSource],
        smartSearch.searchResults.articles.length,
        batchSize
      );

      toast({
        title: 'More Results Loaded',
        description: `Loaded ${moreResults.articles.length} more articles`
      });
    } catch (error) {
      toast({
        title: 'Failed to Load More Results',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Step navigation functions
  const handleStepBack = async (targetStep: string) => {
    if (!smartSearch.sessionId || !smartSearch.canNavigateToStep(targetStep as any)) return;

    try {
      // Map frontend step names to backend step names
      const stepMapping: Record<string, string> = {
        'query': 'question_input',
        'refinement': 'question_refinement',
        'search-query': 'search_query_generation',
        'search-results': 'search_execution',
        'discriminator': 'discriminator_generation',
        'filtering': 'filtering'
      };

      const backendStep = stepMapping[targetStep];
      if (!backendStep) return;

      // Call backend to reset session
      await smartSearch.resetToStep(smartSearch.sessionId, backendStep);

      // Navigate to target step
      smartSearch.updateStep(targetStep as any);

      toast({
        title: 'Stepped Back',
        description: `Returned to ${targetStep.replace('-', ' ')} step`,
      });

    } catch (error) {
      toast({
        title: 'Failed to Step Back',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handleReset = () => {
    smartSearch.resetAllState();
  };

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Smart Search Lab
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI-powered document discovery with semantic filtering
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/search-history">
              <Button
                variant="outline"
                className="dark:border-gray-600 dark:text-gray-300"
              >
                <History className="w-4 h-4 mr-2" />
                Search History
              </Button>
            </Link>
            {smartSearch.step !== 'query' && (
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
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge
            variant={smartSearch.step === 'query' ? 'default' : 'secondary'}
            className={smartSearch.canNavigateToStep('query') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={smartSearch.canNavigateToStep('query') ? () => handleStepBack('query') : undefined}
          >
            1. Enter Search Request
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={smartSearch.step === 'refinement' ? 'default' : !['query'].includes(smartSearch.step) ? 'secondary' : 'outline'}
            className={smartSearch.canNavigateToStep('refinement') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={smartSearch.canNavigateToStep('refinement') ? () => handleStepBack('refinement') : undefined}
          >
            2. Evidence Specification
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={smartSearch.step === 'search-query' ? 'default' : !['query', 'refinement'].includes(smartSearch.step) ? 'secondary' : 'outline'}
            className={smartSearch.canNavigateToStep('search-query') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={smartSearch.canNavigateToStep('search-query') ? () => handleStepBack('search-query') : undefined}
          >
            3. Generate Keywords
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={smartSearch.step === 'searching' ? 'default' : ['search-results', 'discriminator', 'filtering', 'results'].includes(smartSearch.step) ? 'secondary' : 'outline'}
            className={smartSearch.canNavigateToStep('search-results') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={smartSearch.canNavigateToStep('search-results') ? () => handleStepBack('search-results') : undefined}
          >
            4. Search
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={smartSearch.step === 'search-results' ? 'default' : ['discriminator', 'filtering', 'results'].includes(smartSearch.step) ? 'secondary' : 'outline'}
            className={smartSearch.canNavigateToStep('search-results') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={smartSearch.canNavigateToStep('search-results') ? () => handleStepBack('search-results') : undefined}
          >
            5. Review Results
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={smartSearch.step === 'discriminator' ? 'default' : ['filtering', 'results'].includes(smartSearch.step) ? 'secondary' : 'outline'}
            className={smartSearch.canNavigateToStep('discriminator') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={smartSearch.canNavigateToStep('discriminator') ? () => handleStepBack('discriminator') : undefined}
          >
            6. Filter Criteria
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={smartSearch.step === 'filtering' ? 'default' : smartSearch.step === 'results' ? 'secondary' : 'outline'}>
            7. Filter
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={smartSearch.step === 'results' ? 'default' : 'outline'}>8. Results</Badge>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="w-full space-y-6">
          {/* Step Components */}
          {smartSearch.step === 'query' && (
            <QueryInputStep
              query={smartSearch.query}
              setQuery={smartSearch.updateQuery}
              onSubmit={handleCreateEvidenceSpec}
              loading={smartSearch.queryLoading}
            />
          )}

          {smartSearch.step === 'refinement' && smartSearch.refinement && (
            <RefinementStep
              refinement={smartSearch.refinement}
              evidenceSpec={smartSearch.evidenceSpec}
              setEvidenceSpec={smartSearch.updateEvidenceSpec}
              selectedSource={smartSearch.selectedSource}
              setSelectedSource={smartSearch.updateSelectedSource}
              onSubmit={handleGenerateKeywords}
              loading={smartSearch.searchQueryLoading}
            />
          )}

          {smartSearch.step === 'search-query' && smartSearch.searchQueryGeneration && (
            <SearchQueryStep
              editedSearchQuery={smartSearch.editedSearchQuery}
              setEditedSearchQuery={smartSearch.updateEditedSearchQuery}
              evidenceSpec={smartSearch.evidenceSpec}
              selectedSource={smartSearch.selectedSource}
              onSubmit={handleExecuteSearch}
              onOptimize={handleOptimizeQuery}
              onTestCount={handleTestQueryCount}
              loading={smartSearch.searchLoading}
              initialCount={smartSearch.initialQueryCount}
            />
          )}

          {smartSearch.step === 'searching' && <SearchingStep />}

          {smartSearch.step === 'search-results' && smartSearch.searchResults && (
            <SearchResultsStep
              searchResults={smartSearch.searchResults}
              onSubmit={handleProceedToDiscriminator}
              onLoadMore={handleLoadMoreResults}
              onGoBack={() => handleStepBack('search-query')}
              loading={smartSearch.discriminatorLoading}
              loadingMore={smartSearch.searchLoading}
            />
          )}

          {smartSearch.step === 'discriminator' && smartSearch.discriminatorData && (
            <DiscriminatorStep
              evidenceSpec={smartSearch.evidenceSpec}
              searchKeywords={smartSearch.editedSearchQuery}
              editedDiscriminator={smartSearch.editedDiscriminator}
              setEditedDiscriminator={smartSearch.updateEditedDiscriminator}
              strictness={smartSearch.strictness}
              setStrictness={smartSearch.updateStrictness}
              selectedArticlesCount={smartSearch.searchResults?.pagination.total_available || 0}
              filterAllMode={true}  // Always filter all
              totalAvailable={smartSearch.searchResults?.pagination.total_available}
              onSubmit={handleStartFiltering}
            />
          )}

          {smartSearch.step === 'filtering' && smartSearch.filteringProgress && (
            <>
              <FilteringStep
                filteringProgress={smartSearch.filteringProgress}
                filteredArticles={smartSearch.filteredArticles}
              />
              <div ref={messagesEndRef} />
            </>
          )}

          {smartSearch.step === 'results' && (
            <ResultsStep
              filteredArticles={smartSearch.filteredArticles}
              originalQuery={smartSearch.query}
              evidenceSpecification={smartSearch.evidenceSpec}
              searchQuery={smartSearch.editedSearchQuery}
              totalAvailable={smartSearch.searchResults?.pagination.total_available}
              totalFiltered={smartSearch.searchResults?.pagination.total_available ? Math.min(smartSearch.searchResults.pagination.total_available, 500) : smartSearch.filteredArticles.length}
              sessionId={smartSearch.sessionId || undefined}
              savedCustomColumns={smartSearch.savedCustomColumns}
            />
          )}
        </div>
      </div>
    </div>
  );
}