import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, ExternalLink, Filter, FileSearch, Database, Copy, ChevronDown, ChevronRight, Grid, List, Eye, FileText, FileSpreadsheet, BookOpen, Plus, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import type { FilteredArticle } from '@/types/smart-search';
import type { FeatureDefinition } from '@/types/workbench';
import { generatePrefixedUUID } from '@/lib/utils/uuid';

interface ResultsStepProps {
  filteredArticles: FilteredArticle[];
  originalQuery?: string;
  evidenceSpecification?: string;
  searchQuery?: string;
  totalAvailable?: number;
  totalFiltered?: number;
}

export function ResultsStep({ 
  filteredArticles,
  originalQuery,
  evidenceSpecification,
  searchQuery,
  totalAvailable,
  totalFiltered
}: ResultsStepProps) {
  const { toast } = useToast();
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [isRejectedOpen, setIsRejectedOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'table' | 'card-compressed' | 'card-full'>('card-compressed');
  
  // Column/Feature management for table view
  const [showColumns, setShowColumns] = useState(false);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [customFeatures, setCustomFeatures] = useState<FeatureDefinition[]>([]);
  const [extractedFeatures, setExtractedFeatures] = useState<Record<string, Record<string, any>>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  
  // New feature form state
  const [newFeature, setNewFeature] = useState<FeatureDefinition>({
    id: '',
    name: '',
    description: '',
    type: 'text'
  });
  
  // Use all articles for display (no client-side filtering)
  const acceptedArticles = filteredArticles.filter(fa => fa.passed);
  const rejectedArticles = filteredArticles.filter(fa => !fa.passed);
  

  const exportToCSV = () => {
    const csvContent = [
      ['Title', 'Authors', 'Year', 'Journal', 'Abstract', 'URL', 'DOI', 'PMID', 'Status', 'Confidence', 'Reasoning'].join(','),
      ...filteredArticles.map(item => [
        `"${item.article.title.replace(/"/g, '""')}"`,
        `"${item.article.authors.join('; ').replace(/"/g, '""')}"`,
        item.article.year || '',
        `"${(item.article.journal || '').replace(/"/g, '""')}"`,
        `"${(item.article.abstract || '').replace(/"/g, '""')}"`,
        item.article.url || '',
        item.article.doi || '',
        item.article.pmid || '',
        item.passed ? 'Accepted' : 'Rejected',
        Math.round(item.confidence * 100) + '%',
        `"${item.reasoning.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'text/csv', 'csv');
    toast({
      title: 'Exported to CSV',
      description: `Exported ${filteredArticles.length} articles to CSV file`
    });
  };

  const exportToBibTeX = () => {
    const bibTexContent = filteredArticles
      .filter(item => item.passed) // Only export accepted articles
      .map((item, index) => {
        const cleanTitle = item.article.title.replace(/[{}]/g, '');
        const authors = item.article.authors.join(' and ');
        const year = item.article.year || new Date().getFullYear();
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
            <p><strong>Results:</strong> ${acceptedArticles.length} accepted, ${rejectedArticles.length} rejected (${filteredArticles.length} total filtered)</p>
          </div>
          
          <h2>Accepted Articles (${acceptedArticles.length})</h2>
          ${acceptedArticles.map(item => `
            <div class="article accepted">
              <div class="title">${item.article.title}</div>
              <div class="authors">${item.article.authors.join(', ')}${item.article.year ? ` (${item.article.year})` : ''}</div>
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
                <div class="authors">${item.article.authors.join(', ')}${item.article.year ? ` (${item.article.year})` : ''}</div>
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
  const addCustomFeature = () => {
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

    setCustomFeatures(prev => [...prev, feature]);
    setNewFeature({
      id: '',
      name: '',
      description: '',
      type: 'text'
    });
    setShowAddFeature(false);

    toast({
      title: 'Feature Added',
      description: `Added "${feature.name}" column. Click the settings icon to extract data.`
    });
  };

  const removeCustomFeature = (featureId: string) => {
    setCustomFeatures(prev => prev.filter(f => f.id !== featureId));
    setExtractedFeatures(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(articleId => {
        delete updated[articleId][featureId];
      });
      return updated;
    });
  };

  const extractFeatureForAllArticles = async (featureId: string) => {
    const feature = customFeatures.find(f => f.id === featureId);
    if (!feature) return;

    setIsExtracting(true);
    
    try {
      // TODO: Call backend API to extract feature for all articles
      // For now, simulate with mock data
      setTimeout(() => {
        const mockExtractions: Record<string, any> = {};
        acceptedArticles.forEach((item, idx) => {
          // Create a unique ID for the article (use title + authors as fallback)
          const uniqueId = `${item.article.title}-${item.article.authors.join(',')}`;
          if (!extractedFeatures[uniqueId]) {
            extractedFeatures[uniqueId] = {};
          }
          
          // Mock extraction based on feature type
          switch (feature.type) {
            case 'boolean':
              mockExtractions[uniqueId] = { ...extractedFeatures[uniqueId], [featureId]: Math.random() > 0.5 };
              break;
            case 'score':
              const min = feature.options?.min || 1;
              const max = feature.options?.max || 10;
              mockExtractions[uniqueId] = { ...extractedFeatures[uniqueId], [featureId]: Math.floor(Math.random() * (max - min + 1)) + min };
              break;
            default: // text
              mockExtractions[uniqueId] = { ...extractedFeatures[uniqueId], [featureId]: `Sample ${feature.name.toLowerCase()} ${idx + 1}` };
          }
        });
        
        setExtractedFeatures(prev => ({ ...prev, ...mockExtractions }));
        setIsExtracting(false);
        
        toast({
          title: 'Extraction Complete',
          description: `Extracted "${feature.name}" for ${acceptedArticles.length} articles`
        });
      }, 2000);
    } catch (error) {
      setIsExtracting(false);
      toast({
        title: 'Extraction Failed',
        description: 'Failed to extract feature data',
        variant: 'destructive'
      });
    }
  };

  const renderFeatureValue = (articleId: string, feature: FeatureDefinition) => {
    const value = extractedFeatures[articleId]?.[feature.id];
    
    if (value === undefined || value === null) {
      return <span className="text-gray-400 text-xs">-</span>;
    }
    
    switch (feature.type) {
      case 'boolean':
        return value ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />;
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
      <Card className="p-6 dark:bg-gray-800 border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <FileSearch className="w-5 h-5 mr-2" />
            Search Workflow Summary
          </h2>
          <div className="flex gap-2">
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
                disabled={filteredArticles.length === 0}
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
                disabled={filteredArticles.length === 0}
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

        {/* Workflow Details - Collapsible */}
        <Collapsible open={isWorkflowOpen} onOpenChange={setIsWorkflowOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center w-full justify-start p-0 h-auto">
              {isWorkflowOpen ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
        <Card className="p-6 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              Accepted Articles ({acceptedArticles.length})
            </h3>
            
            {displayMode === 'table' && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowColumns(!showColumns)}
                  variant="outline"
                  size="sm"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </div>
            )}
          </div>
          
          {/* Column Controls - only show for table view */}
          {displayMode === 'table' && showColumns && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Custom Columns</h4>
                <Button
                  onClick={() => setShowAddFeature(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Column
                </Button>
              </div>
              
              {customFeatures.length > 0 && (
                <div className="space-y-2">
                  {customFeatures.map(feature => (
                    <div key={feature.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{feature.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{feature.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => extractFeatureForAllArticles(feature.id)}
                          disabled={isExtracting}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCustomFeature(feature.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {customFeatures.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No custom columns added yet. Click "Add Column" to get started.
                </p>
              )}
            </div>
          )}
          
          {/* Card Compressed View */}
          {displayMode === 'card-compressed' && (
            <div className="space-y-1">
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
                          {item.article.year && ` (${item.article.year})`}
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
                        <span>{item.article.year || 'N/A'}</span>
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
          )}
          
          {/* Table View */}
          {displayMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Title</th>
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Authors</th>
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Year</th>
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Journal</th>
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Source</th>
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Confidence</th>
                    <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">Link</th>
                    {customFeatures.map(feature => (
                      <th key={feature.id} className="text-left p-2 font-medium text-gray-600 dark:text-gray-300">
                        {feature.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acceptedArticles.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-2">
                        <div className="font-medium text-gray-900 dark:text-gray-100 max-w-md">
                          {item.article.title}
                        </div>
                      </td>
                      <td className="p-2 text-gray-600 dark:text-gray-400">
                        <div className="max-w-xs truncate">
                          {item.article.authors.slice(0, 2).join(', ')}
                          {item.article.authors.length > 2 && ' et al.'}
                        </div>
                      </td>
                      <td className="p-2 text-gray-600 dark:text-gray-400">
                        {item.article.year || 'N/A'}
                      </td>
                      <td className="p-2 text-gray-600 dark:text-gray-400">
                        <div className="max-w-xs truncate">
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
                      {customFeatures.map(feature => (
                        <td key={feature.id} className="p-2 text-gray-600 dark:text-gray-400">
                          {renderFeatureValue(`${item.article.title}-${item.article.authors.join(',')}`, feature)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      
      {/* Add Feature Dialog */}
      <Dialog open={showAddFeature} onOpenChange={setShowAddFeature}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Add Custom Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feature-name" className="text-gray-900 dark:text-gray-100">Column Name</Label>
              <Input
                id="feature-name"
                placeholder="e.g., Study Type, Sample Size"
                value={newFeature.name}
                onChange={(e) => setNewFeature(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="feature-description" className="text-gray-900 dark:text-gray-100">Description</Label>
              <Textarea
                id="feature-description"
                placeholder="Describe what information you want to extract from each article..."
                value={newFeature.description}
                onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div>
              <Label className="text-gray-900 dark:text-gray-100">Data Type</Label>
              <Select
                value={newFeature.type}
                onValueChange={(value: 'text' | 'boolean' | 'score') => 
                  setNewFeature(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="boolean">Yes/No</SelectItem>
                  <SelectItem value="score">Score (1-10)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newFeature.type === 'score' && (
              <div className="grid grid-cols-2 gap-2">
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
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddFeature(false)}
              >
                Cancel
              </Button>
              <Button onClick={addCustomFeature}>
                Add Column
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                          {item.article.year && ` (${item.article.year})`}
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