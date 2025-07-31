import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Search, 
  FolderOpen, 
  FileText, 
  Hash, 
  Calendar,
  AlertCircle 
} from 'lucide-react';
import { useWorkbench } from '@/context/WorkbenchContext';
import { ArticleGroup } from '@/types/workbench';
import { format } from 'date-fns';

interface GroupsTabProps {
  onLoadGroup: (groupId: string) => void;
}

export function GroupsTab({ onLoadGroup }: GroupsTabProps) {
  const workbench = useWorkbench();
  const [groups, setGroups] = useState<ArticleGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ArticleGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const groupsList = await workbench.loadGroupList();
      setGroups(groupsList);
      setFilteredGroups(groupsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load groups when component mounts
  useEffect(() => {
    loadGroups();
  }, []);

  // Filter groups based on search term
  useEffect(() => {
    const filtered = groups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredGroups(filtered);
  }, [groups, searchTerm]);

  const handleLoadGroup = (groupId: string) => {
    onLoadGroup(groupId);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
            <Loader2 className="w-6 h-6 animate-spin text-gray-600 dark:text-gray-400" />
            <span>Loading your saved groups...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={loadGroups} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Saved Groups</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {groups.length === 0 
              ? "No saved groups yet. Create your first group by saving search results."
              : `${groups.length} saved group${groups.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
        <Button onClick={loadGroups} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {groups.length > 0 && (
        <>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Groups List - Compact */}
          {filteredGroups.length === 0 ? (
            <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md">
              <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No groups match your search.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {group.article_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {group.feature_definitions?.length || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(group.updated_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {group.description}
                      </p>
                    )}
                  </div>

                  {/* Load button */}
                  <Button
                    onClick={() => handleLoadGroup(group.id)}
                    variant="outline"
                    size="sm"
                  >
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Load
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}