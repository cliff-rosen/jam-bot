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
  Save, Edit3, Trash2, Clock, Brain, Award, ChevronDown, ChevronRight, Hash
} from 'lucide-react';
import { CanonicalResearchArticle } from '@/types/canonical_types';
import { ChatPanel } from './chat/ChatPanel';
import { workbenchApi } from '@/lib/api/workbenchApi';
import { ArticleCollection } from '@/types/articleCollection';
import { FeatureDefinition, AnalysisPreset, WorkbenchData, ArticleGroupDetail } from '@/types/workbench';

interface ArticleWorkbenchModalProps {
  articleDetail: ArticleGroupDetail;
  collection: ArticleCollection | null;
  onClose: () => void;
  onSendChatMessage?: (
    message: string,
    article: CanonicalResearchArticle,
    conversationHistory: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => Promise<void>;
  onFeatureAdded?: (features: FeatureDefinition[], extractImmediately?: boolean) => void;
}


export function ArticleWorkbenchModal({
  articleDetail,
  collection,
  onClose,
  onSendChatMessage,
  onFeatureAdded
}: ArticleWorkbenchModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Extract the article from articleDetail for convenience
  const article = articleDetail.article;
  const featureDefinitions = collection?.feature_definitions || [];
  const featureData = articleDetail?.feature_data || {};

  // Add missing state variables
  const [isLoading, setIsLoading] = useState(false);
  const [workbenchData, setWorkbenchData] = useState<WorkbenchData | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

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
    if (collection?.id && collection?.saved_group_id) {
      loadWorkbenchData();
    }
  }, [article.id, collection?.id]);

  // Load presets for columns tab
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await workbenchApi.getFeaturePresets();
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
    if (!collection?.saved_group_id) return;

    setIsLoading(true);
    try {
      const data = await workbenchApi.getArticleWorkbenchData(collection.saved_group_id, article.id);
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
    if (!collection?.saved_group_id) return;

    try {
      await workbenchApi.updateNotes(collection.saved_group_id, article.id, noteText);
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
    if (!collection?.saved_group_id || !selectedPreset || !presets[selectedPreset]) return;

    setPresetsLoading(true);
    try {
      const preset = presets[selectedPreset];
      const promises = Object.entries(preset.features).map(([columnName, columnConfig]) =>
        workbenchApi.extractFeature(
          collection.saved_group_id!,
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
    if (!collection?.saved_group_id || !newColumnName.trim() || !newColumnDescription.trim()) return;

    try {
      const result = await workbenchApi.extractFeature(
        collection.saved_group_id,
        article.id,
        newColumnName,
        newColumnType,
        newColumnDescription
      );

      await loadWorkbenchData(); // Refresh data

      // Reset form
      setNewColumnName('');
      setNewColumnDescription('');

      // Notify parent component with proper structure
      if (onFeatureAdded) {
        const newFeature: FeatureDefinition = {
          id: newColumnName.toLowerCase().replace(/\s+/g, '_'),
          name: newColumnName,
          description: newColumnDescription,
          type: newColumnType,
          options: newColumnType === 'score' ? { min: minValue, max: maxValue, step: stepValue } : undefined
        };
        onFeatureAdded([newFeature], true);
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
    if (!collection?.saved_group_id) return;

    try {
      await workbenchApi.updateMetadata(collection.saved_group_id, article.id, {
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
    if (!collection?.saved_group_id) return;

    try {
      await workbenchApi.deleteFeature(collection.saved_group_id, article.id, featureName);
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

  const toggleFeatureExpansion = (featureId: string) => {
    setExpandedFeatures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(featureId)) {
        newSet.delete(featureId);
      } else {
        newSet.add(featureId);
      }
      return newSet;
    });
  };

  const getPubMedId = () => {
    if (article.source === 'pubmed' && article.id.includes('pubmed_')) {
      return article.id.replace('pubmed_', '');
    }
    return null;
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
            {collection && (
              <Badge variant="outline" className="text-xs">
                {collection.name}
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
              <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
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
                  Add Features
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Title */}
                  <div className="space-y-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {article.title}
                    </h1>

                    {/* Article Identifiers */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {getSourceBadge(article.source)}
                      {getPubMedId() && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                          <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            PMID: {getPubMedId()}
                          </span>
                        </div>
                      )}
                      {article.doi && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
                          <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            DOI: {article.doi}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Article Metadata - Improved Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Column - Basic Info */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Publication Details</h3>

                        {/* Authors */}
                        <div className="flex items-start gap-3 mb-3">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Authors</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {article.authors.length > 0 ? (
                                <>
                                  <span className="font-medium">{article.authors[0]}</span>
                                  {article.authors.length > 1 && (
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {article.authors.length === 2
                                        ? ` and ${article.authors[1]}`
                                        : ` et al. (${article.authors.length} authors)`
                                      }
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400 italic">Not specified</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Journal */}
                        <div className="flex items-start gap-3 mb-3">
                          <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Journal</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {article.journal || <span className="text-gray-500 dark:text-gray-400 italic font-normal">Not specified</span>}
                            </div>
                          </div>
                        </div>

                        {/* Publication Date & Citations */}
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Published</div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {formatDate(getArticleDate('publication'))}
                              {article.citation_count && (
                                <span className="ml-3 text-gray-600 dark:text-gray-400">
                                  • {article.citation_count} citations
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PubMed Dates (if applicable) */}
                      {article.source === 'pubmed' && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">PubMed Timeline</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Entry Date</div>
                              <div className="font-medium">{formatDate(getArticleDate('entry'))}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Completion</div>
                              <div className="font-medium">{formatDate(getArticleDate('completion'))}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Revised</div>
                              <div className="font-medium">{formatDate(getArticleDate('revised'))}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Publication</div>
                              <div className="font-medium">{formatDate(getArticleDate('publication'))}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Extracted Features */}
                    <div className="space-y-4">
                      {featureDefinitions.length > 0 ? (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Extracted Features</h3>
                          <div className="space-y-1 max-h-96 overflow-y-auto">
                            {featureDefinitions.map((feature) => {
                              const value = featureData[feature.id];
                              const hasValue = value !== undefined && value !== null && value !== '';
                              const isExpanded = expandedFeatures.has(feature.id);

                              return (
                                <div key={feature.id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                                  <div
                                    className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                    onClick={() => toggleFeatureExpansion(feature.id)}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <button className="p-0.5">
                                        {isExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-gray-500" />
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {feature.name}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={`text-xs flex-shrink-0 ${feature.type === 'boolean' ? 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300' :
                                              feature.type === 'score' ? 'border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300' :
                                                'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                                              }`}
                                          >
                                            {feature.type}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium ml-3 flex-shrink-0">
                                      {hasValue ? (
                                        <span className={`
                                          ${feature.type === 'boolean' && value === 'yes' ? 'text-green-600 dark:text-green-400' : ''}
                                          ${feature.type === 'boolean' && value === 'no' ? 'text-red-600 dark:text-red-400' : ''}
                                          ${feature.type === 'score' ? 'text-purple-600 dark:text-purple-400' : ''}
                                          ${feature.type === 'text' ? 'text-gray-900 dark:text-gray-100' : ''}
                                        `}>
                                          {feature.type === 'boolean' ? (
                                            value === 'yes' ? '✓ Yes' : '✗ No'
                                          ) : feature.type === 'score' ? (
                                            `${value}${feature.options?.max ? `/${feature.options.max}` : ''}`
                                          ) : (
                                            String(value).length > 30 ? `${String(value).substring(0, 30)}...` : String(value)
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 dark:text-gray-500 italic">Not extracted</span>
                                      )}
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="px-3 pb-3 pt-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                        <span className="font-medium">Description:</span> {feature.description}
                                      </div>
                                      {feature.type === 'text' && hasValue && String(value).length > 30 && (
                                        <div className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                                          <span className="font-medium">Full value:</span> {String(value)}
                                        </div>
                                      )}
                                      {feature.type === 'score' && feature.options && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                          <span className="font-medium">Range:</span> {feature.options.min}-{feature.options.max}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
                          <Zap className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No features extracted yet. Use the "Add Features" tab to extract data points from this article.
                          </p>
                        </div>
                      )}

                      {/* Workbench Metadata (if available) */}
                      {workbenchData && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Research Metadata</h3>
                          <div className="space-y-2 text-sm">
                            {workbenchData.metadata?.tags.length > 0 && (
                              <div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">Tags:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {workbenchData.metadata.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {workbenchData.metadata?.rating && (
                              <div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">Rating:</span>
                                <span className="ml-2">{'★'.repeat(workbenchData.metadata.rating)}{'☆'.repeat(5 - workbenchData.metadata.rating)}</span>
                              </div>
                            )}
                            {workbenchData.metadata?.status && (
                              <div>
                                <span className="text-xs text-gray-600 dark:text-gray-400">Status:</span>
                                <Badge variant="outline" className="ml-2 text-xs">{workbenchData.metadata.status}</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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
                  {!collection ? (
                    <div className="text-center py-8">
                      <Edit3 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Collection Loaded</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Load a collection to add notes to articles.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Research Notes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Add your thoughts, insights, and analysis for this article in the <strong>{collection.name}</strong> collection.
                        </p>
                      </div>

                      {/* Note Editor */}
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Enter your research notes here..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="min-h-[200px] resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                        <Button
                          onClick={saveNotes}
                          disabled={!noteText.trim() || !collection.saved_group_id}
                          className="gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save Notes
                        </Button>
                      </div>

                      {/* Article Metadata */}
                      <div className="space-y-4 pt-6 border-t dark:border-gray-700">
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
                              className="bg-white dark:bg-gray-700"
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
                              <SelectTrigger className="bg-white dark:bg-gray-700">
                                <SelectValue placeholder="Rate..." />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map(n => (
                                  <SelectItem key={n} value={n.toString()}>
                                    {'★'.repeat(n)}{'☆'.repeat(5 - n)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Priority</label>
                            <Select value={priority} onValueChange={setPriority}>
                              <SelectTrigger className="bg-white dark:bg-gray-700">
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
                              <SelectTrigger className="bg-white dark:bg-gray-700">
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

                        <Button
                          onClick={saveMetadata}
                          className="gap-2"
                          disabled={!collection.saved_group_id}
                        >
                          <Save className="w-4 h-4" />
                          Save Metadata
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="features" className="mt-0 space-y-4">
                  {!collection || !collection.saved_group_id ? (
                    <div className="text-center py-8">
                      <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Saved Group</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Features can only be added to saved article groups. Save this collection first.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Features</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Extract specific data points from this article that will become columns in your table.
                        </p>
                      </div>

                      {/* Existing Features */}
                      {workbenchData?.extracted_features && Object.keys(workbenchData.extracted_features).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Extracted Features</h4>
                          {Object.entries(workbenchData.extracted_features).map(([featureName, featureData]) => (
                            <div key={featureName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div>
                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{featureName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {typeof featureData === 'object' && featureData !== null && 'value' in featureData
                                    ? featureData.value
                                    : featureData}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {typeof featureData === 'object' && featureData !== null && 'extraction_method' in featureData
                                    ? `${featureData.extraction_method} • ${featureData.confidence ? `${(featureData.confidence * 100).toFixed(0)}% confidence` : 'Extracted'}`
                                    : 'AI • Extracted'}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFeature(featureName)}
                                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Feature Tabs */}
                      <Tabs value={columnsTab} onValueChange={(v) => setColumnsTab(v as 'single' | 'preset')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="single">Single Feature</TabsTrigger>
                          <TabsTrigger value="preset">Preset Features</TabsTrigger>
                        </TabsList>

                        <TabsContent value="single" className="space-y-4">
                          <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                            {/* Feature Name */}
                            <div className="space-y-2">
                              <Label htmlFor="feature-name" className="text-gray-900 dark:text-gray-100">Feature Name</Label>
                              <Input
                                id="feature-name"
                                placeholder="e.g., Has Side Effects"
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                              />
                            </div>

                            {/* Feature Type */}
                            <div className="space-y-2">
                              <Label className="text-gray-900 dark:text-gray-100">Feature Type</Label>
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
                              Add Feature
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
                                  <p className="text-sm mt-2">Check back later for preconfigured feature sets.</p>
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
                                        {preset.features.length} features
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
                                  Adding Features...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  Add Preset Features
                                </>
                              )}
                            </Button>
                          )}
                        </TabsContent>
                      </Tabs>
                    </>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}