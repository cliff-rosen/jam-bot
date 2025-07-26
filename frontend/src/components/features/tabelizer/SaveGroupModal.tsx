import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { articleGroupApi, ArticleGroup } from '@/lib/api/articleGroupApi';
import { useToast } from '@/components/ui/use-toast';

interface SaveGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mode: 'new' | 'existing', groupId?: string, name?: string, description?: string) => Promise<void>;
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
  const [mode, setMode] = useState<'new' | 'existing'>('new');
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
      const response = await articleGroupApi.listGroups();
      setGroups(response.groups);
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

    if (mode === 'existing' && !selectedGroupId) {
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
        mode === 'existing' ? selectedGroupId : undefined,
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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Save Article Group</DialogTitle>
          <DialogDescription>
            Save {articleCount} articles and {columnCount} custom columns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'new' | 'existing')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new">Create new group</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" disabled={groups.length === 0} />
              <Label htmlFor="existing">Save to existing group</Label>
            </div>
          </RadioGroup>

          {mode === 'new' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Melanocortin Research Q1 2024"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose or contents of this group..."
                  rows={3}
                  disabled={isSaving}
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
                  <Label htmlFor="group">Select Group</Label>
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
                  {selectedGroupId && (
                    <div className="flex items-start gap-2 p-3 mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        This will replace all existing data in the selected group.
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