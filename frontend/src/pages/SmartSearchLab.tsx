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

  // ================== UTILITY ==================

  // Generic error handler for consistent toast messages
  const handleError = (title: string, error: unknown) => {
    toast({
      title,
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive'
    });
  };

  // ================== HANDLERS ==================

  // Step 1: Submit query for evidence specification
  const handleCreateEvidenceSpec = async () => {
    try {
      await smartSearch.generateEvidenceSpecification();
      smartSearch.updateStep('refinement');

      toast({
        title: 'Evidence Specification Created',
        description: 'Review and edit the evidence specification'
      });
    } catch (error) {
      handleError('Evidence Specification Failed', error);
    }
  };

  // Step 2: Generate search keywords from evidence specification
  const handleGenerateKeywords = async (source?: string) => {
    try {
      const response = await smartSearch.generateSearchKeywords(source);

      // Automatically test the generated query count
      try {
        const countResult = await smartSearch.testKeywordsCount(response.search_keywords);
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
      handleError('Keyword Generation Failed', error);
    }
  };

  // Step 3: Execute search
  const handleExecuteSearch = async () => {
    smartSearch.updateStep('searching');

    try {
      const results = await smartSearch.executeSearch();

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
        smartSearch.updateStep('search-results');
      }
    } catch (error) {
      handleError('Search Failed', error);
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
    handleError('Failed to Start Filtering', error);
  };

  // Step 4: Start filtering - always filter all articles
  const handleStartFiltering = async () => {
    if (!smartSearch.searchResults || !smartSearch.sessionId) return;

    // Always filter all available search results
    const articlesToProcess = Math.min(smartSearch.searchResults.pagination.total_available, 500);

    initializeFilteringState(articlesToProcess);

    const request = {
      filter_mode: 'all' as const,
      evidence_specification: smartSearch.submittedEvidenceSpec,
      search_keywords: smartSearch.submittedSearchKeywords,
      strictness: smartSearch.strictness,
      discriminator_prompt: smartSearch.submittedDiscriminator,
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
    try {
      await smartSearch.generateDiscriminator();
      smartSearch.updateStep('discriminator');

      toast({
        title: 'Discriminator Generated',
        description: 'Review and edit the semantic evaluation criteria'
      });
    } catch (error) {
      handleError('Discriminator Generation Failed', error);
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
    try {
      const batchSize = smartSearch.selectedSource === 'google_scholar' ? 20 : 50;
      const moreResults = await smartSearch.executeSearch(
        smartSearch.searchResults?.articles.length || 0,
        batchSize
      );

      toast({
        title: 'More Results Loaded',
        description: `Loaded ${moreResults.articles.length} more articles`
      });
    } catch (error) {
      handleError('Failed to Load More Results', error);
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
      handleError('Failed to Step Back', error);
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
              query={smartSearch.originalQuestion}
              setQuery={smartSearch.updateOriginalQuestion}
              onSubmit={handleCreateEvidenceSpec}
              loading={smartSearch.evidenceSpecLoading}
            />
          )}

          {smartSearch.step === 'refinement' && smartSearch.evidenceSpecResponse && (
            <RefinementStep
              refinement={smartSearch.evidenceSpecResponse}
              evidenceSpec={smartSearch.submittedEvidenceSpec}
              setEvidenceSpec={smartSearch.updateSubmittedEvidenceSpec}
              selectedSource={smartSearch.selectedSource}
              setSelectedSource={smartSearch.updateSelectedSource}
              onSubmit={handleGenerateKeywords}
              loading={smartSearch.searchKeywordsLoading}
            />
          )}

          {smartSearch.step === 'search-query' && smartSearch.searchKeywordsResponse && (
            <SearchQueryStep
              editedSearchQuery={smartSearch.submittedSearchKeywords}
              setEditedSearchQuery={smartSearch.updateSubmittedSearchKeywords}
              evidenceSpec={smartSearch.submittedEvidenceSpec}
              selectedSource={smartSearch.selectedSource}
              onSubmit={handleExecuteSearch}
              onOptimize={smartSearch.generateOptimizedKeywords}
              onTestCount={smartSearch.testKeywordsCount}
              loading={smartSearch.searchExecutionLoading}
              initialCount={smartSearch.keywordsCountResult}
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
              loadingMore={smartSearch.searchExecutionLoading}
            />
          )}

          {smartSearch.step === 'discriminator' && smartSearch.discriminatorResponse && (
            <DiscriminatorStep
              evidenceSpec={smartSearch.submittedEvidenceSpec}
              searchKeywords={smartSearch.submittedSearchKeywords}
              editedDiscriminator={smartSearch.submittedDiscriminator}
              setEditedDiscriminator={smartSearch.updateSubmittedDiscriminator}
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
              originalQuery={smartSearch.originalQuestion}
              evidenceSpecification={smartSearch.submittedEvidenceSpec}
              searchQuery={smartSearch.submittedSearchKeywords}
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