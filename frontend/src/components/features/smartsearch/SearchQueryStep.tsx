import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface SearchQueryStepProps {
  editedSearchQuery: string;
  setEditedSearchQuery: (query: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function SearchQueryStep({
  editedSearchQuery,
  setEditedSearchQuery,
  onSubmit,
  loading
}: SearchQueryStepProps) {
  return (
    <Card className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Review Search Query
      </h2>
      
      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Step Completed:</h3>
        <p className="text-sm text-green-800 dark:text-green-200">
          ✓ Boolean search query generated from refined question
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Generated Search Query
          </label>
          <Textarea
            value={editedSearchQuery}
            onChange={(e) => setEditedSearchQuery(e.target.value)}
            rows={3}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
            placeholder="(cancer OR carcinoma) AND (treatment OR therapy) AND CRISPR"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Boolean search query with AND, OR, NOT operators and parentheses for grouping
          </p>
        </div>
        
        <Button
          onClick={onSubmit}
          disabled={loading || !editedSearchQuery.trim()}
          className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
        >
          {loading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search Articles
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}