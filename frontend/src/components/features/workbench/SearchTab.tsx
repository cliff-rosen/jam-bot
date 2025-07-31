import { useWorkbench } from '@/context/WorkbenchContext';
import { UnifiedSearchControls } from './search/UnifiedSearchControls';
import { useToast } from '@/components/ui/use-toast';

interface SearchTabProps {
  onNewSearch: (page?: number) => void;
}

export function SearchTab({ onNewSearch }: SearchTabProps) {
  const workbench = useWorkbench();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!workbench.searchQuery.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    await onNewSearch(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Search Research Articles</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Search across PubMed and Google Scholar for research articles
        </p>
      </div>

      <UnifiedSearchControls
        query={workbench.searchQuery}
        onQueryChange={workbench.updateSearchQuery}
        selectedProviders={workbench.selectedProviders}
        onProvidersChange={workbench.updateSelectedProviders}
        searchMode={workbench.searchMode}
        onSearchModeChange={workbench.updateSearchMode}
        onSearch={handleSearch}
        isSearching={workbench.collectionLoading}
        pageSize={workbench.searchParams.pageSize}
        onPageSizeChange={(pageSize) => workbench.updateSearchParams({ pageSize })}
        sortBy={workbench.searchParams.sortBy}
        onSortByChange={(sortBy) => workbench.updateSearchParams({ sortBy })}
        yearLow={workbench.searchParams.yearLow}
        onYearLowChange={(yearLow) => workbench.updateSearchParams({ yearLow })}
        yearHigh={workbench.searchParams.yearHigh}
        onYearHighChange={(yearHigh) => workbench.updateSearchParams({ yearHigh })}
        dateType={workbench.searchParams.dateType}
        onDateTypeChange={(dateType) => workbench.updateSearchParams({ dateType })}
        includeCitations={workbench.searchParams.includeCitations}
        onIncludeCitationsChange={(includeCitations) => workbench.updateSearchParams({ includeCitations })}
        includePdfLinks={workbench.searchParams.includePdfLinks}
        onIncludePdfLinksChange={(includePdfLinks) => workbench.updateSearchParams({ includePdfLinks })}
      />
    </div>
  );
}