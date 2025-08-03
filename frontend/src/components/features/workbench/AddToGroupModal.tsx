import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Search,
  FolderOpen,
  AlertCircle,
  FileText,
  Hash,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { workbenchApi } from '@/lib/api/workbenchApi';
import { ArticleGroup, ArticleGroupWithDetails } from '@/types/workbench';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface AddToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToGroup: (groupId: string, navigateToGroup: boolean) => Promise<void>;
  articlesToAdd: Array<{ id: string; title: string }>;
  sourceCollectionName: string;
  currentGroupId?: string; // Hide this group from the list
}

type ModalStep = 'select-group' | 'navigation-choice' | 'adding';

export function AddToGroupModal({
  open,
  onOpenChange,
  onAddToGroup,
  articlesToAdd,
  sourceCollectionName: _sourceCollectionName, // Not used currently
  currentGroupId
}: AddToGroupModalProps) {
  const [groups, setGroups] = useState<ArticleGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ArticleGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [modalStep, setModalStep] = useState<ModalStep>('select-group');
  const [targetGroupName, setTargetGroupName] = useState('');
  const [rememberChoice, setRememberChoice] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ total: number; duplicates: string[] } | null>(null);
  const [groupArticles, setGroupArticles] = useState<Record<string, Set<string>>>({});
  const { toast } = useToast();

  // Define loadGroups before using it in useEffect
  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await workbenchApi.getGroups(1, 100);
      const groupsData: ArticleGroup[] = response.groups || [];
      setGroups(groupsData);
      setFilteredGroups(groupsData);

      // Load article IDs for each group to check for duplicates
      const groupArticleMap: Record<string, Set<string>> = {};
      await Promise.all(
        groupsData.map(async (group: ArticleGroup) => {
          try {
            const detail: ArticleGroupWithDetails = await workbenchApi.getGroupDetails(group.id, 1, 1000); // Get all articles for duplicate checking
            groupArticleMap[group.id] = new Set<string>(
              detail.articles.map(item => item.article.id)
            );
          } catch (error) {
            console.error(`Failed to load details for group ${group.id}:`, error);
            groupArticleMap[group.id] = new Set<string>();
          }
        })
      );
      setGroupArticles(groupArticleMap);
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your saved groups',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load groups when modal opens
  useEffect(() => {
    if (open && modalStep === 'select-group') {
      loadGroups();
      setSelectedGroupId('');
      setSearchTerm('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modalStep]);

  // Filter groups based on search and exclude current group
  useEffect(() => {
    const filtered = groups.filter(group => {
      // Exclude the current group from the list
      if (currentGroupId && group.id === currentGroupId) {
        return false;
      }

      // Apply search filter
      return group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()));
    });
    setFilteredGroups(filtered);
  }, [groups, searchTerm, currentGroupId]);

  const handleSelectGroup = async () => {
    if (!selectedGroupId) return;

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return;

    // Calculate duplicates
    const targetArticleIds = groupArticles[selectedGroupId] || new Set();
    const duplicateIds = articlesToAdd
      .filter(article => targetArticleIds.has(article.id))
      .map(article => article.id);

    setDuplicateInfo({
      total: articlesToAdd.length,
      duplicates: duplicateIds
    });

    setTargetGroupName(selectedGroup.name);
    setModalStep('adding');

    try {
      await onAddToGroup(selectedGroupId, false); // Don't navigate yet
      setModalStep('navigation-choice'); // Show navigation choice after success
    } catch (error) {
      // Error is handled by the parent component
      setModalStep('select-group'); // Go back to group selection
    }
  };

  const handleNavigationChoice = async (navigateToGroup: boolean) => {
    setModalStep('adding');

    try {
      // If navigating, trigger the navigation
      if (navigateToGroup) {
        await onAddToGroup(selectedGroupId, true);
      }

      // Store user preference if they checked the box
      if (rememberChoice) {
        localStorage.setItem('addToGroupNavigationChoice', navigateToGroup ? 'navigate' : 'stay');
      }

      setModalStep('select-group');
      onOpenChange(false);
    } catch (error) {
      console.error('Navigation failed:', error);
      toast({
        title: 'Navigation Failed',
        description: error instanceof Error ? error.message : 'Failed to navigate to group',
        variant: 'destructive'
      });
      setModalStep('navigation-choice');
    }
  };

  const handleClose = () => {
    if (modalStep !== 'adding') {
      onOpenChange(false);
    }
  };

  const renderSelectGroupStep = () => (
    <div className="flex flex-col h-full">
      <DialogHeader className="flex-shrink-0 pb-4">
        <DialogTitle className="text-gray-900 dark:text-gray-100">Add to Existing Group</DialogTitle>
        <DialogDescription className="text-gray-600 dark:text-gray-400">
          Adding {articlesToAdd.length} {articlesToAdd.length === 1 ? 'article' : 'articles'} to an existing group
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col space-y-4 flex-1 min-h-0">
        {/* Article Preview with Duplicate Detection */}
        <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Articles to add ({articlesToAdd.length}):
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {articlesToAdd.slice(0, 5).map((article) => {
              const isDuplicate = selectedGroupId &&
                (groupArticles[selectedGroupId]?.has(article.id) || false);
              return (
                <div
                  key={article.id}
                  className={`text-xs truncate flex items-center gap-2 ${isDuplicate
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-blue-700 dark:text-blue-300'
                    }`}
                >
                  <span>•</span>
                  <span className="flex-1 truncate">{article.title}</span>
                  {isDuplicate && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                      Duplicate
                    </Badge>
                  )}
                </div>
              );
            })}
            {articlesToAdd.length > 5 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                ... and {articlesToAdd.length - 5} more
              </div>
            )}
          </div>
          {selectedGroupId && groupArticles[selectedGroupId] && (() => {
            const duplicateCount = articlesToAdd.filter(
              article => groupArticles[selectedGroupId].has(article.id)
            ).length;
            if (duplicateCount > 0) {
              return (
                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle className="w-3 h-3" />
                    <span>{duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} will be skipped</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Search */}
        <div className="flex-shrink-0 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Groups List - Scrollable */}
        <div className="flex-1 min-h-0 border rounded-lg">
          <div className="h-full overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-600 dark:text-gray-400" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  {searchTerm ? 'No groups match your search.' : 'You don\'t have any saved groups yet.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedGroupId === group.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate mb-1 text-gray-900 dark:text-gray-100">
                          {group.name}
                        </h3>

                        {group.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {group.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {group.article_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {group.feature_definitions?.length || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(group.updated_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>

                      {selectedGroupId === group.id && (
                        <CheckCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSelectGroup}
          disabled={!selectedGroupId || isLoading}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Add to Group
        </Button>
      </div>
    </div>
  );

  const renderNavigationChoiceStep = () => (
    <div className="flex flex-col h-full">
      <DialogHeader className="flex-shrink-0 pb-4">
        <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Successfully Added
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {duplicateInfo && duplicateInfo.duplicates.length > 0 ? (
            <>
              Added {duplicateInfo.total - duplicateInfo.duplicates.length} new {duplicateInfo.total - duplicateInfo.duplicates.length === 1 ? 'article' : 'articles'} to "{targetGroupName}"
              <span className="text-amber-600 dark:text-amber-400"> ({duplicateInfo.duplicates.length} duplicate{duplicateInfo.duplicates.length > 1 ? 's' : ''} skipped)</span>
            </>
          ) : (
            <>Added {articlesToAdd.length} {articlesToAdd.length === 1 ? 'article' : 'articles'} to "{targetGroupName}"</>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 flex flex-col justify-center space-y-6 py-8">
        <div className="text-center">
          <p className="text-lg mb-6 text-gray-900 dark:text-gray-100">
            What would you like to do next?
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={() => handleNavigationChoice(false)}
            variant="outline"
            className="flex-1 h-12"
          >
            Stay Here
          </Button>
          <Button
            onClick={() => handleNavigationChoice(true)}
            variant="default"
            className="flex-1 h-12"
          >
            Go to Group
          </Button>
        </div>

        <div className="flex items-center justify-center space-x-2 pt-4">
          <Checkbox
            id="remember-choice"
            checked={rememberChoice}
            onCheckedChange={(checked) => setRememberChoice(checked as boolean)}
          />
          <label
            htmlFor="remember-choice"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Remember my choice
          </label>
        </div>
      </div>
    </div>
  );

  const renderAddingStep = () => (
    <div className="flex flex-col h-full">
      <DialogHeader className="flex-shrink-0 pb-4">
        <DialogTitle className="text-gray-900 dark:text-gray-100">Adding Articles...</DialogTitle>
        <DialogDescription className="text-gray-600 dark:text-gray-400">
          Please wait while we add the articles to the group
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-medium text-gray-900 dark:text-white">
              Adding {duplicateInfo && duplicateInfo.duplicates.length > 0
                ? `${articlesToAdd.length - duplicateInfo.duplicates.length} new articles`
                : `${articlesToAdd.length} articles`} to
            </p>
            <p className="text-sm text-muted-foreground">"{targetGroupName}"</p>
            {duplicateInfo && duplicateInfo.duplicates.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Skipping {duplicateInfo.duplicates.length} duplicate{duplicateInfo.duplicates.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        {modalStep === 'select-group' && renderSelectGroupStep()}
        {modalStep === 'navigation-choice' && renderNavigationChoiceStep()}
        {modalStep === 'adding' && renderAddingStep()}
      </DialogContent>
    </Dialog>
  );
}