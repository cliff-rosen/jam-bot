import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import {
  ExternalLink, Calendar, Users, BookOpen, MessageCircle, X,
  FileText, Zap, FolderOpen, Settings, Star, Tag, Plus,
  Save, Edit3, Trash2, Clock, Brain, Award
} from 'lucide-react';
import { CanonicalResearchArticle } from '@/types/canonical_types';
import { ChatPanel } from './chat/ChatPanel';
import { workbenchApi } from '@/lib/api/workbenchApi';
import { WorkbenchData, AnalysisPreset } from '@/types/workbench';

interface ArticleWorkbenchModalProps {
  article: CanonicalResearchArticle;
  currentGroup?: { id: string; name: string } | null;
  onClose: () => void;
  onSendChatMessage?: (
    message: string,
    article: CanonicalResearchArticle,
    conversationHistory: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => Promise<void>;
  onFeatureAdded?: (feature: any) => void;
  onArticleUpdated?: (article: CanonicalResearchArticle) => void;
}


export function ArticleWorkbenchModal({
  article,
  currentGroup,
  onClose,
  onSendChatMessage,
  onFeatureAdded,
  onArticleUpdated
}: ArticleWorkbenchModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [workbenchData, setWorkbenchData] = useState<WorkbenchData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form states
  const [noteText, setNoteText] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<'boolean' | 'text' | 'score'>('boolean');
  const [newColumnDescription, setNewColumnDescription] = useState('');
  const [minValue, setMinValue] = useState(1);
  const [maxValue, setMaxValue] = useState(10);
  const [stepValue, setStepValue] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [columnsTab, setColumnsTab] = useState<'single' | 'preset'>('single');
  const [presets, setPresets] = useState<Record<string, AnalysisPreset>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [presetsLoading, setPresetsLoading] = useState(false);

  // Load workbench data when modal opens
  useEffect(() => {
    if (currentGroup?.id) {
      loadWorkbenchData();
    }
  }, [article.id, currentGroup?.id]);

  // Load presets for columns tab
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await workbenchApi.getColumnPresets();
      // Handle the API response structure
      if (response && response.presets && Array.isArray(response.presets)) {
        // Convert array of presets to Record<string, AnalysisPreset>
        const presetsMap: Record<string, AnalysisPreset> = {};
        response.presets.forEach((preset: AnalysisPreset) => {
          presetsMap[preset.id] = preset;
        });
        setPresets(presetsMap);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const loadWorkbenchData = async () => {
    if (!currentGroup?.id) return;

    setIsLoading(true);
    try {
      const data = await workbenchApi.getArticleWorkbenchData(currentGroup.id, article.id);
      setWorkbenchData(data);

      // Populate form states
      setNoteText(data.notes || '');
      setTags(data.metadata?.tags || []);
      setRating(data.metadata?.rating);
      setPriority(data.metadata?.priority || '');
      setStatus(data.metadata?.status || '');
    } catch (error) {
      console.error('Error loading workbench data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workbench data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!currentGroup?.id) return;

    try {
      await workbenchApi.updateNotes(currentGroup.id, article.id, noteText);
      await loadWorkbenchData(); // Refresh data
      toast({
        title: 'Notes Saved',
        description: 'Your research notes have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  const applyPreset = async () => {
    if (!currentGroup?.id || !selectedPreset || !presets[selectedPreset]) return;

    setPresetsLoading(true);
    try {
      const preset = presets[selectedPreset];
      const promises = Object.entries(preset.features).map(([columnName, columnConfig]) =>
        workbenchApi.extractFeature(
          currentGroup.id,
          article.id,
          columnName,
          columnConfig.type,
          columnConfig.description
        )
      );

      await Promise.all(promises);
      await loadWorkbenchData(); // Refresh data

      toast({
        title: 'Preset Applied',
        description: `${Object.keys(preset.features).length} features have been extracted.`,
      });

      setSelectedPreset('');
      setColumnsTab('single');
    } catch (error) {
      console.error('Error applying preset:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply preset columns',
        variant: 'destructive',
      });
    } finally {
      setPresetsLoading(false);
    }
  };

  const extractColumn = async () => {
    if (!currentGroup?.id || !newColumnName.trim() || !newColumnDescription.trim()) return;

    try {
      const result = await workbenchApi.extractFeature(
        currentGroup.id,
        article.id,
        newColumnName,
        newColumnType,
        newColumnDescription
      );

      await loadWorkbenchData(); // Refresh data

      // Reset form
      setNewColumnName('');
      setNewColumnDescription('');

      // Notify parent component
      if (onFeatureAdded) {
        onFeatureAdded({
          name: newColumnName,
          value: result.feature_data.value,
          type: newColumnType
        });
      }

      toast({
        title: 'Column Added',
        description: `"${newColumnName}" has been extracted and added to the table.`,
      });
    } catch (error) {
      console.error('Error extracting column:', error);
      toast({
        title: 'Error',
        description: 'Failed to extract column',
        variant: 'destructive',
      });
    }
  };

  const saveMetadata = async () => {
    if (!currentGroup?.id) return;

    try {
      await workbenchApi.updateMetadata(currentGroup.id, article.id, {
        tags,
        rating,
        priority,
        status
      });
      await loadWorkbenchData(); // Refresh data
      toast({
        title: 'Metadata Saved',
        description: 'Article metadata has been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to save metadata',
        variant: 'destructive',
      });
    }
  };

  const deleteFeature = async (featureName: string) => {
    if (!currentGroup?.id) return;

    try {
      await workbenchApi.deleteFeature(currentGroup.id, article.id, featureName);
      await loadWorkbenchData(); // Refresh data
      toast({
        title: 'Feature Deleted',
        description: `Feature "${featureName}" has been removed.`,
      });
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete feature',
        variant: 'destructive',
      });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getArticleUrl = (article: CanonicalResearchArticle) => {
    if (article.source === 'pubmed' && article.id.includes('pubmed_')) {
      const pmid = article.id.replace('pubmed_', '');
      return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    }
    return article.url || null;
  };

  const getSourceBadge = (source: string) => {
    const config = source === 'pubmed'
      ? { label: 'PubMed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
      : { label: 'Google Scholar', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '-') return '-';
    if (/^\d{4}$/.test(dateStr)) return dateStr;
    return dateStr;
  };

  const getArticleDate = (dateType: string) => {
    if (article.source !== 'pubmed') {
      return article.publication_year?.toString() || '-';
    }

    switch (dateType) {
      case 'completion':
        return article.date_completed || article.source_metadata?.comp_date || '-';
      case 'entry':
        return article.date_entered || article.source_metadata?.entry_date || '-';
      case 'revised':
        return article.date_revised || article.source_metadata?.date_revised || '-';
      case 'publication':
      default:
        return article.date_published || article.source_metadata?.pub_date || article.publication_date || article.publication_year?.toString() || '-';
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-0">
        <DialogTitle className="sr-only">
          Research Workbench: {article.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Article research workbench with chat, notes, feature extraction, and organization tools
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold truncate">Research Workbench</h2>
            {getSourceBadge(article.source)}
            {currentGroup && (
              <Badge variant="outline" className="text-xs">
                {currentGroup.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getArticleUrl(article) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getArticleUrl(article)!, '_blank')}
                className="gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                View Original
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex h-[calc(95vh-80px)]">
          {/* Left Side - Chat Panel */}
          <div className="w-96 border-r dark:border-gray-700">
            <ChatPanel
              article={article}
              onSendMessage={onSendChatMessage}
            />
          </div>

          {/* Right Side - Workbench Tabs */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5 m-4 mb-0">
                <TabsTrigger value="overview" className="gap-1">
                  <FileText className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1">
                  <Edit3 className="w-4 h-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="features" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Columns
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-1">
                  <FolderOpen className="w-4 h-4" />
                  Groups
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-1">
                  <Settings className="w-4 h-4" />
                  Tools
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Title */}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {article.title}
                    </h1>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Authors</span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {article.authors.length > 0 ? article.authors.join(', ') : 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Journal</span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {article.journal || 'Not specified'}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Publication</span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(getArticleDate('publication'))}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Citations</span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {article.citation_count || 'Not available'}
                      </div>
                    </div>
                  </div>

                  {/* PubMed Date Details */}
                  {article.source === 'pubmed' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Publication Date</div>
                        <div className="text-sm">{formatDate(getArticleDate('publication'))}</div>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Entry Date</div>
                        <div className="text-sm">{formatDate(getArticleDate('entry'))}</div>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Completion Date</div>
                        <div className="text-sm">{formatDate(getArticleDate('completion'))}</div>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Revised Date</div>
                        <div className="text-sm">{formatDate(getArticleDate('revised'))}</div>
                      </div>
                    </div>
                  )}

                  {/* Abstract */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Abstract</h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {article.abstract ? (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                          {article.abstract}
                        </p>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 italic">
                          No abstract available for this article.
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-0 space-y-4">
                  {!currentGroup ? (
                    <div className="text-center py-8">
                      <Edit3 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Group Selected</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Notes are tied to groups. Please save this article to a group first.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Research Notes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Add your thoughts, insights, and analysis for this article in the <strong>{currentGroup.name}</strong> group.
                        </p>
                      </div>

                      {/* Existing Notes */}
                      {workbenchData?.notes && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Saved Notes</span>
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">
                              Last updated: {workbenchData.last_modified ? new Date(workbenchData.last_modified).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          <div className="text-sm text-yellow-900 dark:text-yellow-100 whitespace-pre-wrap">
                            {workbenchData.notes}
                          </div>
                        </div>
                      )}

                      {/* Note Editor */}
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Enter your research notes here..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="min-h-[200px] resize-none"
                        />
                        <Button
                          onClick={saveNotes}
                          disabled={!noteText.trim()}
                          className="gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save Notes
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="features" className="mt-0 space-y-4">
                  {!currentGroup ? (
                    <div className="text-center py-8">
                      <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Group Selected</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Columns are tied to groups. Please save this article to a group first.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Columns</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Extract specific data points from this article that will become columns in your table.
                        </p>
                      </div>

                      {/* Existing Columns */}
                      {workbenchData?.extracted_features && Object.keys(workbenchData.extracted_features).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Extracted Columns</h4>
                          {Object.entries(workbenchData.extracted_features).map(([columnName, columnData]) => (
                            <div key={columnName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div>
                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{columnName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{columnData.value || columnData}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {columnData.extraction_method || 'AI'} • {columnData.confidence ? `${(columnData.confidence * 100).toFixed(0)}% confidence` : 'Extracted'}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFeature(columnName)}
                                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Column Tabs */}
                      <Tabs value={columnsTab} onValueChange={(v) => setColumnsTab(v as 'single' | 'preset')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="single">Single Column</TabsTrigger>
                          <TabsTrigger value="preset">Preset Columns</TabsTrigger>
                        </TabsList>

                        <TabsContent value="single" className="space-y-4">
                          <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                            {/* Column Name */}
                            <div className="space-y-2">
                              <Label htmlFor="column-name" className="text-gray-900 dark:text-gray-100">Column Name</Label>
                              <Input
                                id="column-name"
                                placeholder="e.g., Has Side Effects"
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                              />
                            </div>

                            {/* Column Type */}
                            <div className="space-y-2">
                              <Label className="text-gray-900 dark:text-gray-100">Column Type</Label>
                              <RadioGroup value={newColumnType} onValueChange={(value) => setNewColumnType(value as 'boolean' | 'text' | 'score')}>
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
                            {newColumnType === 'score' && (
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
                                {newColumnType === 'boolean' ? 'Question' : newColumnType === 'score' ? 'Scoring Criteria' : 'What to Extract'}
                              </Label>
                              <Textarea
                                id="description"
                                value={newColumnDescription}
                                onChange={(e) => setNewColumnDescription(e.target.value)}
                                placeholder={
                                  newColumnType === 'boolean'
                                    ? "e.g., Does this study report any adverse events or side effects?"
                                    : newColumnType === 'score'
                                      ? "e.g., Rate the quality of this study's methodology from 1-10"
                                      : "e.g., What is the main finding of this study?"
                                }
                                rows={3}
                                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                              />
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {newColumnType === 'boolean'
                                  ? "The AI will answer with 'yes' or 'no' for each article."
                                  : newColumnType === 'score'
                                    ? `The AI will assign a numeric score within your specified range (${minValue}-${maxValue}).`
                                    : "The AI will extract a brief text summary (max 100 characters)."}
                              </p>
                            </div>

                            <Button
                              onClick={extractColumn}
                              disabled={!newColumnName.trim() || !newColumnDescription.trim()}
                              className="w-full gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Column
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="preset" className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-gray-900 dark:text-gray-100">Select Preset</Label>
                            <div className="space-y-3">
                              {Object.entries(presets).length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                  <p>No presets available yet.</p>
                                  <p className="text-sm mt-2">Check back later for preconfigured column sets.</p>
                                </div>
                              ) : (
                                Object.entries(presets).map(([key, preset]) => (
                                  <div key={key} className="border rounded-lg p-3 dark:border-gray-600">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id={`preset-${key}`}
                                        name="preset"
                                        value={key}
                                        checked={selectedPreset === key}
                                        onChange={(e) => setSelectedPreset(e.target.value)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <Label htmlFor={`preset-${key}`} className="font-medium cursor-pointer text-gray-900 dark:text-gray-100">
                                        {preset.name}
                                      </Label>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-6">
                                      {preset.description}
                                    </p>
                                    {preset.features && (
                                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 ml-6">
                                        {Object.keys(preset.features).length} features: {Object.keys(preset.features).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {Object.entries(presets).length > 0 && (
                            <Button
                              onClick={applyPreset}
                              disabled={!selectedPreset || presetsLoading}
                              className="w-full gap-2"
                            >
                              {presetsLoading ? (
                                <>
                                  <span className="animate-spin">⌛</span>
                                  Adding Columns...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  Add Preset Columns
                                </>
                              )}
                            </Button>
                          )}
                        </TabsContent>
                      </Tabs>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="groups" className="mt-0 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Group Management</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Manage which groups this article belongs to and view group-specific data.
                    </p>
                  </div>

                  {currentGroup && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-900 dark:text-blue-100">Current Group</span>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        {currentGroup.name}
                      </div>
                    </div>
                  )}

                  {/* Article Metadata */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Article Metadata</h4>

                    {/* Tags */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            <Tag className="w-3 h-3" />
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        />
                        <Button onClick={addTag} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Rating, Priority, Status */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Rating</label>
                        <Select value={rating?.toString()} onValueChange={(v) => setRating(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Rate..." />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(n => (
                              <SelectItem key={n} value={n.toString()}>
                                {'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Priority</label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger>
                            <SelectValue placeholder="Priority..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Status</label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Status..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unread">Unread</SelectItem>
                            <SelectItem value="reading">Reading</SelectItem>
                            <SelectItem value="read">Read</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={saveMetadata} className="gap-2">
                      <Save className="w-4 h-4" />
                      Save Metadata
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="tools" className="mt-0 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Research Tools</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Additional tools and utilities for analyzing this article.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">Generate Citation</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 text-left">
                        Create APA, MLA, or Chicago style citations
                      </span>
                    </Button>

                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span className="font-medium">Reading Time</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 text-left">
                        Estimate reading time based on word count
                      </span>
                    </Button>

                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        <span className="font-medium">Similar Articles</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 text-left">
                        Find related research articles
                      </span>
                    </Button>

                    <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        <span className="font-medium">Export Data</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 text-left">
                        Export article data in various formats
                      </span>
                    </Button>
                  </div>

                  {/* Article ID for reference */}
                  <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Article ID</div>
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {article.id}
                    </code>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}