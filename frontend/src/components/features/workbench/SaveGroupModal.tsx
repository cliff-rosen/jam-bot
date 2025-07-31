import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FolderPlus, Save } from 'lucide-react';

interface SaveGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description?: string) => void;
  onAddToGroup?: (groupId: string) => void;
  defaultName?: string;
  existingGroups?: Array<{ id: string; name: string; description?: string; articleCount: number }>;
}

export function SaveGroupModal({
  open,
  onOpenChange,
  onSave,
  onAddToGroup,
  defaultName,
  existingGroups = []
}: SaveGroupModalProps) {
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    if (open) {
      if (defaultName) {
        setName(defaultName);
      }
      // Reset to new group mode by default
      setSaveMode('new');
      setSelectedGroupId('');
      setDescription('');
    }
  }, [open, defaultName]);

  const handleSave = () => {
    if (saveMode === 'new') {
      if (!name.trim()) return;
      onSave(name.trim(), description.trim() || undefined);
    } else {
      if (!selectedGroupId || !onAddToGroup) return;
      onAddToGroup(selectedGroupId);
    }
    
    // Reset form
    setName('');
    setDescription('');
    setSelectedGroupId('');
  };

  const canSave = saveMode === 'new' ? name.trim() : selectedGroupId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Save Article Collection
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Choose how to save your current collection of articles and features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Save Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Save Options</Label>
            <RadioGroup
              value={saveMode}
              onValueChange={(value) => setSaveMode(value as 'new' | 'existing')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new-group" />
                <Label htmlFor="new-group" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  Create New Group
                </Label>
              </div>
              {existingGroups.length > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing-group" />
                  <Label htmlFor="existing-group" className="text-sm cursor-pointer text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add to Existing Group
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* New Group Form */}
          {saveMode === 'new' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Group Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter group name"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Description (optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 resize-none"
                />
              </div>
            </div>
          )}

          {/* Existing Groups Selection */}
          {saveMode === 'existing' && existingGroups.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Select Group
              </Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {existingGroups.map((group) => (
                  <Card
                    key={group.id}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      selectedGroupId === group.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="group-selection"
                              value={group.id}
                              checked={selectedGroupId === group.id}
                              onChange={() => setSelectedGroupId(group.id)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {group.name}
                            </h4>
                          </div>
                          {group.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                          {group.articleCount} articles
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!canSave}
            className="min-w-[120px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMode === 'new' ? 'Create Group' : 'Add to Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}