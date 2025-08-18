import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import type { SmartSearchRefinement } from '@/types/smart-search';

interface RefinementStepProps {
  refinement: SmartSearchRefinement;
  evidenceSpec: string;
  setEvidenceSpec: (spec: string) => void;
  onSubmit: (selectedSources: string[]) => void;
  loading: boolean;
}

export function RefinementStep({
  refinement,
  evidenceSpec,
  setEvidenceSpec,
  onSubmit,
  loading
}: RefinementStepProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>(['pubmed', 'google_scholar']);

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleSubmit = () => {
    if (selectedSources.length === 0) {
      // Ensure at least one source is selected
      return;
    }
    onSubmit(selectedSources);
  };

  return (
    <Card className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Review Evidence Specification
      </h2>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Step Completed:</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ✓ Evidence specification created from your query
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
              Evidence Specification
            </label>
            <Textarea
              value={evidenceSpec}
              onChange={(e) => setEvidenceSpec(e.target.value)}
              rows={8}
              className="dark:bg-gray-700 dark:text-gray-100 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Select Sources to Search
          </label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pubmed"
                checked={selectedSources.includes('pubmed')}
                onCheckedChange={() => handleSourceToggle('pubmed')}
              />
              <label
                htmlFor="pubmed"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                PubMed
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (Biomedical literature database)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="google_scholar"
                checked={selectedSources.includes('google_scholar')}
                onCheckedChange={() => handleSourceToggle('google_scholar')}
              />
              <label
                htmlFor="google_scholar"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Google Scholar
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (Broad academic search)
              </span>
            </div>
          </div>
          {selectedSources.length === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Please select at least one source
            </p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !evidenceSpec.trim() || selectedSources.length === 0}
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
              Generate Keywords
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}