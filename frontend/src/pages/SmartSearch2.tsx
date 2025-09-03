import { useState } from 'react';
import { SmartSearchProvider, useSmartSearch } from '@/context/SmartSearchContext';
import { SearchForm, KeywordHelper } from '@/components/features/smartsearch2';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Main content component that uses SmartSearchContext
function SmartSearch2Content() {
  const [showKeywordHelper, setShowKeywordHelper] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<'pubmed' | 'google_scholar'>('pubmed');
  const [hasSearched, setHasSearched] = useState(false);

  const {
    executeSearch,
    searchResults,
    searchExecutionLoading,
    error,
    clearError,
    resetAllState,
    updateOriginalQuestion,
    updateSubmittedSearchKeywords,
    updateSelectedSource,
    generateEvidenceSpecification
  } = useSmartSearch();

  const handleSearch = async (query: string, source: 'pubmed' | 'google_scholar') => {
    setSearchQuery(query);
    setSelectedSource(source);
    setHasSearched(true);
    clearError();

    try {
      // For SmartSearch2, we need to create a session first
      // Set the original question
      updateOriginalQuestion(query);
      updateSelectedSource(source);

      // Create evidence specification (this creates the session)
      await generateEvidenceSpecification();

      // Set the search keywords to the original query for direct search
      updateSubmittedSearchKeywords(query);

      // Then execute the search
      await executeSearch(0, source === 'google_scholar' ? 20 : 50);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleNewSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setShowKeywordHelper(false);
    resetAllState();
  };

  const handleKeywordHelperComplete = (keywords: string) => {
    setSearchQuery(keywords);
    setShowKeywordHelper(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Smart Search 2
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Direct access to powerful literature search and filtering
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!hasSearched ? (
          <div className="space-y-6">
            {/* Search or Keyword Helper */}
            {showKeywordHelper ? (
              <Card className="p-6">
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKeywordHelper(false)}
                    className="mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Direct Search
                  </Button>
                </div>
                <KeywordHelper
                  onComplete={handleKeywordHelperComplete}
                  onCancel={() => setShowKeywordHelper(false)}
                  selectedSource={selectedSource}
                />
              </Card>
            ) : (
              <SearchForm
                initialQuery={searchQuery}
                initialSource={selectedSource}
                onSearch={handleSearch}
                onToggleKeywordHelper={() => setShowKeywordHelper(true)}
              />
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Results Header */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Search Results
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Query: "{searchQuery}" in {selectedSource === 'pubmed' ? 'PubMed' : 'Google Scholar'}
                  </p>
                  {searchResults && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Found {searchResults.pagination?.total_available || 0} articles
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleNewSearch}
                  >
                    New Search
                  </Button>
                </div>
              </div>
            </Card>

            {/* Results Display */}
            <Card className="p-6">
              {searchExecutionLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Searching...</p>
                </div>
              ) : searchResults && searchResults.articles && searchResults.articles.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Articles Found ({searchResults.articles.length})
                  </h3>
                  <div className="space-y-3">
                    {searchResults.articles.slice(0, 10).map((article, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {article.title || 'Untitled'}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {article.authors?.slice(0, 3).join(', ')}
                          {article.authors && article.authors.length > 3 && ' et al.'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {article.journal} • {article.publication_date}
                        </p>
                      </div>
                    ))}
                  </div>
                  {searchResults.articles.length > 10 && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
                      Showing first 10 of {searchResults.articles.length} results
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No results found</p>
                  <p className="text-sm mt-2">Try adjusting your search terms</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component that provides the SmartSearchContext
export default function SmartSearch2() {
  return (
    <SmartSearchProvider>
      <SmartSearch2Content />
    </SmartSearchProvider>
  );
}