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
import { ArticleGroup } from '@/types/workbench';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface AddToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToGroup: (groupId: string, navigateToGroup: boolean) => Promise<void>;
  articlesToAdd: Array<{ id: string; title: string }>;
  sourceCollectionName: string;
}

type ModalStep = 'select-group' | 'navigation-choice' | 'adding';

export function AddToGroupModal({
  open,
  onOpenChange,
  onAddToGroup,
  articlesToAdd,
  sourceCollectionName
}: AddToGroupModalProps) {
  const [groups, setGroups] = useState<ArticleGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ArticleGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [modalStep, setModalStep] = useState<ModalStep>('select-group');
  const [targetGroupName, setTargetGroupName] = useState('');
  const [rememberChoice, setRememberChoice] = useState(false);
  const { toast } = useToast();

  // Load groups when modal opens
  useEffect(() => {
    if (open && modalStep === 'select-group') {
      loadGroups();
      setSelectedGroupId('');
      setSearchTerm('');
      setModalStep('select-group');
    }
  }, [open]);

  // Filter groups based on search
  useEffect(() => {
    const filtered = groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredGroups(filtered);
  }, [groups, searchTerm]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await workbenchApi.getGroups(1, 100);
      const groups = response.groups || [];
      setGroups(groups);
      setFilteredGroups(groups);
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

  const handleSelectGroup = async () => {
    if (!selectedGroupId) return;
    
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return;

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
    <>
      <DialogHeader>
        <DialogTitle className="text-gray-900 dark:text-gray-100">Add to Existing Group</DialogTitle>
        <DialogDescription className="text-gray-600 dark:text-gray-400">
          Adding {articlesToAdd.length} {articlesToAdd.length === 1 ? 'article' : 'articles'} to an existing group
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Article Preview */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Articles to add ({articlesToAdd.length}):
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {articlesToAdd.slice(0, 3).map((article, index) => (
              <div key={article.id} className="text-xs text-blue-800 dark:text-blue-200 truncate">
                • {article.title}
              </div>
            ))}
            {articlesToAdd.length > 3 && (
              <div className="text-xs text-blue-700 dark:text-blue-300 italic">
                ... and {articlesToAdd.length - 3} more
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>

        {/* Groups List */}
        <div className="h-[300px] pr-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600 dark:text-gray-400" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                {searchTerm ? 'No groups match your search.' : 'You don\'t have any saved groups yet.'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedGroupId === group.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  onClick={() => setSelectedGroupId(group.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {group.name}
                        </h3>
                      </div>

                      {group.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {group.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {group.article_count} articles
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {group.feature_definitions?.length || 0} features
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(group.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {selectedGroupId === group.id && (
                      <div className="ml-2">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
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
    </>
  );

  const renderNavigationChoiceStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Successfully Added
        </DialogTitle>
        <DialogDescription className="text-gray-600 dark:text-gray-400">
          Added {articlesToAdd.length} {articlesToAdd.length === 1 ? 'article' : 'articles'} to "{targetGroupName}"
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <div className="text-center">
          <p className="text-gray-900 dark:text-gray-100 mb-4">
            What would you like to do next?
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => handleNavigationChoice(false)}
            variant="outline"
            className="flex-1"
          >
            Stay Here
          </Button>
          <Button
            onClick={() => handleNavigationChoice(true)}
            variant="default"
            className="flex-1"
          >
            Go to Group
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="remember-choice"
            checked={rememberChoice}
            onCheckedChange={(checked) => setRememberChoice(checked as boolean)}
          />
          <label
            htmlFor="remember-choice"
            className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
          >
            Remember my choice
          </label>
        </div>
      </div>
    </>
  );

  const renderAddingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-gray-900 dark:text-gray-100">Adding Articles...</DialogTitle>
        <DialogDescription className="text-gray-600 dark:text-gray-400">
          Please wait while we add the articles to the group
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <span>Adding {articlesToAdd.length} articles to "{targetGroupName}"...</span>
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        {modalStep === 'select-group' && renderSelectGroupStep()}
        {modalStep === 'navigation-choice' && renderNavigationChoiceStep()}
        {modalStep === 'adding' && renderAddingStep()}
      </DialogContent>
    </Dialog>
  );
}