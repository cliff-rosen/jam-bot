import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Search, Sparkles } from 'lucide-react';
import { useSmartSearch2 } from '@/context/SmartSearch2Context';

interface SearchFormProps {
  onSearch: () => void;
  onToggleKeywordHelper: () => void;
  isSearching: boolean;
}

export function SearchForm({
  onSearch,
  onToggleKeywordHelper,
  isSearching
}: SearchFormProps) {
  const {
    selectedSource,
    searchQuery,
    updateSelectedSource,
    updateSearchQuery
  } = useSmartSearch2();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    await onSearch();
  };

  const getPlaceholderText = () => {
    return selectedSource === 'google_scholar'
      ? '"machine learning" healthcare diagnosis'
      : '(cannabis OR marijuana) AND (motivation OR apathy) AND (study OR research)';
  };

  return (
    <Card className="p-6 dark:bg-gray-800">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Selection */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Select Source
          </Label>
          <RadioGroup
            value={selectedSource}
            onValueChange={(value) => {
              const newSource = value as 'pubmed' | 'google_scholar';
              updateSelectedSource(newSource);
            }}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pubmed" id="pubmed" />
              <Label
                htmlFor="pubmed"
                className="cursor-pointer font-normal"
              >
                PubMed
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="google_scholar" id="google_scholar" />
              <Label
                htmlFor="google_scholar"
                className="cursor-pointer font-normal"
              >
                Google Scholar
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Search Query Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="query" className="text-base font-semibold">
              Search Keywords
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleKeywordHelper}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Use AI Keyword Helper
            </Button>
          </div>
          <Textarea
            id="query"
            value={searchQuery}
            onChange={(e) => {
              const newQuery = e.target.value;
              updateSearchQuery(newQuery);
            }}
            rows={6}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
            placeholder={getPlaceholderText()}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {selectedSource === 'google_scholar'
              ? 'Enter natural language search terms'
              : 'Enter boolean search query with AND, OR, NOT operators'
            }
          </p>
        </div>

        {/* Search Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isSearching ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}