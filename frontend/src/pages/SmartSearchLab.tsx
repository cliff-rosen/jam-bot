import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { smartSearchApi } from '@/lib/api/smartSearchApi';
import { ChevronRight, RefreshCw } from 'lucide-react';

import { QueryInputStep } from '@/components/features/smartsearch/QueryInputStep';
import { RefinementStep } from '@/components/features/smartsearch/RefinementStep';
import { SearchQueryStep } from '@/components/features/smartsearch/SearchQueryStep';
import { SearchingStep } from '@/components/features/smartsearch/SearchingStep';
import { SearchResultsStep } from '@/components/features/smartsearch/SearchResultsStep';
import { DiscriminatorStep } from '@/components/features/smartsearch/DiscriminatorStep';
import { FilteringStep } from '@/components/features/smartsearch/FilteringStep';
import { ResultsStep } from '@/components/features/smartsearch/ResultsStep';

import type {
  SmartSearchRefinement,
  SearchQueryGeneration,
  SearchResults,
  FilteredArticle,
  FilteringProgress,
  StreamMessage
} from '@/types/smart-search';

export default function SmartSearchLab() {
  // Step management
  const [step, setStep] = useState<'query' | 'refinement' | 'search-query' | 'searching' | 'search-results' | 'discriminator' | 'filtering' | 'results'>('query');

  // Step 1: Question input
  const [question, setQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);

  // Step 2: Refinement
  const [refinement, setRefinement] = useState<SmartSearchRefinement | null>(null);
  const [editedQuestion, setEditedQuestion] = useState('');
  
  // Step 3: Search Query Generation
  const [searchQueryGeneration, setSearchQueryGeneration] = useState<SearchQueryGeneration | null>(null);
  const [editedSearchQuery, setEditedSearchQuery] = useState('');
  const [searchQueryLoading, setSearchQueryLoading] = useState(false);

  // Step 4: Search results and curation
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Step 6: Discriminator generation and editing
  const [discriminatorData, setDiscriminatorData] = useState<any>(null);
  const [editedDiscriminator, setEditedDiscriminator] = useState('');
  const [discriminatorLoading, setDiscriminatorLoading] = useState(false);
  
  // Step 7: Filtering
  const [filteringProgress, setFilteringProgress] = useState<FilteringProgress | null>(null);
  const [filteredArticles, setFilteredArticles] = useState<FilteredArticle[]>([]);
  const [strictness, setStrictness] = useState<'low' | 'medium' | 'high'>('medium');

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll for messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteringProgress]);

  // Step 1: Submit question for refinement
  const handleRefineQuestion = async () => {
    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a research question',
        variant: 'destructive'
      });
      return;
    }

    setQuestionLoading(true);
    try {
      const response = await smartSearchApi.refineQuestion({ question });
      setRefinement(response);
      setEditedQuestion(response.refined_question);
      setStep('refinement');

      toast({
        title: 'Question Refined',
        description: 'Review and edit the refined question'
      });
    } catch (error) {
      toast({
        title: 'Refinement Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setQuestionLoading(false);
    }
  };

  // Step 2: Generate search query from refined question
  const handleGenerateSearchQuery = async () => {
    if (!editedQuestion.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a refined question',
        variant: 'destructive'
      });
      return;
    }
    
    setSearchQueryLoading(true);
    try {
      const response = await smartSearchApi.generateSearchQuery({ 
        refined_question: editedQuestion 
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
        // Go to search results review step
        setSearchResults(results);
        setSelectedArticles(new Set(results.articles.map((_, index) => index))); // Select all by default
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

  // Step 4: Start filtering with selected articles
  const handleStartFiltering = async () => {
    if (!searchResults) return;
    
    const selectedArticleList = Array.from(selectedArticles).map(index => searchResults.articles[index]);
    
    if (selectedArticleList.length === 0) {
      toast({
        title: 'No Articles Selected',
        description: 'Please select at least one article to filter.',
        variant: 'destructive'
      });
      return;
    }
    
    setStep('filtering');
    setFilteredArticles([]);
    setFilteringProgress({
      total: selectedArticleList.length,
      processed: 0,
      accepted: 0,
      rejected: 0
    });

    try {
      await smartSearchApi.filterArticlesStreaming(
        {
          articles: selectedArticleList,
          refined_question: editedQuestion,
          search_query: editedSearchQuery,
          strictness,
          discriminator_prompt: editedDiscriminator
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

  // Article selection helpers
  const handleSelectAll = () => {
    if (!searchResults) return;
    setSelectedArticles(new Set(searchResults.articles.map((_, index) => index)));
  };

  const handleDeselectAll = () => {
    setSelectedArticles(new Set());
  };

  const handleToggleArticle = (index: number) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedArticles(newSelected);
  };

  // Generate discriminator for review
  const handleGenerateDiscriminator = async () => {
    if (!searchResults) return;
    
    setDiscriminatorLoading(true);
    try {
      const response = await smartSearchApi.generateDiscriminator({
        refined_question: editedQuestion,
        search_query: editedSearchQuery,
        strictness: strictness
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

  // Reset to start
  const handleReset = () => {
    setStep('query');
    setQuestion('');
    setRefinement(null);
    setEditedQuestion('');
    setSearchQueryGeneration(null);
    setEditedSearchQuery('');
    setSearchResults(null);
    setSelectedArticles(new Set());
    setDiscriminatorData(null);
    setEditedDiscriminator('');
    setFilteredArticles([]);
    setFilteringProgress(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
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

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge variant={step === 'query' ? 'default' : 'secondary'}>1. Enter Query</Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'refinement' ? 'default' : !['query'].includes(step) ? 'secondary' : 'outline'}>
            2. Refine Query
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'search-query' ? 'default' : !['query', 'refinement'].includes(step) ? 'secondary' : 'outline'}>
            3. Generate Search Query
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'searching' ? 'default' : ['search-results', 'discriminator', 'filtering', 'results'].includes(step) ? 'secondary' : 'outline'}>
            4. Search
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'search-results' ? 'default' : ['discriminator', 'filtering', 'results'].includes(step) ? 'secondary' : 'outline'}>
            5. Review & Curate
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Badge variant={step === 'discriminator' ? 'default' : ['filtering', 'results'].includes(step) ? 'secondary' : 'outline'}>
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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Step Components */}
          {step === 'query' && (
            <QueryInputStep
              question={question}
              setQuestion={setQuestion}
              onSubmit={handleRefineQuestion}
              loading={questionLoading}
            />
          )}

          {step === 'refinement' && refinement && (
            <RefinementStep
              refinement={refinement}
              editedQuestion={editedQuestion}
              setEditedQuestion={setEditedQuestion}
              onSubmit={handleGenerateSearchQuery}
              loading={searchQueryLoading}
            />
          )}

          {step === 'search-query' && searchQueryGeneration && (
            <SearchQueryStep
              editedSearchQuery={editedSearchQuery}
              setEditedSearchQuery={setEditedSearchQuery}
              onSubmit={handleExecuteSearch}
              loading={searchLoading}
            />
          )}

          {step === 'searching' && <SearchingStep />}

          {step === 'search-results' && searchResults && (
            <SearchResultsStep
              searchResults={searchResults}
              selectedArticles={selectedArticles}
              onToggleArticle={handleToggleArticle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onSubmit={handleGenerateDiscriminator}
              loading={discriminatorLoading}
            />
          )}

          {step === 'discriminator' && discriminatorData && (
            <DiscriminatorStep
              editedQuestion={editedQuestion}
              editedSearchQuery={editedSearchQuery}
              editedDiscriminator={editedDiscriminator}
              setEditedDiscriminator={setEditedDiscriminator}
              strictness={strictness}
              setStrictness={setStrictness}
              selectedArticlesCount={selectedArticles.size}
              onSubmit={handleStartFiltering}
            />
          )}

          {step === 'filtering' && filteringProgress && (
            <>
              <FilteringStep filteringProgress={filteringProgress} />
              <div ref={messagesEndRef} />
            </>
          )}

          {step === 'results' && (
            <ResultsStep filteredArticles={filteredArticles} />
          )}
        </div>
      </div>
    </div>
  );
}