import { useState, useEffect } from 'react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, ExternalLink, Filter, FileSearch, Database, Copy, ChevronDown, ChevronRight, Grid, List, Eye, FileText, FileSpreadsheet, BookOpen, Plus, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import type { FilteredArticle } from '@/types/smart-search';
import type { FeatureDefinition } from '@/types/workbench';
import { generatePrefixedUUID } from '@/lib/utils/uuid';
import { smartSearchApi } from '@/lib/api/smartSearchApi';

interface ResultsStepProps {
  filteredArticles: FilteredArticle[];
  originalQuery?: string;
  evidenceSpecification?: string;
  searchQuery?: string;
  totalAvailable?: number;
  totalFiltered?: number;
  sessionId?: string;
}

export function ResultsStep({
  filteredArticles,
  originalQuery,
  evidenceSpecification,
  searchQuery,
  totalAvailable,
  totalFiltered,
  sessionId
}: ResultsStepProps) {
  const { toast } = useToast();
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [isRejectedOpen, setIsRejectedOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'table' | 'card-compressed' | 'card-full'>('card-compressed');
  
  // Local copy of filtered articles that we can modify when features are extracted
  const [localFilteredArticles, setLocalFilteredArticles] = useState<FilteredArticle[]>(filteredArticles);
  
  // Sync local state when props change
  useEffect(() => {
    setLocalFilteredArticles(filteredArticles);
  }, [filteredArticles]);

  // Column/Feature management for table view
  const [showColumns, setShowColumns] = useState(false);
  const [appliedFeatures, setAppliedFeatures] = useState<FeatureDefinition[]>([]);
  const [pendingFeatures, setPendingFeatures] = useState<FeatureDefinition[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number } | null>(null);
  
  const [newFeature, setNewFeature] = useState<FeatureDefinition>({
    id: '',
    name: '',
    description: '',
    type: 'text'
  });

  // Use all articles for display (no client-side filtering)
  const acceptedArticles = localFilteredArticles.filter(fa => fa.passed);
  const rejectedArticles = localFilteredArticles.filter(fa => !fa.passed);

  // Helper function to extract PMID from CanonicalResearchArticle
  const extractPmid = (article: any) => {
    // Check if ID starts with "pmid:"
    if (article.id && article.id.startsWith('pmid:')) {
      return article.id.replace('pmid:', '');
    }
    // For backward compatibility, check if there's a pmid field
    if (article.pmid) {
      return article.pmid;
    }
    return '';
  };


  const exportToCSV = () => {
    const csvContent = [
      ['Title', 'Authors', 'Year', 'Journal', 'Abstract', 'URL', 'DOI', 'PMID', 'Status', 'Confidence', 'Reasoning'].join(','),
      ...localFilteredArticles.map(item => [
        `"${item.article.title.replace(/"/g, '""')}"`,
        `"${item.article.authors.join('; ').replace(/"/g, '""')}"`,
        item.article.publication_year || '',
        `"${(item.article.journal || '').replace(/"/g, '""')}"`,
        `"${(item.article.abstract || '').replace(/"/g, '""')}"`,
        item.article.url || '',
        item.article.doi || '',
        extractPmid(item.article) || '',
        item.passed ? 'Accepted' : 'Rejected',
        Math.round(item.confidence * 100) + '%',
        `"${item.reasoning.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'text/csv', 'csv');
    toast({
      title: 'Exported to CSV',
      description: `Exported ${localFilteredArticles.length} articles to CSV file`
    });
  };

  const exportToBibTeX = () => {
    const bibTexContent = localFilteredArticles
      .filter(item => item.passed) // Only export accepted articles
      .map((item, index) => {
        const cleanTitle = item.article.title.replace(/[{}]/g, '');
        const authors = item.article.authors.join(' and ');
        const year = item.article.publication_year || new Date().getFullYear();
        const journal = item.article.journal || '';
        const doi = item.article.doi || '';
        const url = item.article.url || '';
        const key = `article${index + 1}`;

        let bibEntry = `@article{${key},\n`;
        bibEntry += `  title={${cleanTitle}},\n`;
        bibEntry += `  author={${authors}},\n`;
        bibEntry += `  year={${year}},\n`;
        if (journal) bibEntry += `  journal={${journal}},\n`;
        if (doi) bibEntry += `  doi={${doi}},\n`;
        if (url) bibEntry += `  url={${url}},\n`;
        bibEntry += `  note={Smart Search Confidence: ${Math.round(item.confidence * 100)}%}\n`;
        bibEntry += `}`;
        return bibEntry;
      })
      .join('\n\n');

    downloadFile(bibTexContent, 'text/plain', 'bib');
    toast({
      title: 'Exported to BibTeX',
      description: `Exported ${acceptedArticles.length} accepted articles to BibTeX file`
    });
  };

  const exportToPDF = async () => {
    // Create HTML content for PDF generation
    const htmlContent = `
      <html>
        <head>
          <title>Smart Search Results</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .article { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .accepted { border-left: 4px solid #22c55e; }
            .rejected { border-left: 4px solid #ef4444; opacity: 0.7; }
            .title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .authors { color: #666; margin-bottom: 5px; }
            .details { font-size: 12px; color: #888; }
            .confidence { display: inline-block; background: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
            .reasoning { margin-top: 8px; font-style: italic; color: #555; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Smart Search Results Report</h1>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <h2>Search Summary</h2>
            ${originalQuery ? `<p><strong>Original Query:</strong> "${originalQuery}"</p>` : ''}
            ${evidenceSpecification ? `<p><strong>Evidence Specification:</strong> "${evidenceSpecification}"</p>` : ''}
            ${searchQuery ? `<p><strong>Search Keywords:</strong> ${searchQuery}</p>` : ''}
            <p><strong>Results:</strong> ${acceptedArticles.length} accepted, ${rejectedArticles.length} rejected (${localFilteredArticles.length} total filtered)</p>
          </div>
          
          <h2>Accepted Articles (${acceptedArticles.length})</h2>
          ${acceptedArticles.map(item => `
            <div class="article accepted">
              <div class="title">${item.article.title}</div>
              <div class="authors">${item.article.authors.join(', ')}${item.article.publication_year ? ` (${item.article.publication_year})` : ''}</div>
              ${item.article.journal ? `<div class="details">Journal: ${item.article.journal}</div>` : ''}
              <div class="details">
                Source: ${item.article.source} | 
                <span class="confidence">Confidence: ${Math.round(item.confidence * 100)}%</span>
                ${item.article.url ? ` | <a href="${item.article.url}" target="_blank">View Article</a>` : ''}
              </div>
              ${item.reasoning ? `<div class="reasoning">Reasoning: ${item.reasoning}</div>` : ''}
            </div>
          `).join('')}
          
          ${rejectedArticles.length > 0 ? `
            <h2>Rejected Articles (${rejectedArticles.length})</h2>
            ${rejectedArticles.map(item => `
              <div class="article rejected">
                <div class="title">${item.article.title}</div>
                <div class="authors">${item.article.authors.join(', ')}${item.article.publication_year ? ` (${item.article.publication_year})` : ''}</div>
                <div class="details">
                  Source: ${item.article.source} | 
                  <span class="confidence">Confidence: ${Math.round(item.confidence * 100)}%</span>
                </div>
                <div class="reasoning">Reasoning: ${item.reasoning}</div>
              </div>
            `).join('')}
          ` : ''}
        </body>
      </html>
    `;

    // Convert HTML to PDF using browser's print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // Wait for content to load then trigger print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }

    toast({
      title: 'PDF Export',
      description: 'PDF export dialog opened. Use your browser\'s print-to-PDF function.'
    });
  };

  const downloadFile = (content: string, mimeType: string, extension: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-search-results-${new Date().toISOString().split('T')[0]}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Feature management functions
  const addNewPendingFeature = () => {
    if (!newFeature.name.trim() || !newFeature.description.trim()) {
      toast({
        title: 'Invalid Feature',
        description: 'Please provide both name and description',
        variant: 'destructive'
      });
      return;
    }

    const feature: FeatureDefinition = {
      ...newFeature,
      id: generatePrefixedUUID('feat')
    };

    setPendingFeatures(prev => [...prev, feature]);
    setNewFeature({
      id: '',
      name: '',
      description: '',
      type: 'text'
    });

    toast({
      title: 'Feature Added',
      description: `Added "${feature.name}" to pending features.`
    });
  };

  const removePendingFeature = (featureId: string) => {
    setPendingFeatures(prev => prev.filter(f => f.id !== featureId));
  };

  const removeAppliedFeature = (featureId: string) => {
    setAppliedFeatures(prev => prev.filter(f => f.id !== featureId));
    // Remove the feature from all articles' extracted_features
    setLocalFilteredArticles(prev => prev.map(item => ({
      ...item,
      article: {
        ...item.article,
        extracted_features: item.article.extracted_features 
          ? Object.fromEntries(
              Object.entries(item.article.extracted_features).filter(([key]) => key !== featureId)
            )
          : undefined
      }
    })));
  };

  const submitAllPendingFeatures = async () => {
    if (pendingFeatures.length === 0) {
      toast({
        title: 'No Features',
        description: 'Add some features before applying.',
        variant: 'destructive'
      });
      return;
    }

    if (!sessionId) {
      toast({
        title: 'Session Error',
        description: 'No active session found. Please refresh and try again.',
        variant: 'destructive'
      });
      return;
    }

    setIsExtracting(true);
    setExtractionProgress({ current: 0, total: pendingFeatures.length * acceptedArticles.length });

    try {
      // Call the backend API to extract features
      const response = await smartSearchApi.extractFeatures({
        session_id: sessionId,
        features: pendingFeatures
      });

      // Update articles directly with extracted features
      setLocalFilteredArticles(prev => prev.map(item => {
        const articleId = item.article.id;
        const newFeatures = response.results[articleId];
        
        if (newFeatures) {
          return {
            ...item,
            article: {
              ...item.article,
              extracted_features: {
                ...item.article.extracted_features,
                ...newFeatures
              }
            }
          };
        } else {
          console.warn(`No extraction results found for article: ${articleId}`);
          return item;
        }
      }));

      // Move pending features to applied features
      setAppliedFeatures(prev => [...prev, ...pendingFeatures]);
      const extractedCount = pendingFeatures.length;
      setPendingFeatures([]);

      toast({
        title: 'Columns Applied Successfully!',
        description: `Extracted ${extractedCount} custom column${extractedCount !== 1 ? 's' : ''} for ${acceptedArticles.length} articles in ${response.extraction_metadata.extraction_time.toFixed(1)}s.`
      });

      // Auto-hide the columns area after successful extraction
      setTimeout(() => {
        setShowColumns(false);
      }, 1500);
    } catch (error) {
      console.error('Error extracting features:', error);
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Failed to extract feature data.',
        variant: 'destructive'
      });
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  };

  const renderFeatureValue = (article: FilteredArticle, feature: FeatureDefinition) => {
    const value = article.article.extracted_features?.[feature.id];

    if (value === undefined || value === null) {
      return <span className="text-gray-400 text-xs">-</span>;
    }

    switch (feature.type) {
      case 'boolean':
        return value === 'yes' ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />;
      case 'score':
        return <Badge variant="secondary" className="text-xs">{value}</Badge>;
      default:
        return <span className="text-sm">{value}</span>;
    }
  };

  const copyAcceptedTitles = () => {
    const titles = acceptedArticles.map(item => item.article.title).join('\n');
    navigator.clipboard.writeText(titles);
    toast({
      title: 'Copied to Clipboard',
      description: `Copied ${acceptedArticles.length} accepted article titles`
    });
  };

  return (
    <>
      {/* Workflow Summary Card */}
      <Card className="p-4 dark:bg-gray-800 border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <FileSearch className="w-5 h-5 mr-2" />
            Search Workflow Summary
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={copyAcceptedTitles}
              variant="outline"
              size="sm"
              disabled={acceptedArticles.length === 0}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Titles
            </Button>

            {/* Export Buttons */}
            <div className="flex gap-1">
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                disabled={localFilteredArticles.length === 0}
                title="Export as CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </Button>
              <Button
                onClick={exportToBibTeX}
                variant="outline"
                size="sm"
                disabled={acceptedArticles.length === 0}
                title="Export as BibTeX"
              >
                <BookOpen className="w-4 h-4" />
              </Button>
              <Button
                onClick={exportToPDF}
                variant="outline"
                size="sm"
                disabled={localFilteredArticles.length === 0}
                title="Export as PDF"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-green-800 dark:text-green-200">{acceptedArticles.length}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Accepted</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <X className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-red-800 dark:text-red-200">{rejectedArticles.length}</p>
                <p className="text-sm text-red-600 dark:text-red-400">Rejected</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-200">{totalFiltered}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Filtered</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <div>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{totalAvailable?.toLocaleString()}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Details - Compact Collapsible */}
        <Collapsible open={isWorkflowOpen} onOpenChange={setIsWorkflowOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center justify-start p-1 h-auto mb-2">
              {isWorkflowOpen ? (
                <ChevronDown className="w-3 h-3 mr-1" />
              ) : (
                <ChevronRight className="w-3 h-3 mr-1" />
              )}
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Workflow Details
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {/* Original Query */}
              {originalQuery && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Your Query
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    "{originalQuery}"
                  </p>
                </div>
              )}

              {/* Evidence Specification */}
              {evidenceSpecification && evidenceSpecification !== originalQuery && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Evidence Specification
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    "{evidenceSpecification}"
                  </p>
                </div>
              )}

              {/* Search Keywords */}
              {searchQuery && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Search Keywords
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                    {searchQuery}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {acceptedArticles.length > 0 && (
        <div className="w-full">
          <div className={`flex items-center justify-between mb-4 ${displayMode === 'table' ? 'p-6 bg-white dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-600' : 'p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600'}`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              Accepted Articles ({acceptedArticles.length})
            </h3>

            <div className="flex items-center gap-2">
              {/* Display Mode Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  onClick={() => setDisplayMode('table')}
                  variant={displayMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none border-r"
                  title="Table view"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setDisplayMode('card-compressed')}
                  variant={displayMode === 'card-compressed' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none border-r"
                  title="Card compressed"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setDisplayMode('card-full')}
                  variant={displayMode === 'card-full' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  title="Card full"
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={() => {
                  if (displayMode === 'table') {
                    setShowColumns(!showColumns);
                    // Reset form when opening
                    if (!showColumns) {
                      setPendingFeatures([]);
                      setNewFeature({
                        id: '',
                        name: '',
                        description: '',
                        type: 'text'
                      });
                    }
                  }
                }}
                variant="outline"
                size="sm"
                disabled={displayMode !== 'table'}
                className={displayMode === 'table' 
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 border-0" 
                  : "opacity-50 cursor-not-allowed"}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                AI+
              </Button>
            </div>
          </div>

          {/* Column Management Panel - only show for table view */}
          {displayMode === 'table' && showColumns && (
            <div className="mb-4 p-4 bg-white dark:bg-gray-800 border-x border-gray-200 dark:border-gray-600 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Add Custom Columns</h4>
                <Button
                  onClick={submitAllPendingFeatures}
                  size="sm"
                  disabled={isExtracting || pendingFeatures.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                >
                  {isExtracting ? 'Applying...' : `Apply ${pendingFeatures.length} Column${pendingFeatures.length !== 1 ? 's' : ''}`}
                </Button>
              </div>

              {/* Add Column Form */}
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="column-name" className="text-gray-900 dark:text-gray-100">Column Name</Label>
                    <Input
                      id="column-name"
                      value={newFeature.name}
                      onChange={(e) => setNewFeature(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Sample Size"
                      className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="column-type" className="text-gray-900 dark:text-gray-100">Type</Label>
                    <Select value={newFeature.type} onValueChange={(value: 'text' | 'boolean' | 'score') => setNewFeature(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                        <SelectItem value="text" className="text-gray-900 dark:text-gray-100">Text</SelectItem>
                        <SelectItem value="boolean" className="text-gray-900 dark:text-gray-100">Yes/No</SelectItem>
                        <SelectItem value="score" className="text-gray-900 dark:text-gray-100">Score</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-900 dark:text-gray-100">&nbsp;</Label>
                    <Button
                      onClick={addNewPendingFeature}
                      size="sm"
                      disabled={!newFeature.name.trim() || !newFeature.description.trim()}
                      className="w-full mt-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Column
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="column-description" className="text-gray-900 dark:text-gray-100">
                    Extraction Instructions
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (Describe what AI should extract from each article)
                    </span>
                  </Label>
                  <Textarea
                    id="column-description"
                    value={newFeature.description}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Extract the sample size from the methods section. Look for phrases like 'n=' or 'participants'."
                    className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    rows={3}
                  />
                </div>

                {newFeature.type === 'score' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="score-min" className="text-gray-900 dark:text-gray-100">Min Value</Label>
                      <Input
                        id="score-min"
                        type="number"
                        value={newFeature.options?.min || 1}
                        onChange={(e) => setNewFeature(prev => ({
                          ...prev,
                          options: { ...prev.options, min: Number(e.target.value) }
                        }))}
                        className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="score-max" className="text-gray-900 dark:text-gray-100">Max Value</Label>
                      <Input
                        id="score-max"
                        type="number"
                        value={newFeature.options?.max || 10}
                        onChange={(e) => setNewFeature(prev => ({
                          ...prev,
                          options: { ...prev.options, max: Number(e.target.value) }
                        }))}
                        className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Extraction Progress */}
              {isExtracting && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-600 shadow-sm">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        🤖 AI is extracting custom columns...
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-center mb-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      Processing {acceptedArticles.length} articles with {pendingFeatures.length} custom column{pendingFeatures.length !== 1 ? 's' : ''}
                    </p>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      This may take a few moments...
                    </div>
                  </div>
                  
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: extractionProgress ? `${(extractionProgress.current / extractionProgress.total) * 100}%` : '30%',
                        animation: extractionProgress ? 'none' : 'pulse 2s infinite'
                      }}
                    />
                  </div>
                  
                  {extractionProgress && (
                    <div className="flex justify-between mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <span>Progress</span>
                      <span>{extractionProgress.current} / {extractionProgress.total}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Applied Features */}
              {appliedFeatures.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Active Columns ({appliedFeatures.length})
                  </h5>
                  {appliedFeatures.map(feature => (
                    <div key={feature.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{feature.name}</span>
                          <Badge variant="outline" className="text-xs">{feature.type}</Badge>
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            ✓ Applied
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{feature.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAppliedFeature(feature.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled={isExtracting}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Show pending columns inline */}
              {pendingFeatures.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Ready to Apply ({pendingFeatures.length})
                  </h5>
                  {pendingFeatures.map(feature => (
                    <div key={feature.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{feature.name}</span>
                          <Badge variant="outline" className="text-xs">{feature.type}</Badge>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 truncate">{feature.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePendingFeature(feature.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled={isExtracting}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card Compressed View */}
          {displayMode === 'card-compressed' && (
            <div className="space-y-1 p-6 bg-white dark:bg-gray-800 rounded-b-lg border-x border-b border-gray-200 dark:border-gray-600">
              {acceptedArticles.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {item.article.title}
                        </h4>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <span className="truncate">
                          {item.article.authors.slice(0, 2).join(', ')}
                          {item.article.authors.length > 2 && ' et al.'}
                          {item.article.publication_year && ` (${item.article.publication_year})`}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.article.source}
                        </Badge>
                        {item.article.url && (
                          <a
                            href={item.article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Card Full View */}
          {displayMode === 'card-full' && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-b-lg border-x border-b border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {acceptedArticles.map((item, idx) => (
                <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 leading-tight flex-1">
                        {item.article.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {Math.round(item.confidence * 100)}%
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <div className="font-medium mb-1">
                        {item.article.authors.slice(0, 3).join(', ')}
                        {item.article.authors.length > 3 && ' et al.'}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{item.article.publication_year || 'N/A'}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.article.source}
                        </Badge>
                      </div>
                    </div>

                    {item.article.journal && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic truncate">
                        {item.article.journal}
                      </div>
                    )}

                    {item.article.abstract && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                        {item.article.abstract}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Confidence: {Math.round(item.confidence * 100)}%
                      </div>
                      {item.article.url && (
                        <a
                          href={item.article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              </div>
            </div>
          )}

          {/* Table View */}
          {displayMode === 'table' && (
            <div className="w-full border border-gray-200 dark:border-gray-600 border-t-0 rounded-b-lg bg-white dark:bg-gray-800 overflow-x-auto">
              <table className="w-full text-sm table-auto">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Title</th>
                      <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Authors</th>
                      <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Year</th>
                      <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Journal</th>
                      <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Source</th>
                      <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Confidence</th>
                      <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Link</th>
                      {appliedFeatures.map(feature => (
                        <th key={feature.id} className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">
                          <div className="flex items-center justify-between">
                            <span>{feature.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeAppliedFeature(feature.id)}
                              className="ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {acceptedArticles.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-2">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {item.article.title}
                          </div>
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          <div>
                            {item.article.authors.slice(0, 2).join(', ')}
                            {item.article.authors.length > 2 && ' et al.'}
                          </div>
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          {item.article.publication_year || 'N/A'}
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400">
                          <div>
                            {item.article.journal || 'N/A'}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {item.article.source}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(item.confidence * 100)}%
                          </Badge>
                        </td>
                        <td className="p-2">
                          {item.article.url && (
                            <a
                              href={item.article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </td>
                        {appliedFeatures.map(feature => (
                          <td key={feature.id} className="p-2 text-gray-600 dark:text-gray-400">
                            {renderFeatureValue(item, feature)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      )}


      {rejectedArticles.length > 0 && (
        <Collapsible open={isRejectedOpen} onOpenChange={setIsRejectedOpen}>
          <CollapsibleTrigger asChild>
            <Card className="p-6 dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <X className="w-5 h-5 text-red-600 mr-2" />
                Rejected Articles ({rejectedArticles.length})
                {isRejectedOpen ? (
                  <ChevronDown className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 ml-2" />
                )}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (Click to expand)
                </span>
              </h3>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="p-6 dark:bg-gray-800 mt-2">
              <div className="space-y-1">
                {rejectedArticles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 truncate">
                            {item.article.title}
                          </h4>
                          <Badge variant="outline" className="text-xs shrink-0 text-red-600">
                            {Math.round(item.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="truncate">
                            {item.article.authors.slice(0, 2).join(', ')}
                            {item.article.authors.length > 2 && ' et al.'}
                            {item.article.publication_year && ` (${item.article.publication_year})`}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.article.source}
                          </Badge>
                          {item.article.url && (
                            <a
                              href={item.article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                          Reason: {item.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}