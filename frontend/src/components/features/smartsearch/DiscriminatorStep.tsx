import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface DiscriminatorStepProps {
  evidenceSpec: string;
  searchKeywords: string;
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
  evidenceSpec,
  searchKeywords,
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
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Filter Criteria
      </h2>

      <div className="space-y-4">
        {/* Context Summary */}
        <div className="space-y-3 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Evidence Specification
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              "{evidenceSpec}"
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Keywords
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {searchKeywords}
            </p>
          </div>
        </div>

        {/* Filter Criteria */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Evaluation Criteria
          </label>
          <Textarea
            value={editedDiscriminator}
            onChange={(e) => setEditedDiscriminator(e.target.value)}
            rows={8}
            className="dark:bg-gray-700 dark:text-gray-100 text-sm"
            placeholder="Enter criteria for evaluating article relevance..."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This will be used to evaluate each article for relevance.
          </p>
        </div>

        {/* Strictness Setting */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            Filter Strictness
          </label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <Button
                key={level}
                variant={strictness === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStrictness(level)}
                className="min-w-[80px]"
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {strictness === 'low' && 'More inclusive - accepts somewhat related articles'}
            {strictness === 'medium' && 'Balanced - accepts clearly related articles'}
            {strictness === 'high' && 'Strict - only accepts directly relevant articles'}
          </p>
        </div>

        {/* Start Filtering Button */}
        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={!editedDiscriminator.trim()}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Search className="w-4 h-4 mr-2" />
            {buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
}