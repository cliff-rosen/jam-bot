import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { workbenchApi, ColumnDefinition, ColumnPreset } from '@/lib/api/workbenchApi';
import { Plus, X, Settings } from 'lucide-react';

interface AddColumnModalProps {
  onAdd: (columns: ColumnDefinition[]) => void;
  onClose: () => void;
}

export function AddColumnModal({ onAdd, onClose }: AddColumnModalProps) {
  const [columns, setColumns] = useState<ColumnDefinition[]>([{
    name: '',
    description: '',
    type: 'boolean'
  }]);
  const [presets, setPresets] = useState<ColumnPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const response = await workbenchApi.getColumnPresets();
        setPresets(response.presets || []);
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    };
    loadPresets();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validColumns = columns.filter(col => 
      col.name.trim() && col.description.trim()
    );
    if (validColumns.length > 0) {
      onAdd(validColumns);
    }
  };

  const handlePresetSubmit = async () => {
    const preset = presets.find(p => p.id === selectedPreset);
    if (!preset) return;
    
    setLoading(true);
    try {
      onAdd(preset.columns);
    } catch (error) {
      console.error('Failed to apply preset:', error);
    } finally {
      setLoading(false);
    }
  };

  const addColumn = () => {
    setColumns([...columns, {
      name: '',
      description: '',
      type: 'boolean'
    }]);
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  const updateColumn = (index: number, field: keyof ColumnDefinition, value: any) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const updateColumnOptions = (index: number, options: ColumnDefinition['options']) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], options };
    setColumns(updated);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Add Columns to Extract Data
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define custom columns or choose from presets. All columns will be processed together in a single AI extraction.
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="custom" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Custom Columns
              </TabsTrigger>
              <TabsTrigger value="preset" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Preset Collections
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="custom" className="flex-1 mt-4">
              <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-2">
                  {columns.map((column, index) => (
                    <Card key={index} className="h-fit">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Column {index + 1}</CardTitle>
                          {columns.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeColumn(index)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Column Name */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Column Name</Label>
                          <Input
                            value={column.name}
                            onChange={(e) => updateColumn(index, 'name', e.target.value)}
                            placeholder="e.g., Sample Size, Has Side Effects"
                            className="h-9"
                          />
                        </div>

                        {/* Column Type */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Data Type</Label>
                          <RadioGroup 
                            value={column.type} 
                            onValueChange={(value) => updateColumn(index, 'type', value as 'boolean' | 'text' | 'score')}
                            className="grid grid-cols-1 gap-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="boolean" id={`boolean-${index}`} />
                              <Label htmlFor={`boolean-${index}`} className="text-sm font-normal cursor-pointer">
                                Yes/No Question
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="text" id={`text-${index}`} />
                              <Label htmlFor={`text-${index}`} className="text-sm font-normal cursor-pointer">
                                Text Extract (short)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="score" id={`score-${index}`} />
                              <Label htmlFor={`score-${index}`} className="text-sm font-normal cursor-pointer">
                                Numeric Score
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Score Range Configuration */}
                        {column.type === 'score' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Score Range</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Min</Label>
                                <Input
                                  type="number"
                                  value={column.options?.min || 1}
                                  onChange={(e) => updateColumnOptions(index, {
                                    ...column.options,
                                    min: Number(e.target.value)
                                  })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Max</Label>
                                <Input
                                  type="number"
                                  value={column.options?.max || 10}
                                  onChange={(e) => updateColumnOptions(index, {
                                    ...column.options,
                                    max: Number(e.target.value)
                                  })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600 dark:text-gray-400">Step</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={column.options?.step || 1}
                                  onChange={(e) => updateColumnOptions(index, {
                                    ...column.options,
                                    step: Number(e.target.value)
                                  })}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Description/Question */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            {column.type === 'boolean' ? 'Question to Ask' : 
                             column.type === 'score' ? 'Scoring Instructions' : 
                             'What to Extract'}
                          </Label>
                          <Textarea
                            value={column.description}
                            onChange={(e) => updateColumn(index, 'description', e.target.value)}
                            placeholder={
                              column.type === 'boolean'
                                ? "e.g., Does this study report any adverse events or side effects?"
                                : column.type === 'score'
                                ? "e.g., Rate the study quality from 1-10 based on methodology"
                                : "e.g., What is the primary outcome measure?"
                            }
                            rows={3}
                            className="text-sm resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Add Column Card */}
                  <Card className="border-dashed border-2 h-fit">
                    <CardContent className="flex items-center justify-center py-8">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={addColumn}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                      >
                        <Plus className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Add Another Column</span>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <DialogFooter className="flex-shrink-0 mt-6">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!columns.some(col => col.name.trim() && col.description.trim())}
                    className="min-w-[120px]"
                  >
                    Extract {columns.filter(col => col.name.trim() && col.description.trim()).length} Column{columns.filter(col => col.name.trim() && col.description.trim()).length === 1 ? '' : 's'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="preset" className="flex-1 mt-4">
              <div className="h-full flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto pr-2">
                  {presets.map((preset) => (
                    <Card 
                      key={preset.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPreset === preset.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => setSelectedPreset(preset.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={preset.id}
                            name="preset"
                            value={preset.id}
                            checked={selectedPreset === preset.id}
                            onChange={() => setSelectedPreset(preset.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <CardTitle className="text-base font-medium">
                            {preset.name}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {preset.description}
                        </p>
                        {preset.columns && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {preset.columns.length} columns:
                            </p>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {preset.columns.map(col => col.name).join(', ')}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <DialogFooter className="flex-shrink-0 mt-6">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePresetSubmit} 
                    disabled={!selectedPreset || loading}
                    className="min-w-[120px]"
                  >
                    {loading ? 'Extracting...' : 'Extract Preset'}
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}