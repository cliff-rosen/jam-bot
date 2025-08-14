import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { SmartSearchRefinement } from '@/types/smart-search';

interface RefinementStepProps {
  refinement: SmartSearchRefinement;
  editedQuery: string;
  setEditedQuery: (query: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function RefinementStep({ 
  refinement, 
  editedQuery, 
  setEditedQuery, 
  onSubmit, 
  loading 
}: RefinementStepProps) {
  return (
    <Card className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Review Refined Question
      </h2>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Step Completed:</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ✓ Original query refined for clarity and specificity
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Original Query
            </label>
            <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm text-gray-900 dark:text-gray-100">
              {refinement.original_query}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Refined Query (Step 2 Output)
            </label>
            <Textarea
              value={editedQuery}
              onChange={(e) => setEditedQuery(e.target.value)}
              rows={3}
              className="dark:bg-gray-700 dark:text-gray-100 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={loading || !editedQuery.trim()}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {loading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Generating...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Generate Search Query
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}