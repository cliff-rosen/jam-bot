import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { workbenchApi, FeaturePreset } from '@/lib/api/workbenchApi';
import { Plus, Settings, Trash2, Loader2 } from 'lucide-react';
import { FeatureDefinition } from '@/types/workbench';
import { generatePrefixedUUID } from '@/lib/utils/uuid';

interface AddFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (features: FeatureDefinition[], extractImmediately?: boolean) => void;
  existingFeatures?: FeatureDefinition[]; // For extract mode
  mode?: 'add' | 'extract'; // Mode: add new features or extract existing ones
}

type FeatureTemplate = {
  id: string;
  name: string;
  description: string;
  type: 'preset' | 'custom';
  features?: FeatureDefinition[];
};

export function AddFeatureModal({ open, onOpenChange, onAdd, existingFeatures = [], mode = 'add' }: AddFeatureModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customFeatures, setCustomFeatures] = useState<FeatureDefinition[]>([]);
  const [presets, setPresets] = useState<FeaturePreset[]>([]);
  const [extractImmediately, setExtractImmediately] = useState(true);
  const [selectedExistingFeatures, setSelectedExistingFeatures] = useState<string[]>([]);

  // Create template list combining presets and custom option
  const templates: FeatureTemplate[] = [
    {
      id: 'custom',
      name: 'Custom Features',
      description: 'Create your own custom features',
      type: 'custom'
    },
    ...presets.map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      type: 'preset' as const,
      features: preset.features
    }))
  ];

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const response = await workbenchApi.getFeaturePresets();
        setPresets(response.presets || []);
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    };
    if (open) {
      loadPresets();
      
      if (mode === 'extract') {
        // Extract mode: Initialize with existing features selected
        setSelectedExistingFeatures(existingFeatures.map(f => f.id));
        setExtractImmediately(true); // Force extraction mode
      } else {
        // Add mode: Reset state when modal opens
        setSelectedTemplate('custom');
        setCustomFeatures([{
          id: generatePrefixedUUID('feat'),
          name: '',
          description: '',
          type: 'boolean'
        }]);
        setSelectedExistingFeatures([]);
      }
    }
  }, [open, mode, existingFeatures]);

  const addCustomFeature = () => {
    setCustomFeatures([...customFeatures, {
      id: generatePrefixedUUID('feat'),
      name: '',
      description: '',
      type: 'boolean'
    }]);
  };

  const removeCustomFeature = (index: number) => {
    if (customFeatures.length > 1) {
      setCustomFeatures(customFeatures.filter((_, i) => i !== index));
    }
  };

  const updateCustomFeature = (index: number, field: keyof FeatureDefinition, value: any) => {
    setCustomFeatures(prev => prev.map((feature, i) =>
      i === index ? { ...feature, [field]: value } : feature
    ));
  };

  const updateCustomFeatureOptions = (index: number, options: any) => {
    setCustomFeatures(prev => prev.map((feature, i) =>
      i === index ? { ...feature, options } : feature
    ));
  };

  const handleSubmit = () => {
    let featuresToAdd: FeatureDefinition[] = [];

    if (mode === 'extract') {
      // Extract mode: return selected existing features
      featuresToAdd = existingFeatures.filter(f => selectedExistingFeatures.includes(f.id));
      console.log('Extract mode - selected features:', featuresToAdd);
    } else {
      // Add mode: return new features from template/custom
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
      if (!selectedTemplateData) return;

      console.log('AddFeatureModal handleSubmit:', {
        selectedTemplate,
        selectedTemplateData,
        customFeatures
      });

      if (selectedTemplateData.type === 'custom') {
        const validFeatures = customFeatures.filter(feature =>
          feature.name.trim() && feature.description.trim()
        );
        featuresToAdd = validFeatures;
        console.log('Using custom features:', validFeatures);
      } else {
        featuresToAdd = selectedTemplateData.features || [];
        console.log('Using preset features:', featuresToAdd);
      }
    }

    if (featuresToAdd.length > 0) {
      console.log('Features being sent to parent:', featuresToAdd);
      // Configuration is done - pass to parent and close modal
      // In extract mode, we always extract (true). In add mode, respect the checkbox.
      const shouldExtract = mode === 'extract' ? true : extractImmediately;
      onAdd(featuresToAdd, shouldExtract);
      onOpenChange(false);
    }
  };

  const canSubmit = () => {
    if (mode === 'extract') {
      return selectedExistingFeatures.length > 0;
    }

    const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
    if (!selectedTemplateData) return false;

    if (selectedTemplateData.type === 'custom') {
      return customFeatures.some(feature => feature.name.trim() && feature.description.trim());
    } else {
      return selectedTemplateData.features && selectedTemplateData.features.length > 0;
    }
  };

  // Helper functions for extract mode
  const toggleExistingFeature = (featureId: string) => {
    setSelectedExistingFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const selectAllExisting = () => {
    setSelectedExistingFeatures(existingFeatures.map(f => f.id));
  };

  const selectNoneExisting = () => {
    setSelectedExistingFeatures([]);
  };

  const renderFeatureDetails = (feature: FeatureDefinition, index: number) => (
    <Card key={index} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground">Feature {index + 1}</CardTitle>
          {customFeatures.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCustomFeature(index)}
              className="text-red-600 hover:text-red-700 p-1"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Feature Name</Label>
          <Input
            value={feature.name}
            onChange={(e) => updateCustomFeature(index, 'name', e.target.value)}
            placeholder="e.g., Sample Size, Has Side Effects"
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Data Type</Label>
          <RadioGroup
            value={feature.type}
            onValueChange={(value) => updateCustomFeature(index, 'type', value as 'boolean' | 'text' | 'score')}
            className="grid grid-cols-1 gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="boolean" id={`boolean-${index}`} />
              <Label htmlFor={`boolean-${index}`} className="text-sm font-normal cursor-pointer text-foreground">
                Yes/No Question
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id={`text-${index}`} />
              <Label htmlFor={`text-${index}`} className="text-sm font-normal cursor-pointer text-foreground">
                Text Extract (short)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="score" id={`score-${index}`} />
              <Label htmlFor={`score-${index}`} className="text-sm font-normal cursor-pointer text-foreground">
                Numeric Score
              </Label>
            </div>
          </RadioGroup>
        </div>

        {feature.type === 'score' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Score Range</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Min</Label>
                <Input
                  type="number"
                  value={feature.options?.min || 1}
                  onChange={(e) => updateCustomFeatureOptions(index, {
                    ...feature.options,
                    min: Number(e.target.value)
                  })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400">Max</Label>
                <Input
                  type="number"
                  value={feature.options?.max || 10}
                  onChange={(e) => updateCustomFeatureOptions(index, {
                    ...feature.options,
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
                  value={feature.options?.step || 1}
                  onChange={(e) => updateCustomFeatureOptions(index, {
                    ...feature.options,
                    step: Number(e.target.value)
                  })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {feature.type === 'boolean' ? 'Question to Ask' :
              feature.type === 'score' ? 'Scoring Instructions' :
                'What to Extract'}
          </Label>
          <Textarea
            value={feature.description}
            onChange={(e) => updateCustomFeature(index, 'description', e.target.value)}
            placeholder={
              feature.type === 'boolean'
                ? "e.g., Does this study report any adverse events or side effects?"
                : feature.type === 'score'
                  ? "e.g., Rate the study quality from 1-10 based on methodology"
                  : "e.g., What is the primary outcome measure?"
            }
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderRightPanel = () => {
    const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
    if (!selectedTemplateData) return null;

    if (selectedTemplateData.type === 'custom') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Custom Features</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomFeature}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Feature
            </Button>
          </div>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {customFeatures.map((feature, index) => renderFeatureDetails(feature, index))}
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">{selectedTemplateData.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {selectedTemplateData.description}
          </p>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {selectedTemplateData.features?.map((feature, index) => (
              <Card key={index} className="mb-4">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{feature.name}</h4>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                        {feature.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[85vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'extract' ? 'Extract Features' : 'Add Features to Extract Data'}
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {mode === 'extract' 
              ? 'Select which features to extract for the selected articles.'
              : 'Choose from presets or create custom features to extract data from your articles.'
            }
          </p>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {mode === 'extract' ? (
            /* Extract Mode - Feature Selection */
            <div className="flex-1 p-6 overflow-y-auto">
              {existingFeatures.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No features are defined in this collection.
                </div>
              ) : (
                <>
                  {/* Selection controls */}
                  <div className="flex gap-2 mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllExisting}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectNoneExisting}
                    >
                      Select None
                    </Button>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-3">
                    {existingFeatures.map(feature => (
                      <div
                        key={feature.id}
                        className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <Checkbox
                          id={feature.id}
                          checked={selectedExistingFeatures.includes(feature.id)}
                          onCheckedChange={() => toggleExistingFeature(feature.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={feature.id}
                            className="block font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                          >
                            {feature.name}
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {feature.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              {feature.type === 'boolean' ? 'Yes/No' :
                               feature.type === 'score' ? 
                                 `Score ${feature.options?.min || 1}-${feature.options?.max || 10}` :
                                 'Text'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Add Mode - Template Selection and Configuration */
            <>
              {/* Left Panel - Template List */}
              <div className="w-80 border-r bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Available Options</h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start gap-2">
                    {template.type === 'custom' ? (
                      <Settings className="w-4 h-4 mt-0.5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Plus className="w-4 h-4 mt-0.5 text-gray-500 dark:text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      {template.type === 'preset' && template.features && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {template.features.length} features
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderRightPanel()}
          </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            {mode === 'extract' ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedExistingFeatures.length} of {existingFeatures.length} features selected
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="extract-immediately"
                  checked={extractImmediately}
                  onCheckedChange={(checked) => setExtractImmediately(!!checked)}
                />
                <Label htmlFor="extract-immediately" className="text-sm font-medium cursor-pointer text-foreground">
                  Extract features immediately after adding
                </Label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Recommended)
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit()}
                className="min-w-[140px]"
              >
                {mode === 'extract' ? 'Extract Features' : (extractImmediately ? 'Extract Features' : 'Add Features')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}