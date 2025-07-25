import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tabelizerApi } from './api/tabelizerApi';
import { TabelizerPreset } from './types';

interface AddColumnModalProps {
  onAdd: (name: string, description: string, type: 'boolean' | 'text' | 'score', options?: { min?: number; max?: number; step?: number }) => void;
  onAddMultiple: (columnsConfig: Record<string, { description: string; type: 'boolean' | 'text' | 'score'; options?: { min?: number; max?: number; step?: number } }>) => void;
  onClose: () => void;
}

export function AddColumnModal({ onAdd, onAddMultiple, onClose }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'boolean' | 'text' | 'score'>('boolean');
  const [minValue, setMinValue] = useState(1);
  const [maxValue, setMaxValue] = useState(10);
  const [stepValue, setStepValue] = useState(1);
  const [presets, setPresets] = useState<Record<string, TabelizerPreset>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const presetsData = await tabelizerApi.getPresets();
        setPresets(presetsData);
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    };
    loadPresets();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && description.trim()) {
      const options = type === 'score' ? {
        min: minValue,
        max: maxValue,
        step: stepValue
      } : undefined;
      onAdd(name.trim(), description.trim(), type, options);
    }
  };

  const handlePresetSubmit = async () => {
    if (!selectedPreset || !presets[selectedPreset]) return;
    
    setLoading(true);
    try {
      await onAddMultiple(presets[selectedPreset].columns);
      onClose();
    } catch (error) {
      console.error('Failed to apply preset:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Add Columns</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Column</TabsTrigger>
            <TabsTrigger value="preset">Preset Columns</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single">
            <form onSubmit={handleSubmit}>
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
                  <RadioGroup value={type} onValueChange={(value) => setType(value as 'boolean' | 'text' | 'score')}>
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
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="score" id="score" />
                      <Label htmlFor="score" className="font-normal cursor-pointer text-gray-900 dark:text-gray-100">
                        Numeric Score/Rating
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Score Range Configuration */}
                {type === 'score' && (
                  <div className="space-y-2">
                    <Label className="text-gray-900 dark:text-gray-100">Score Range</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="min" className="text-xs text-gray-600 dark:text-gray-400">Min</Label>
                        <Input
                          id="min"
                          type="number"
                          value={minValue}
                          onChange={(e) => setMinValue(Number(e.target.value))}
                          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max" className="text-xs text-gray-600 dark:text-gray-400">Max</Label>
                        <Input
                          id="max"
                          type="number"
                          value={maxValue}
                          onChange={(e) => setMaxValue(Number(e.target.value))}
                          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="step" className="text-xs text-gray-600 dark:text-gray-400">Step</Label>
                        <Input
                          id="step"
                          type="number"
                          step="0.1"
                          value={stepValue}
                          onChange={(e) => setStepValue(Number(e.target.value))}
                          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Score will be constrained to this range (e.g., 1-10 for rating, 0-100 for percentage)
                    </p>
                  </div>
                )}

                {/* Description/Question */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">
                    {type === 'boolean' ? 'Question' : type === 'score' ? 'Scoring Criteria' : 'What to Extract'}
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      type === 'boolean'
                        ? "e.g., Does this study report any adverse events or side effects?"
                        : type === 'score'
                        ? "e.g., Rate the quality of this study's methodology from 1-10"
                        : "e.g., What is the main finding of this study?"
                    }
                    rows={3}
                    required
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {type === 'boolean'
                      ? "The AI will answer with 'yes' or 'no' for each article."
                      : type === 'score'
                      ? `The AI will assign a numeric score within your specified range (${minValue}-${maxValue}).`
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
          </TabsContent>
          
          <TabsContent value="preset">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-gray-100">Select Preset</Label>
                <div className="space-y-3">
                  {Object.entries(presets).map(([key, preset]) => (
                    <div key={key} className="border rounded-lg p-3 dark:border-gray-600">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={key}
                          name="preset"
                          value={key}
                          checked={selectedPreset === key}
                          onChange={(e) => setSelectedPreset(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <Label htmlFor={key} className="font-medium cursor-pointer text-gray-900 dark:text-gray-100">
                          {preset.name}
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-6">
                        {preset.description}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 ml-6">
                        {Object.keys(preset.columns).length} columns: {Object.keys(preset.columns).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handlePresetSubmit} 
                disabled={!selectedPreset || loading}
              >
                {loading ? 'Adding Columns...' : 'Add Preset Columns'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}