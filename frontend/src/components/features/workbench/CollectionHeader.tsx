import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderOpen, Cloud, RotateCcw, Search, Folder } from 'lucide-react';
import { ArticleCollection, CollectionSource } from '@/types/articleCollection';

interface CollectionHeaderProps {
  collection: ArticleCollection;
  searchPagination?: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    pageSize: number;
  } | null;
  onLoadGroup: () => void;
  onAddFeatures: () => void;
  onExtractFeatures: () => void;
  onSaveChanges: () => void;
  onSaveAsGroup: () => void;
  canSaveChanges: boolean;
  canSave: boolean;
  isExtracting: boolean;
  isLoading: boolean;
}

export function CollectionHeader({
  collection,
  searchPagination,
  onLoadGroup,
  onAddFeatures,
  onExtractFeatures,
  onSaveChanges,
  onSaveAsGroup,
  canSaveChanges,
  canSave,
  isExtracting,
  isLoading
}: CollectionHeaderProps) {
  const isSearchResult = collection.source === CollectionSource.SEARCH;
  const isModified = collection.is_modified;
  
  // Get the search query from search_params
  const searchQuery = collection.search_params?.query || collection.name;
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b">
      {/* Left side: Icon + Name + Stats */}
      <div className="flex items-center gap-3">
        {isSearchResult ? (
          <>
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100">Search Results</span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">"{searchQuery}"</span>
              {searchPagination && (
                <>
                  <span className="text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {searchPagination.totalResults} results
                    {searchPagination.totalPages > 1 && 
                      ` • Page ${searchPagination.currentPage}/${searchPagination.totalPages}`
                    }
                  </span>
                </>
              )}
              {collection.feature_definitions.length > 0 && (
                <>
                  <span className="text-gray-500 dark:text-gray-400">•</span>
                  <Badge variant="secondary" className="text-xs">
                    {collection.feature_definitions.length} features
                  </Badge>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Folder className={`w-5 h-5 flex-shrink-0 ${
              isModified 
                ? 'text-yellow-600 dark:text-yellow-400' 
                : 'text-green-600 dark:text-green-400'
            }`} />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Saved Group{isModified && ' (Modified)'}
                {isModified && <span className="text-yellow-600 dark:text-yellow-400 ml-1">*</span>}
              </span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">"{collection.name}"</span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {collection.articles.length} articles
              </span>
              {collection.feature_definitions.length > 0 && (
                <>
                  <span className="text-gray-500 dark:text-gray-400">•</span>
                  <Badge variant="secondary" className="text-xs">
                    {collection.feature_definitions.length} features
                  </Badge>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onLoadGroup}
          variant="outline"
          size="sm"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Load Group
        </Button>

        <Button
          onClick={onAddFeatures}
          variant="outline"
          size="sm"
          disabled={collection.articles.length === 0}
        >
          Add Features
        </Button>

        {collection.feature_definitions.length > 0 && (
          <Button
            onClick={onExtractFeatures}
            variant="default"
            size="sm"
            disabled={isExtracting}
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                Extracting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Extract Features
              </>
            )}
          </Button>
        )}

        {canSaveChanges && (
          <Button
            onClick={onSaveChanges}
            variant="default"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
            ) : (
              <Cloud className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}

        {canSave && (
          <Button
            onClick={onSaveAsGroup}
            variant="outline"
            size="sm"
          >
            <Cloud className="w-4 h-4 mr-2" />
            {collection.source === CollectionSource.SEARCH ? 'Save as Group' : 'Save'}
          </Button>
        )}
      </div>
    </div>
  );
}