import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { workbenchApi } from '@/lib/api/workbenchApi';
import { ArticleGroup } from '@/types/workbench';
import { useToast } from '@/components/ui/use-toast';

interface SaveGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mode: 'new' | 'existing' | 'add', groupId?: string, name?: string, description?: string) => Promise<void>;
  articleCount: number;
  columnCount: number;
}

export function SaveGroupModal({
  isOpen,
  onClose,
  onSave,
  articleCount,
  columnCount
}: SaveGroupModalProps) {
  const [mode, setMode] = useState<'new' | 'existing' | 'add'>('new');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groups, setGroups] = useState<ArticleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load user's groups when modal opens
  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await workbenchApi.getGroups(1, 100);
      setGroups(response.groups || []);
      if (response.groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(response.groups[0].id);
      }
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

  const handleSave = async () => {
    if (mode === 'new' && !name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the group',
        variant: 'destructive'
      });
      return;
    }

    if ((mode === 'existing' || mode === 'add') && !selectedGroupId) {
      toast({
        title: 'Error',
        description: 'Please select a group',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        mode,
        (mode === 'existing' || mode === 'add') ? selectedGroupId : undefined,
        mode === 'new' ? name : undefined,
        mode === 'new' ? description : undefined
      );
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setMode('new');
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Save Article Group</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Save {articleCount} articles and {columnCount} custom columns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'new' | 'existing' | 'add')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="text-gray-900 dark:text-gray-100">Create new group</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" disabled={groups.length === 0} />
              <Label htmlFor="existing" className="text-gray-900 dark:text-gray-100">Replace existing group</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="add" id="add" disabled={groups.length === 0} />
              <Label htmlFor="add" className="text-gray-900 dark:text-gray-100">Add to existing group</Label>
            </div>
          </RadioGroup>

          {mode === 'new' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">Group Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Melanocortin Research Q1 2024"
                  disabled={isSaving}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose or contents of this group..."
                  rows={3}
                  disabled={isSaving}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : groups.length === 0 ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    You don't have any saved groups yet. Create a new group to get started.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="group" className="text-gray-900 dark:text-gray-100">Select Group</Label>
                  <select
                    id="group"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.article_count} articles · Updated {new Date(group.updated_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  {selectedGroupId && mode === 'existing' && (
                    <div className="flex items-start gap-2 p-3 mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        This will replace all existing data in the selected group.
                      </div>
                    </div>
                  )}
                  {selectedGroupId && mode === 'add' && (
                    <div className="flex items-start gap-2 p-3 mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        Articles will be added to the selected group. Duplicates will be automatically removed.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || (mode === 'new' && !name.trim())}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Group
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}