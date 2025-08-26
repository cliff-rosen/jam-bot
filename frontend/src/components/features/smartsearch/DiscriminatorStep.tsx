import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

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

  const [showDetails, setShowDetails] = useState(false);

  // Determine which count and text to show
  const articlesToProcess = filterAllMode ? Math.min(totalAvailable, 500) : selectedArticlesCount;

  return (
    <Card className="p-6 dark:bg-gray-800">
      {/* Magic Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">
          AI-Powered Article Evaluation
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          The smart filtering you've always wanted for PubMed results
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          AI will read each abstract and evaluate relevance to your evidence specification
        </p>
      </div>

      {/* Ready to Go Section */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              Ready to Filter {articlesToProcess.toLocaleString()} Articles
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              AI evaluation criteria has been generated for: <span className="italic">"{evidenceSpec}"</span>
            </p>
            <div className="flex items-center gap-4 text-xs text-green-600 dark:text-green-400">
              <span>✓ Criteria generated</span>
              <span>✓ {articlesToProcess} articles queued</span>
              <span>✓ AI ready</span>
            </div>
          </div>
          <Button
            onClick={onSubmit}
            disabled={!editedDiscriminator.trim()}
            size="lg"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 px-8"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start AI Filtering
          </Button>
        </div>
      </div>

      {/* Advanced Settings (Collapsible) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Advanced Settings & Criteria Details
          </span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showDetails && (
          <div className="px-4 pb-4 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            {/* Context Summary */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Evidence Specification
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  "{evidenceSpec}"
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Keywords Used
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  {searchKeywords}
                </p>
              </div>
            </div>

            {/* Filter Criteria */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                AI Evaluation Criteria
              </label>
              <Textarea
                value={editedDiscriminator}
                onChange={(e) => setEditedDiscriminator(e.target.value)}
                rows={6}
                className="dark:bg-gray-700 dark:text-gray-100 text-sm"
                placeholder="Enter criteria for evaluating article relevance..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This prompt will be used to evaluate each article's abstract for relevance.
              </p>
            </div>

            {/* Strictness Setting */}
            <div>
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

            {/* Submit Button */}
            <div className="flex justify-end mt-6">
              <Button
                onClick={onSubmit}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start AI Filtering
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}