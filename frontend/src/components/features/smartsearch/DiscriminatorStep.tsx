import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface DiscriminatorStepProps {
  editedQuestion: string;
  editedSearchQuery: string;
  editedDiscriminator: string;
  setEditedDiscriminator: (discriminator: string) => void;
  strictness: 'low' | 'medium' | 'high';
  setStrictness: (strictness: 'low' | 'medium' | 'high') => void;
  selectedArticlesCount: number;
  filterAllMode?: boolean;
  totalAvailable?: number;
  onSubmit: () => void;
}

export function DiscriminatorStep({
  editedQuestion,
  editedSearchQuery,
  editedDiscriminator,
  setEditedDiscriminator,
  strictness,
  setStrictness,
  selectedArticlesCount,
  filterAllMode = false,
  totalAvailable = 0,
  onSubmit
}: DiscriminatorStepProps) {
  
  // Determine which count and text to show
  const articlesToProcess = filterAllMode ? Math.min(totalAvailable, 500) : selectedArticlesCount;
  const buttonText = filterAllMode 
    ? `Start Filtering All ${articlesToProcess} Articles`
    : `Start Filtering ${selectedArticlesCount} Selected Articles`;
  return (
    <Card className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Review & Edit Semantic Filter Criteria
      </h2>

      <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Step Completed:</h3>
        <p className="text-sm text-purple-800 dark:text-purple-200">
          ✓ Generated semantic evaluation criteria for {strictness} strictness filtering
        </p>
        <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
          Review and edit the criteria below. This prompt will be used to evaluate each article for relevance.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Research Question
            </label>
            <div className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-white dark:bg-gray-800 rounded border">
              {editedQuestion}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Search Query
            </label>
            <div className="text-sm text-gray-600 dark:text-gray-400 p-2 bg-white dark:bg-gray-800 rounded border font-mono">
              {editedSearchQuery}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Semantic Evaluation Criteria
          </label>
          <Textarea
            value={editedDiscriminator}
            onChange={(e) => setEditedDiscriminator(e.target.value)}
            rows={12}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
            placeholder="Enter evaluation criteria for filtering articles..."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This prompt will be used to evaluate each article. Edit it to adjust the filtering criteria.
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter Strictness:
            </span>
            {(['low', 'medium', 'high'] as const).map((level) => (
              <Button
                key={level}
                variant={strictness === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStrictness(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {strictness === 'low' && 'More inclusive - accepts somewhat related articles'}
            {strictness === 'medium' && 'Balanced - accepts clearly related articles'}
            {strictness === 'high' && 'Strict - only accepts directly relevant articles'}
          </p>
        </div>

        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tip: Make criteria more specific to improve filtering precision
          </p>
          <Button
            onClick={onSubmit}
            disabled={!editedDiscriminator.trim()}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            <Search className="w-4 h-4 mr-2" />
{buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
}