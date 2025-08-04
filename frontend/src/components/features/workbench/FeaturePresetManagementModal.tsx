import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Check, X, Copy, Settings, FolderPlus } from 'lucide-react';
import { FeatureDefinition } from '@/types/workbench';
import { useFeaturePresets, FeaturePreset } from '@/lib/hooks/useFeaturePresets';
import { generatePrefixedUUID } from '@/lib/utils/uuid';

interface FeaturePresetManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EditMode = 'none' | 'create' | 'edit';

export function FeaturePresetManagementModal({
  open,
  onOpenChange
}: FeaturePresetManagementModalProps) {
  const {
    presets,
    loading,
    error,
    createPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    refreshPresets
  } = useFeaturePresets();

  // UI state
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editingPreset, setEditingPreset] = useState<FeaturePreset | null>(null);
  const [presetForm, setPresetForm] = useState({
    name: '',
    description: '',
    category: '',
    features: [] as FeatureDefinition[]
  });

  // Feature editing state
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [featureForm, setFeatureForm] = useState<FeatureDefinition>({
    id: '',
    name: '',
    description: '',
    type: 'text' as const
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      refreshPresets();
      resetForm();
    }
  }, [open, refreshPresets]);

  const resetForm = () => {
    setEditMode('none');
    setEditingPreset(null);
    setPresetForm({
      name: '',
      description: '',
      category: '',
      features: []
    });
    setEditingFeatureIndex(null);
    setFeatureForm({
      id: '',
      name: '',
      description: '',
      type: 'text'
    });
  };

  const startCreatePreset = () => {
    resetForm();
    setEditMode('create');
    setPresetForm({
      name: '',
      description: '',
      category: '',
      features: []
    });
  };

  const startEditPreset = (preset: FeaturePreset) => {
    setEditMode('edit');
    setEditingPreset(preset);
    setPresetForm({
      name: preset.name,
      description: preset.description || '',
      category: preset.category || '',
      features: [...preset.features]
    });
  };

  const handleSavePreset = async () => {
    if (!presetForm.name.trim()) return;

    try {
      if (editMode === 'create') {
        await createPreset({
          name: presetForm.name,
          description: presetForm.description,
          category: presetForm.category,
          features: presetForm.features
        });
      } else if (editMode === 'edit' && editingPreset) {
        await updatePreset(editingPreset.id, {
          name: presetForm.name,
          description: presetForm.description,
          category: presetForm.category,
          features: presetForm.features
        });
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  const handleDeletePreset = async (preset: FeaturePreset) => {
    if (window.confirm(`Delete preset "${preset.name}"?`)) {
      await deletePreset(preset.id);
    }
  };

  const handleDuplicatePreset = async (preset: FeaturePreset) => {
    const newName = window.prompt('New preset name:', `Copy of ${preset.name}`);
    if (newName && newName.trim()) {
      await duplicatePreset(preset.id, newName);
    }
  };

  // Feature management within preset
  const startAddFeature = () => {
    setEditingFeatureIndex(-1); // -1 indicates new feature
    setFeatureForm({
      id: generatePrefixedUUID('feat'),
      name: '',
      description: '',
      type: 'text'
    });
  };

  const startEditFeature = (index: number) => {
    setEditingFeatureIndex(index);
    setFeatureForm({ ...presetForm.features[index] });
  };

  const handleSaveFeature = () => {
    if (!featureForm.name.trim() || !featureForm.description.trim()) return;

    const updatedFeatures = [...presetForm.features];
    
    if (editingFeatureIndex === -1) {
      // Adding new feature
      updatedFeatures.push(featureForm);
    } else if (editingFeatureIndex !== null) {
      // Editing existing feature
      updatedFeatures[editingFeatureIndex] = featureForm;
    }

    setPresetForm(prev => ({ ...prev, features: updatedFeatures }));
    setEditingFeatureIndex(null);
    setFeatureForm({
      id: generatePrefixedUUID('feat'),
      name: '',
      description: '',
      type: 'text'
    });
  };

  const handleDeleteFeature = (index: number) => {
    const updatedFeatures = presetForm.features.filter((_, i) => i !== index);
    setPresetForm(prev => ({ ...prev, features: updatedFeatures }));
  };

  const cancelFeatureEdit = () => {
    setEditingFeatureIndex(null);
    setFeatureForm({
      id: generatePrefixedUUID('feat'),
      name: '',
      description: '',
      type: 'text'
    });
  };

  // Group presets by category
  const presetsByCategory = presets.reduce((acc, preset) => {
    const category = preset.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(preset);
    return acc;
  }, {} as Record<string, FeaturePreset[]>);

  const userPresets = presets.filter(p => p.category !== 'Core Analysis' && p.category !== 'Medical Research' && p.category !== 'Pharmaceutical' && p.category !== 'Basic Science');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Feature Presets
          </DialogTitle>
        </DialogHeader>

        {editMode === 'none' ? (
          // List view
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create and manage your custom feature presets
              </p>
              <Button onClick={startCreatePreset} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Preset
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading presets...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">Error: {error}</div>
            ) : (
              <div className="space-y-6">
                {/* User's custom presets */}
                {userPresets.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-foreground">Your Presets</h3>
                    <div className="grid gap-3">
                      {userPresets.map((preset) => (
                        <Card key={preset.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{preset.name}</h4>
                              {preset.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {preset.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {preset.features.length} features
                                {preset.category && ` • ${preset.category}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicatePreset(preset)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditPreset(preset)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePreset(preset)}
                                disabled={preset.category === 'Core Analysis'} // Protect global presets
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Global presets (read-only, but can duplicate) */}
                {Object.entries(presetsByCategory).map(([category, categoryPresets]) => {
                  const isGlobalCategory = ['Core Analysis', 'Medical Research', 'Pharmaceutical', 'Basic Science'].includes(category);
                  if (!isGlobalCategory) return null;

                  return (
                    <div key={category}>
                      <h3 className="text-lg font-medium mb-3 text-foreground">{category} (System)</h3>
                      <div className="grid gap-3">
                        {categoryPresets.map((preset) => (
                          <Card key={preset.id} className="p-4 bg-muted/30">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{preset.name}</h4>
                                {preset.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {preset.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {preset.features.length} features • System preset
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicatePreset(preset)}
                                  title="Create a copy you can edit"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Create/Edit form
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {editMode === 'create' ? 'Create New Preset' : 'Edit Preset'}
              </h3>
              <Button variant="ghost" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preset metadata form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preset-name">Name *</Label>
                <Input
                  id="preset-name"
                  value={presetForm.name}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter preset name"
                />
              </div>
              <div>
                <Label htmlFor="preset-category">Category</Label>
                <Input
                  id="preset-category"
                  value={presetForm.category}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Medical Research"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="preset-description">Description</Label>
              <Textarea
                id="preset-description"
                value={presetForm.description}
                onChange={(e) => setPresetForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this preset is used for"
                className="h-20"
              />
            </div>

            {/* Features section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Features ({presetForm.features.length})</h4>
                <Button onClick={startAddFeature} size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Feature
                </Button>
              </div>

              {/* Feature list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {presetForm.features.map((feature, index) => (
                  <Card key={feature.id} className="p-3">
                    {editingFeatureIndex === index ? (
                      // Edit form for this feature
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Name *</Label>
                            <Input
                              value={featureForm.name}
                              onChange={(e) => setFeatureForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Feature name"
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={featureForm.type}
                              onValueChange={(value: 'boolean' | 'text' | 'score') =>
                                setFeatureForm(prev => ({ ...prev, type: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="score">Score</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Description *</Label>
                          <Textarea
                            value={featureForm.description}
                            onChange={(e) => setFeatureForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe what to extract"
                            className="h-20"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveFeature} size="sm">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button onClick={cancelFeatureEdit} variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Display view
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{feature.name}</span>
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              {feature.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditFeature(index)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFeature(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}

                {/* Add new feature form */}
                {editingFeatureIndex === -1 && (
                  <Card className="p-3 border-dashed">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Name *</Label>
                          <Input
                            value={featureForm.name}
                            onChange={(e) => setFeatureForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Feature name"
                          />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={featureForm.type}
                            onValueChange={(value: 'boolean' | 'text' | 'score') =>
                              setFeatureForm(prev => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="score">Score</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Description *</Label>
                        <Textarea
                          value={featureForm.description}
                          onChange={(e) => setFeatureForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe what to extract"
                          className="h-20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveFeature} size="sm">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button onClick={cancelFeatureEdit} variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePreset}
                disabled={!presetForm.name.trim() || presetForm.features.length === 0}
              >
                {editMode === 'create' ? 'Create Preset' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}