import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

interface AddColumnModalProps {
  onAdd: (name: string, description: string, type: 'boolean' | 'text') => void;
  onClose: () => void;
}

export function AddColumnModal({ onAdd, onClose }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'boolean' | 'text'>('boolean');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && description.trim()) {
      onAdd(name.trim(), description.trim(), type);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Add Custom Column</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Column Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">Column Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Has Side Effects"
                required
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
            </div>

            {/* Column Type */}
            <div className="space-y-2">
              <Label className="text-gray-900 dark:text-gray-100">Column Type</Label>
              <RadioGroup value={type} onValueChange={(value) => setType(value as 'boolean' | 'text')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="boolean" id="boolean" />
                  <Label htmlFor="boolean" className="font-normal cursor-pointer text-gray-900 dark:text-gray-100">
                    Yes/No Question
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" />
                  <Label htmlFor="text" className="font-normal cursor-pointer text-gray-900 dark:text-gray-100">
                    Text Extraction (100 chars max)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Description/Question */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">
                {type === 'boolean' ? 'Question' : 'What to Extract'}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === 'boolean'
                    ? "e.g., Does this study report any adverse events or side effects?"
                    : "e.g., What is the main finding of this study?"
                }
                rows={3}
                required
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {type === 'boolean'
                  ? "The AI will answer with 'yes' or 'no' for each article."
                  : "The AI will extract a brief text summary (max 100 characters)."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !description.trim()}>
              Add Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}