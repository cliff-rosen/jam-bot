import { useState } from 'react';
import { SmartSearch2Provider, useSmartSearch2 } from '@/context/SmartSearch2Context';
import { SearchForm, KeywordHelper } from '@/components/features/smartsearch2';
import { SearchResults } from '@/components/features/smartsearch2/SearchResults';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

// Main content component that uses SmartSearch2Context
function SmartSearch2Content() {
  const [showKeywordHelper, setShowKeywordHelper] = useState(false);

  const {
    selectedSource,
    searchQuery,
    searchResults,
    isSearching,
    hasSearched,
    error,
    executeSearch,
    resetSearch,
    clearError,
    updateSearchQuery
  } = useSmartSearch2();

  const handleSearch = async () => {
    await executeSearch();
  };

  const handleNewSearch = () => {
    setShowKeywordHelper(false);
    resetSearch();
  };

  const handleKeywordHelperComplete = () => {
    // The KeywordHelper will update the context directly
    setShowKeywordHelper(false);
  };

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b-2 border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Smart Search 2
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Direct access to powerful literature search and filtering
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleNewSearch}
              className="dark:border-gray-600 dark:text-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Search
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="w-full space-y-6">

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
                  />
                </Card>
              ) : (
                <SearchForm
                  onSearch={handleSearch}
                  onToggleKeywordHelper={() => setShowKeywordHelper(true)}
                />
              )}
            </div>
          ) : (
            searchResults && (
              <SearchResults
                articles={searchResults.articles}
                pagination={searchResults.pagination}
                query={searchQuery}
                source={selectedSource}
                isSearching={isSearching}
                onQueryUpdate={updateSearchQuery}
                onSearch={handleSearch}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Main component that provides the SmartSearch2Context
export default function SmartSearch2() {
  return (
    <SmartSearch2Provider>
      <SmartSearch2Content />
    </SmartSearch2Provider>
  );
}