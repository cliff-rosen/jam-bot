import { useState, useRef, useEffect } from 'react';
import { ChevronRight, RefreshCw, History } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

import { smartSearchApi } from '@/lib/api/smartSearchApi';

import { QueryInputStep } from '@/components/features/smartsearch/QueryInputStep';
import { RefinementStep } from '@/components/features/smartsearch/RefinementStep';
import { SearchQueryStep } from '@/components/features/smartsearch/SearchQueryStep';
import { SearchingStep } from '@/components/features/smartsearch/SearchingStep';
import { SearchResultsStep } from '@/components/features/smartsearch/SearchResultsStep';
import { DiscriminatorStep } from '@/components/features/smartsearch/DiscriminatorStep';
import { FilteringStep } from '@/components/features/smartsearch/FilteringStep';
import { ResultsStep } from '@/components/features/smartsearch/ResultsStep';

import type {
  FilteredArticle,
  FilteringProgress
} from '@/types/smart-search';
import type {
  EvidenceSpecificationResponse,
  KeywordGenerationResponse,
  SearchExecutionResponse
} from '@/lib/api/smartSearchApi';

export default function SmartSearchLab() {
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get('session');

  // Step management
  const [step, setStep] = useState<'query' | 'refinement' | 'search-query' | 'searching' | 'search-results' | 'discriminator' | 'filtering' | 'results'>('query');

  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Step 1: Query input
  const [query, setQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);

  // Step 2: Evidence Specification
  const [refinement, setRefinement] = useState<EvidenceSpecificationResponse | null>(null);
  const [evidenceSpec, setEvidenceSpec] = useState('');

  // Step 3: Search Query Generation
  const [searchQueryGeneration, setSearchQueryGeneration] = useState<KeywordGenerationResponse | null>(null);
  const [editedSearchQuery, setEditedSearchQuery] = useState('');
  const [searchQueryLoading, setSearchQueryLoading] = useState(false);
  const [initialQueryCount, setInitialQueryCount] = useState<{ total_count: number; sources_searched: string[] } | null>(null);

  // Step 4: Search results
  const [searchResults, setSearchResults] = useState<SearchExecutionResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Step 6: Discriminator generation and editing
  const [discriminatorData, setDiscriminatorData] = useState<any>(null);
  const [editedDiscriminator, setEditedDiscriminator] = useState('');
  const [discriminatorLoading, setDiscriminatorLoading] = useState(false);

  // Step 7: Filtering
  const [filteringProgress, setFilteringProgress] = useState<FilteringProgress | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<FilteredArticle[]>([]);
  const [strictness, setStrictness] = useState<'low' | 'medium' | 'high'>('medium');
  const [savedCustomColumns, setSavedCustomColumns] = useState<any[]>([]);

  // Source selection - remember last choice in localStorage
  const [selectedSource, setSelectedSource] = useState<string>(() => {
    return localStorage.getItem('smartSearchSelectedSource') || 'pubmed';
  });

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save selected source to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('smartSearchSelectedSource', selectedSource);
  }, [selectedSource]);

  // Auto-scroll for messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteringProgress]);

  // Load existing session if session ID is provided
  useEffect(() => {
    const loadSession = async () => {
      if (!resumeSessionId) return;

      try {
        const session = await smartSearchApi.getSession(resumeSessionId);

        // Restore session state
        setSessionId(session.id);
        setQuery(session.original_question || '');
        setEvidenceSpec(session.submitted_refined_question || session.refined_question || '');
        setEditedSearchQuery(session.submitted_search_query || session.generated_search_query || '');

        // Restore additional component state based on available data
        const lastStep = session.last_step_completed;

        // Always create refinement object if we're at or past refinement step
        if (lastStep && ['question_refinement', 'search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
          setRefinement({
            original_query: session.original_question,
            evidence_specification: session.refined_question || '',
            session_id: session.id
          });
        }

        // Always create search query generation object if we're at or past search query step
        if (lastStep && ['search_query_generation', 'search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
          setSearchQueryGeneration({
            search_query: session.generated_search_query || '',
            evidence_specification: session.submitted_refined_question || session.refined_question || '',
            session_id: session.id
          });
        }

        if (session.search_metadata) {
          setInitialQueryCount({
            total_count: session.search_metadata.total_available || 0,
            sources_searched: session.search_metadata.sources_searched || []
          });

          // Reconstruct searchResults state for proper display of article counts
          if (lastStep && ['search_execution', 'discriminator_generation', 'filtering'].includes(lastStep)) {
            setSearchResults({
              articles: [], // We don't store the actual articles in session, only metadata
              pagination: {
                total_available: session.search_metadata.total_available || 0,
                returned: session.search_metadata.total_retrieved || 0,
                offset: 0,
                has_more: (session.search_metadata.total_retrieved || 0) < (session.search_metadata.total_available || 0)
              },
              sources_searched: session.search_metadata.sources_searched || [],
              session_id: session.id
            });
          }
        }

        // Always create discriminator data if we're at discriminator step or later
        if (lastStep && ['discriminator_generation', 'filtering'].includes(lastStep)) {
          setDiscriminatorData({
            discriminator_prompt: session.generated_discriminator || '',
            evidence_specification: session.submitted_refined_question || session.refined_question || '',
            search_query: session.submitted_search_query || session.generated_search_query || '',
            strictness: session.filter_strictness || 'medium',
            session_id: session.id
          });
          setEditedDiscriminator(session.submitted_discriminator || session.generated_discriminator || '');
        }

        if (session.filter_strictness) {
          setStrictness(session.filter_strictness as 'low' | 'medium' | 'high');
        }

        // Restore filtered articles if they exist
        if (session.filtered_articles && Array.isArray(session.filtered_articles)) {
          setFilteredArticles(session.filtered_articles);
        }

        // Restore custom columns if they exist
        if (session.filtering_metadata?.custom_columns) {
          setSavedCustomColumns(session.filtering_metadata.custom_columns);
        }

        // Map backend step to frontend step
        const mapBackendStepToFrontend = (backendStep: string, session: any): string => {
          switch (backendStep) {
            case 'question_input':
              return 'query';
            case 'question_refinement':
              return 'refinement';
            case 'search_query_generation':
              return 'search-query';
            case 'search_execution':
              // Only show search-results if we have metadata, otherwise fall back
              return session.search_metadata?.total_available ? 'search-results' : 'search-query';
            case 'discriminator_generation':
              return 'discriminator';
            case 'filtering':
              // If filtering is complete (has results), show results step
              return session.filtering_metadata?.accepted !== undefined ? 'results' : 'filtering';
            default:
              return 'query';
          }
        };

        // Determine which step to show based on session progress
        const frontendStep = mapBackendStepToFrontend(lastStep || 'question_input', session);
        setStep(frontendStep as any);

        toast({
          title: 'Session Loaded',
          description: `Resumed search session: "${session.original_question}"`
        });
      } catch (error) {
        toast({
          title: 'Failed to Load Session',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive'
        });
      }
    };

    loadSession();
  }, [resumeSessionId]);

  // Step 1: Submit query for evidence specification
  const handleCreateEvidenceSpec = async () => {
    if (!query.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your document search query',
        variant: 'destructive'
      });
      return;
    }

    setQueryLoading(true);
    try {
      const response = await smartSearchApi.createEvidenceSpecification({
        query: query,
        session_id: sessionId || undefined
      });
      setRefinement(response);
      setEvidenceSpec(response.evidence_specification);
      setSessionId(response.session_id);
      setStep('refinement');

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
    } finally {
      setQueryLoading(false);
    }
  };

  // Test query count without retrieving articles
  const handleTestQueryCount = async (query: string) => {
    try {
      const response = await smartSearchApi.testQueryCount({
        search_query: query,
        session_id: sessionId!,
        selected_sources: [selectedSource]
      });

      return {
        total_count: response.total_count,
        sources_searched: response.sources_searched
      };
    } catch (error) {
      console.error('Query count test failed:', error);
      throw error;
    }
  };

  // Handle query optimization for volume control
  const handleOptimizeQuery = async (evidenceSpecification: string) => {
    try {
      const response = await smartSearchApi.generateOptimizedQuery({
        current_query: editedSearchQuery,
        evidence_specification: evidenceSpecification,
        target_max_results: 250,
        session_id: sessionId!,
        selected_sources: [selectedSource]
      });

      return {
        initial_query: response.initial_query,
        initial_count: response.initial_count,
        final_query: response.final_query,
        final_count: response.final_count,
        refinement_applied: response.refinement_applied,
        refinement_status: response.refinement_status
      };
    } catch (error) {
      console.error('Query optimization failed:', error);
      throw error;
    }
  };

  // Step 2: Generate search keywords from evidence specification
  const handleGenerateKeywords = async (source?: string) => {
    if (!evidenceSpec.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide an evidence specification',
        variant: 'destructive'
      });
      return;
    }

    // Update selected source if provided
    if (source) {
      setSelectedSource(source);
    }

    setSearchQueryLoading(true);
    try {
      const response = await smartSearchApi.generateKeywords({
        evidence_specification: evidenceSpec,
        session_id: sessionId!,
        selected_sources: [source || selectedSource]
      });
      setSearchQueryGeneration(response);
      setEditedSearchQuery(response.search_query);

      // Automatically test the generated query count
      try {
        const countResult = await handleTestQueryCount(response.search_query);
        setInitialQueryCount(countResult);
        setStep('search-query');

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
        setInitialQueryCount(null);
        setStep('search-query');
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
    } finally {
      setSearchQueryLoading(false);
    }
  };

  // Step 3: Execute search
  const handleExecuteSearch = async () => {
    if (!editedSearchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide search keywords',
        variant: 'destructive'
      });
      return;
    }

    setSearchLoading(true);
    setStep('searching');

    try {
      // Google Scholar returns max 20 per page, PubMed can do 50+
      const initialBatchSize = selectedSource === 'google_scholar' ? 20 : 50;
      const results = await smartSearchApi.executeSearch({
        search_query: editedSearchQuery,
        max_results: initialBatchSize,
        session_id: sessionId!,
        selected_sources: [selectedSource]
      });

      if (results.articles.length === 0) {
        toast({
          title: 'No Results',
          description: 'No articles found. Try different search keywords',
          variant: 'destructive'
        });
        setStep('search-query');
      } else {
        toast({
          title: 'Search Complete',
          description: `Found ${results.pagination.returned} articles (${results.pagination.total_available} total available) from ${results.sources_searched.join(', ')}`
        });
        // Go to search results review step
        setSearchResults(results);
        setStep('search-results');
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

  // Initialize filtering UI state
  const initializeFilteringState = (totalCount: number) => {
    setStep('filtering');
    setFilteredArticles([]);
    setFilteringProgress({
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
    if (!searchResults || !sessionId) return;

    // Always filter all available search results
    const articlesToProcess = Math.min(searchResults.pagination.total_available, 500);

    initializeFilteringState(articlesToProcess);

    const request = {
      filter_mode: 'all' as const,
      evidence_specification: evidenceSpec,
      search_query: editedSearchQuery,
      strictness,
      discriminator_prompt: editedDiscriminator,
      session_id: sessionId!,
      selected_sources: [selectedSource],
      max_results: articlesToProcess
    };

    try {
      // Always use parallel processing - it's much faster
      console.log(`Processing ${articlesToProcess} articles in parallel...`);

      const startTime = Date.now();
      const response = await smartSearchApi.filterArticles(request);
      const duration = Date.now() - startTime;

      // Set all articles at once
      setFilteredArticles(response.filtered_articles);

      // Update progress to show completion
      setFilteringProgress({
        total: response.total_processed,
        processed: response.total_processed,
        accepted: response.total_accepted,
        rejected: response.total_rejected
      });

      // Complete immediately
      setStep('results');

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
    if (!searchResults) return;

    setDiscriminatorLoading(true);
    try {
      const response = await smartSearchApi.generateDiscriminator({
        evidence_specification: evidenceSpec,
        search_query: editedSearchQuery,
        strictness: strictness,
        session_id: sessionId!
      });

      setDiscriminatorData(response);
      setEditedDiscriminator(response.discriminator_prompt);
      setStep('discriminator');

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
    } finally {
      setDiscriminatorLoading(false);
    }
  };

  // Generate discriminator - always filters all results
  const handleProceedToDiscriminator = async () => {
    if (!searchResults) return;

    // Generate discriminator for filtering all results
    await handleGenerateDiscriminator();
  };

  // Reset to start
  // Load more search results
  const handleLoadMoreResults = async () => {
    if (!searchResults || !editedSearchQuery.trim()) return;

    setSearchLoading(true);
    try {
      // Google Scholar returns max 20 per page, PubMed can do 50+
      const batchSize = selectedSource === 'google_scholar' ? 20 : 50;
      const moreResults = await smartSearchApi.executeSearch({
        search_query: editedSearchQuery,
        max_results: batchSize,
        offset: searchResults.articles.length,
        session_id: sessionId!,
        selected_sources: [selectedSource]
      });

      // Combine results
      const combinedResults = {
        ...moreResults,
        articles: [...searchResults.articles, ...moreResults.articles],
        pagination: {
          ...moreResults.pagination,
          returned: searchResults.articles.length + moreResults.articles.length
        }
      };

      setSearchResults(combinedResults);

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
    } finally {
      setSearchLoading(false);
    }
  };

  // Step navigation functions
  const getStepAvailability = (targetStep: string): boolean => {
    // You can only go back to steps that have been completed
    const stepOrder = ['query', 'refinement', 'search-query', 'search-results', 'discriminator', 'filtering', 'results'];
    const currentIndex = stepOrder.indexOf(step);
    const targetIndex = stepOrder.indexOf(targetStep);

    // Can't go back to current or future steps, and can't go back if no session exists yet
    return targetIndex < currentIndex && sessionId !== null;
  };

  const clearStateForward = (targetStep: string) => {
    // Clear frontend state for all steps forward of the target step
    const stepOrder = ['query', 'refinement', 'search-query', 'search-results', 'discriminator', 'filtering', 'results'];
    const targetIndex = stepOrder.indexOf(targetStep);

    if (targetIndex < stepOrder.indexOf('refinement')) {
      setRefinement(null);
      setEvidenceSpec('');
    }
    if (targetIndex < stepOrder.indexOf('search-query')) {
      setSearchQueryGeneration(null);
      setEditedSearchQuery('');
      setInitialQueryCount(null);
    }
    if (targetIndex < stepOrder.indexOf('search-results')) {
      setSearchResults(null);
    }
    if (targetIndex < stepOrder.indexOf('discriminator')) {
      setDiscriminatorData(null);
      setEditedDiscriminator('');
    }
    if (targetIndex < stepOrder.indexOf('filtering')) {
      setFilteredArticles([]);
      setFilteringProgress(null);
    }
  };

  const handleStepBack = async (targetStep: string) => {
    if (!sessionId || !getStepAvailability(targetStep)) return;

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
      await smartSearchApi.resetSessionToStep(sessionId, backendStep);

      // Clear frontend state for steps forward of target
      clearStateForward(targetStep);

      // Navigate to target step
      setStep(targetStep as any);

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
    setStep('query');
    setSessionId(null);
    setQuery('');
    setRefinement(null);
    setEvidenceSpec('');
    setSearchQueryGeneration(null);
    setEditedSearchQuery('');
    setInitialQueryCount(null);
    setSearchResults(null);
    setDiscriminatorData(null);
    setEditedDiscriminator('');
    setFilteredArticles([]);
    setFilteringProgress(null);
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
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge
            variant={step === 'query' ? 'default' : 'secondary'}
            className={getStepAvailability('query') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={getStepAvailability('query') ? () => handleStepBack('query') : undefined}
          >
            1. Enter Search Request
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={step === 'refinement' ? 'default' : !['query'].includes(step) ? 'secondary' : 'outline'}
            className={getStepAvailability('refinement') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={getStepAvailability('refinement') ? () => handleStepBack('refinement') : undefined}
          >
            2. Evidence Specification
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={step === 'search-query' ? 'default' : !['query', 'refinement'].includes(step) ? 'secondary' : 'outline'}
            className={getStepAvailability('search-query') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={getStepAvailability('search-query') ? () => handleStepBack('search-query') : undefined}
          >
            3. Generate Keywords
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={step === 'searching' ? 'default' : ['search-results', 'discriminator', 'filtering', 'results'].includes(step) ? 'secondary' : 'outline'}
            className={getStepAvailability('search-results') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={getStepAvailability('search-results') ? () => handleStepBack('search-results') : undefined}
          >
            4. Search
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={step === 'search-results' ? 'default' : ['discriminator', 'filtering', 'results'].includes(step) ? 'secondary' : 'outline'}
            className={getStepAvailability('search-results') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={getStepAvailability('search-results') ? () => handleStepBack('search-results') : undefined}
          >
            5. Review Results
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge
            variant={step === 'discriminator' ? 'default' : ['filtering', 'results'].includes(step) ? 'secondary' : 'outline'}
            className={getStepAvailability('discriminator') ? 'cursor-pointer hover:bg-opacity-80' : ''}
            onClick={getStepAvailability('discriminator') ? () => handleStepBack('discriminator') : undefined}
          >
            6. Filter Criteria
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'filtering' ? 'default' : step === 'results' ? 'secondary' : 'outline'}>
            7. Filter
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'results' ? 'default' : 'outline'}>8. Results</Badge>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="w-full space-y-6">
          {/* Step Components */}
          {step === 'query' && (
            <QueryInputStep
              query={query}
              setQuery={setQuery}
              onSubmit={handleCreateEvidenceSpec}
              loading={queryLoading}
            />
          )}

          {step === 'refinement' && refinement && (
            <RefinementStep
              refinement={refinement}
              evidenceSpec={evidenceSpec}
              setEvidenceSpec={setEvidenceSpec}
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              onSubmit={handleGenerateKeywords}
              loading={searchQueryLoading}
            />
          )}

          {step === 'search-query' && searchQueryGeneration && (
            <SearchQueryStep
              editedSearchQuery={editedSearchQuery}
              setEditedSearchQuery={setEditedSearchQuery}
              evidenceSpec={evidenceSpec}
              selectedSource={selectedSource}
              onSubmit={handleExecuteSearch}
              onOptimize={handleOptimizeQuery}
              onTestCount={handleTestQueryCount}
              loading={searchLoading}
              initialCount={initialQueryCount}
            />
          )}

          {step === 'searching' && <SearchingStep />}

          {step === 'search-results' && searchResults && (
            <SearchResultsStep
              searchResults={searchResults}
              onSubmit={handleProceedToDiscriminator}
              onLoadMore={handleLoadMoreResults}
              onGoBack={() => handleStepBack('search-query')}
              loading={discriminatorLoading}
              loadingMore={searchLoading}
            />
          )}

          {step === 'discriminator' && discriminatorData && (
            <DiscriminatorStep
              evidenceSpec={evidenceSpec}
              searchKeywords={editedSearchQuery}
              editedDiscriminator={editedDiscriminator}
              setEditedDiscriminator={setEditedDiscriminator}
              strictness={strictness}
              setStrictness={setStrictness}
              selectedArticlesCount={searchResults?.pagination.total_available || 0}
              filterAllMode={true}  // Always filter all
              totalAvailable={searchResults?.pagination.total_available}
              onSubmit={handleStartFiltering}
            />
          )}

          {step === 'filtering' && filteringProgress && (
            <>
              <FilteringStep
                filteringProgress={filteringProgress}
                filteredArticles={filteredArticles}
              />
              <div ref={messagesEndRef} />
            </>
          )}

          {step === 'results' && (
            <ResultsStep
              filteredArticles={filteredArticles}
              originalQuery={query}
              evidenceSpecification={evidenceSpec}
              searchQuery={editedSearchQuery}
              totalAvailable={searchResults?.pagination.total_available}
              totalFiltered={searchResults?.pagination.total_available ? Math.min(searchResults.pagination.total_available, 500) : filteredArticles.length}
              sessionId={sessionId || undefined}
              savedCustomColumns={savedCustomColumns}
            />
          )}
        </div>
      </div>
    </div>
  );
}