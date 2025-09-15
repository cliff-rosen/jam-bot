import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, RefreshCw } from 'lucide-react';

import { SmartSearch2Provider, useSmartSearch2 } from '@/context/SmartSearch2Context';
import type { FeatureDefinition } from '@/types/workbench';
import { generatePrefixedUUID } from '@/lib/utils/uuid';

import { SearchForm, KeywordHelper } from '@/components/features/smartsearch2';
import { SearchResults } from '@/components/features/smartsearch2/SearchResults';

// Main content component that uses SmartSearch2Context
function SmartSearch2Content() {
  const [showKeywordHelper, setShowKeywordHelper] = useState(false);
  const { toast } = useToast();

  // SearchResults UI state
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const [editedQuery, setEditedQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'table' | 'card-compressed' | 'card-full'>('card-compressed');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const {
    selectedSource,
    searchQuery,
    searchResults,
    isSearching,
    hasSearched,
    error,
    appliedFeatures,
    pendingFeatures,
    extractedData,
    isExtracting,
    search,
    resetSearch,
    clearError,
    updateSearchQuery,
    addPendingFeature,
    removePendingFeature,
    extractFeatures
  } = useSmartSearch2();

  const handleSearch = async () => {
    await search();
  };

  const handleNewSearch = () => {
    setShowKeywordHelper(false);
    resetSearch();
  };

  const handleKeywordHelperComplete = () => {
    // The KeywordHelper will update the context directly
    setShowKeywordHelper(false);
  };

  // Feature extraction handlers
  const handleAddFeature = (newFeature: Omit<FeatureDefinition, 'id'>) => {
    if (!newFeature.name.trim() || !newFeature.description.trim()) {
      toast({
        title: 'Invalid Feature',
        description: 'Please provide both name and description',
        variant: 'destructive'
      });
      return;
    }

    const feature: FeatureDefinition = {
      ...newFeature,
      id: generatePrefixedUUID('feat')
    };

    addPendingFeature(feature);
  };

  const handleExtractFeatures = async () => {
    if (pendingFeatures.length === 0) {
      toast({
        title: 'No Features',
        description: 'Add some features to extract first',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await extractFeatures();
      toast({
        title: 'Feature Extraction Complete',
        description: `Successfully extracted ${response.extraction_metadata.features_extracted} features from ${response.extraction_metadata.successful_extractions} articles`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // SearchResults handlers
  const handleQueryEdit = () => {
    if (isEditingQuery) {
      if (editedQuery.trim() !== searchQuery.trim()) {
        updateSearchQuery(editedQuery.trim());
        handleSearch();
      }
      setIsEditingQuery(false);
    } else {
      setEditedQuery(searchQuery);
      setIsEditingQuery(true);
    }
  };

  const handleCancelEdit = () => {
    setEditedQuery(searchQuery);
    setIsEditingQuery(false);
  };

  const handleEditedQueryChange = (value: string) => {
    setEditedQuery(value);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Update editedQuery when searchQuery changes
  useEffect(() => {
    setEditedQuery(searchQuery);
  }, [searchQuery]);

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
                  isSearching={isSearching}
                />
              )}
            </div>
          ) : (
            <SearchResults
              articles={searchResults?.articles || []}
              pagination={searchResults?.pagination || null}
              query={searchQuery}
              source={selectedSource}
              isSearching={isSearching}
              onQueryUpdate={updateSearchQuery}
              onSearch={handleSearch}
              appliedFeatures={appliedFeatures}
              pendingFeatures={pendingFeatures}
              extractedData={extractedData}
              isExtracting={isExtracting}
              onAddFeature={handleAddFeature}
              onRemovePendingFeature={removePendingFeature}
              onExtractFeatures={handleExtractFeatures}
              // UI state and handlers
              isEditingQuery={isEditingQuery}
              editedQuery={editedQuery}
              displayMode={displayMode}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onQueryEdit={handleQueryEdit}
              onCancelEdit={handleCancelEdit}
              onEditedQueryChange={handleEditedQueryChange}
              onDisplayModeChange={setDisplayMode}
              onSort={handleSort}
            />
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