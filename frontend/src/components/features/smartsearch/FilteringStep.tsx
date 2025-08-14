import { Card } from '@/components/ui/card';
import type { FilteringProgress } from '@/types/smart-search';

interface FilteringStepProps {
  filteringProgress: FilteringProgress;
}

export function FilteringStep({ filteringProgress }: FilteringStepProps) {
  return (
    <Card className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Applying Semantic Filter
      </h2>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Progress</span>
          <span>{filteringProgress.processed} / {filteringProgress.total}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${(filteringProgress.processed / filteringProgress.total) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {filteringProgress.accepted}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {filteringProgress.rejected}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {filteringProgress.total - filteringProgress.processed}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
        </div>
      </div>

      {filteringProgress.current_article && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Currently evaluating:</div>
          <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {filteringProgress.current_article}
          </div>
        </div>
      )}
    </Card>
  );
}