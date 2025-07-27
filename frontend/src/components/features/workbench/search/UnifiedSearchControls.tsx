/**
 * Unified Search Controls Component
 * 
 * Enhanced search controls that work with the unified search system.
 * Supports provider selection and provider-specific parameters.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Search, Zap } from 'lucide-react';
import { UnifiedSearchParams, SearchProvider } from '@/types/unifiedSearch';
import { ProviderSelector } from './ProviderSelector';

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UnifiedSearchControlsProps {
  searchParams: UnifiedSearchParams;
  selectedProviders: SearchProvider[];
  searchMode: 'single' | 'multi';
  isSearching: boolean;
  onSearchParamsChange: (params: UnifiedSearchParams) => void;
  onSelectedProvidersChange: (providers: SearchProvider[]) => void;
  onSearchModeChange: (mode: 'single' | 'multi') => void;
  onSearch: () => void;
  onBatchSearch?: () => void;
  onPageSizeChange?: (pageSize: number) => void;
  pagination?: PaginationState;
}

export function UnifiedSearchControls({
  searchParams,
  selectedProviders,
  searchMode,
  isSearching,
  onSearchParamsChange,
  onSelectedProvidersChange,
  onSearchModeChange,
  onSearch,
  onBatchSearch,
  onPageSizeChange,
  pagination
}: UnifiedSearchControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showProviders, setShowProviders] = useState(true);

  const canSearch = searchParams.query.trim() && (
    (searchMode === 'single' && searchParams.provider) ||
    (searchMode === 'multi' && selectedProviders.length > 0)
  );

  const handleProviderChange = (provider: SearchProvider) => {
    onSearchParamsChange({ ...searchParams, provider });
  };

  const getMaxPageSize = () => {
    if (searchMode === 'single') {
      if (searchParams.provider === 'pubmed') return 200;
      if (searchParams.provider === 'scholar') return 20;
      return 100;
    }
    return 20; // Conservative limit for batch searches (Scholar constraint)
  };

  const getPageSizeOptions = () => {
    const maxSize = getMaxPageSize();
    const options = [10, 20];
    
    if (maxSize >= 50) options.push(50);
    if (maxSize >= 100) options.push(100);
    if (maxSize >= 200) options.push(200);
    
    return options;
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  const renderProviderSpecificOptions = () => {
    if (searchMode !== 'single') return null;

    const provider = searchParams.provider;

    if (provider === 'pubmed') {
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Date Type
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              value={searchParams.date_type || 'publication'}
              onChange={(e) => onSearchParamsChange({
                ...searchParams,
                date_type: e.target.value as 'completion' | 'publication'
              })}
            >
              <option value="publication">Publication Date</option>
              <option value="completion">Completion Date</option>
            </select>
          </div>
          <div className="flex items-end">
            <Badge variant="secondary" className="mb-2">
              PubMed supports date filtering and full abstracts
            </Badge>
          </div>
        </div>
      );
    }

    if (provider === 'scholar') {
      return (
        <div className="flex items-end">
          <Badge variant="secondary" className="mb-2">
            Scholar provides citation counts and PDF links
          </Badge>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <Collapsible open={showProviders} onOpenChange={setShowProviders}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg text-gray-900 dark:text-gray-100">
                  <Search className="w-5 h-5 mr-2" />
                  Search Providers
                  {searchMode === 'single' && searchParams.provider && (
                    <Badge variant="default" className="ml-2">
                      {searchParams.provider === 'pubmed' ? 'PubMed' : 'Google Scholar'}
                    </Badge>
                  )}
                  {searchMode === 'multi' && selectedProviders.length > 0 && (
                    <Badge variant="default" className="ml-2">
                      {selectedProviders.length} provider{selectedProviders.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                {showProviders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4">
              <ProviderSelector
                selectedProvider={searchParams.provider}
                onProviderChange={handleProviderChange}
                selectedProviders={selectedProviders}
                onMultiProviderChange={onSelectedProvidersChange}
                mode={searchMode}
                onModeChange={onSearchModeChange}
                disabled={isSearching}
              />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Search Parameters */}
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <CardContent className="pt-6">
          {/* Main search row */}
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Search Query
              </label>
              <Input
                value={searchParams.query}
                onChange={(e) => onSearchParamsChange({ ...searchParams, query: e.target.value })}
                placeholder="Enter search terms..."
                onKeyDown={(e) => e.key === 'Enter' && canSearch && onSearch()}
                className="dark:bg-gray-800 dark:text-gray-100"
                disabled={isSearching}
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium"
                onClick={onSearch}
                disabled={!canSearch || isSearching}
              >
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>

              {searchMode === 'multi' && selectedProviders.length > 1 && onBatchSearch && (
                <Button
                  variant="outline"
                  className="px-6"
                  onClick={onBatchSearch}
                  disabled={!canSearch || isSearching}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Batch Search
                </Button>
              )}
            </div>
          </div>

          {/* Basic options row */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="w-32">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Per Page
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                value={pagination?.pageSize || searchParams.page_size || searchParams.num_results || 20}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                disabled={isSearching}
              >
                {getPageSizeOptions().map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              {searchParams.provider === 'scholar' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Scholar max: 20/page
                </div>
              )}
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Sort By
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                value={searchParams.sort_by}
                onChange={(e) => onSearchParamsChange({
                  ...searchParams,
                  sort_by: e.target.value as 'relevance' | 'date'
                })}
                disabled={isSearching}
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
              </select>
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                From Year
              </label>
              <Input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={searchParams.year_low || ''}
                onChange={(e) => onSearchParamsChange({
                  ...searchParams,
                  year_low: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="2020"
                className="dark:bg-gray-800 dark:text-gray-100"
                disabled={isSearching}
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                To Year
              </label>
              <Input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={searchParams.year_high || ''}
                onChange={(e) => onSearchParamsChange({
                  ...searchParams,
                  year_high: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="2024"
                className="dark:bg-gray-800 dark:text-gray-100"
                disabled={isSearching}
              />
            </div>
          </div>

          {/* Advanced options toggle */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                {showAdvanced ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4 pt-4 border-t space-y-4">
                {/* Provider-specific options */}
                {renderProviderSpecificOptions()}

                {/* Additional options */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include_citations"
                      checked={searchParams.include_citations}
                      onChange={(e) => onSearchParamsChange({
                        ...searchParams,
                        include_citations: e.target.checked
                      })}
                      disabled={isSearching}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="include_citations" className="text-sm text-gray-700 dark:text-gray-300">
                      Include Citation Information
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include_pdf_links"
                      checked={searchParams.include_pdf_links}
                      onChange={(e) => onSearchParamsChange({
                        ...searchParams,
                        include_pdf_links: e.target.checked
                      })}
                      disabled={isSearching}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="include_pdf_links" className="text-sm text-gray-700 dark:text-gray-300">
                      Include PDF Links
                    </label>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}