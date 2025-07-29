import { useState, useMemo } from 'react';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';
import { TabelizerColumn } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Plus, Download, X, ExternalLink, Eye, Save, FolderOpen, Trash2 } from 'lucide-react';

interface TabelizerTableProps {
  articles: CanonicalResearchArticle[];
  columns: TabelizerColumn[];
  onAddColumn: () => void;
  onDeleteColumn: (columnId: string) => void;
  onDeleteArticle: (articleId: string) => void;
  onExport: () => void;
  isExtracting: boolean;
  onViewArticle: (article: CanonicalResearchArticle) => void;
  onSaveGroup: () => void;
  onLoadGroup: () => void;
  currentGroup?: { id: string; name: string } | null;
  displayDateType?: "completion" | "publication" | "entry" | "revised";
}

export function TabelizerTable({
  articles,
  columns,
  onAddColumn,
  onDeleteColumn,
  onDeleteArticle,
  onExport,
  isExtracting,
  onViewArticle,
  onSaveGroup,
  onLoadGroup,
  currentGroup,
  displayDateType: initialDisplayDateType = 'publication',
}: TabelizerTableProps) {
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [displayDateType, setDisplayDateType] = useState<"completion" | "publication" | "entry" | "revised">(initialDisplayDateType);

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDirection('asc');
    }
  };

  const getArticleDate = (article: CanonicalResearchArticle, dateType: string): string => {
    // For non-PubMed articles, always use publication year
    if (article.source !== 'pubmed') {
      return article.publication_year?.toString() || '-';
    }

    // For PubMed articles, use the first-class date fields
    switch (dateType) {
      case 'completion':
        return article.date_completed || article.source_metadata?.comp_date || article.publication_date || '-';
      case 'entry':
        return article.date_entered || article.source_metadata?.entry_date || article.publication_date || '-';
      case 'revised':
        return article.date_revised || article.source_metadata?.date_revised || article.publication_date || '-';
      case 'publication':
      default:
        return article.date_published || article.source_metadata?.pub_date || article.publication_date || article.publication_year?.toString() || '-';
    }
  };

  const sortedArticles = useMemo(() => {
    if (!sortBy) return articles;

    return [...articles].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle fixed columns
      switch (sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'authors':
          aValue = a.authors[0] || '';
          bValue = b.authors[0] || '';
          break;
        case 'journal':
          aValue = a.journal || '';
          bValue = b.journal || '';
          break;
        case 'year':
          // Use the currently selected date type for sorting
          aValue = getArticleDate(a, displayDateType);
          bValue = getArticleDate(b, displayDateType);
          // Convert dates to comparable format for sorting
          aValue = normalizeDateForSorting(aValue);
          bValue = normalizeDateForSorting(bValue);
          break;
        case 'source':
          aValue = a.source;
          bValue = b.source;
          break;
        case 'abstract':
          aValue = a.abstract || '';
          bValue = b.abstract || '';
          break;
        default:
          // Handle custom columns
          const column = columns.find(c => c.id === sortBy);
          if (column) {
            aValue = column.data[a.id] || '';
            bValue = column.data[b.id] || '';
          }
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [articles, columns, sortBy, sortDirection]);

  const renderSortIcon = (columnId: string) => {
    if (sortBy !== columnId) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const getSourceBadge = (source: string) => {
    const config = source === 'pubmed' 
      ? { label: 'PubMed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
      : { label: 'Scholar', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatAuthors = (authors: string[]) => {
    if (authors.length === 0) return '-';
    if (authors.length === 1) return authors[0];
    return `${authors[0]} et al`;
  };

  const normalizeDateForSorting = (dateStr: string): string => {
    if (!dateStr || dateStr === '-') return '0000-00-00';
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // Just a year (YYYY)
    if (/^\d{4}$/.test(dateStr)) return `${dateStr}-00-00`;
    
    // Handle PubMed format like "2025-Jul-24" or "2025-Jun-25"
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const pubmedMatch = dateStr.match(/^(\d{4})-([A-Za-z]{3})-(\d{1,2})$/);
    if (pubmedMatch) {
      const [, year, monthName, day] = pubmedMatch;
      const monthNum = monthMap[monthName] || '00';
      const dayPadded = day.padStart(2, '0');
      return `${year}-${monthNum}-${dayPadded}`;
    }
    
    // Try to extract year and use that
    const yearMatch = dateStr.match(/^(\d{4})/);
    if (yearMatch) return `${yearMatch[1]}-00-00`;
    
    // Fallback
    return '0000-00-00';
  };

  const formatDate = (dateStr: string, dateType: string): string => {
    if (!dateStr || dateStr === '-') return '-';
    
    // If it's just a year, return as-is
    if (/^\d{4}$/.test(dateStr)) return dateStr;
    
    // If it's a full date (YYYY-MM-DD), return the full date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // Handle PubMed format like "2025-Jul-24" - keep full format for publication dates
    if (dateType === 'publication' && dateStr.includes('-') && !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr; // Keep the full format like "2025-Jul-24"
    }
    
    // Try to extract the year from other formats as fallback for non-publication dates
    const yearMatch = dateStr.match(/^(\d{4})/);
    if (yearMatch && dateType !== 'publication') return yearMatch[1];
    
    return dateStr;
  };

  const truncateAbstract = (abstract: string | null | undefined, maxLength: number = 150) => {
    if (!abstract) return '-';
    if (abstract.length <= maxLength) return abstract;
    return abstract.substring(0, maxLength) + '...';
  };

  const getArticleUrl = (article: CanonicalResearchArticle) => {
    if (article.source === 'pubmed' && article.id.includes('pubmed_')) {
      const pmid = article.id.replace('pubmed_', '');
      return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    }
    // For Scholar articles, we might have a URL in the article data
    return article.url || null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table Header Actions */}
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {currentGroup ? (
              <Badge variant="outline" className="mr-2">{currentGroup.name}</Badge>
            ) : (
              <span className="text-gray-500 italic mr-2">Unsaved Session</span>
            )}
            {articles.length} articles · {columns.length} custom columns
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onLoadGroup}
            variant="outline"
            size="sm"
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Load Group
          </Button>
          <Button
            onClick={onSaveGroup}
            variant="outline"
            size="sm"
            disabled={articles.length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            Save Group
          </Button>
          <div className="border-l mx-2" />
          <Button
            onClick={onAddColumn}
            disabled={isExtracting}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Column
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-20" />
            <col className="w-96" />
            <col className="w-32" />
            <col className="w-40" />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-80" />
            <col className="w-32" />
            {columns.map(() => (
              <col key={Math.random()} className="w-32" />
            ))}
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr>
              {/* Fixed Columns */}
              <th 
                className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1">
                  ID
                  {renderSortIcon('id')}
                </div>
              </th>
              <th 
                className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Title
                  {renderSortIcon('title')}
                </div>
              </th>
              <th 
                className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                onClick={() => handleSort('authors')}
              >
                <div className="flex items-center gap-1">
                  Authors
                  {renderSortIcon('authors')}
                </div>
              </th>
              <th 
                className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                onClick={() => handleSort('journal')}
              >
                <div className="flex items-center gap-1">
                  Journal
                  {renderSortIcon('journal')}
                </div>
              </th>
              <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                <div className="flex flex-col gap-2">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-1 rounded"
                    onClick={() => handleSort('year')}
                  >
                    <span className="text-sm">Date</span>
                    {renderSortIcon('year')}
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type:</label>
                    <select
                      className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-0"
                      value={displayDateType}
                      onChange={(e) => setDisplayDateType(e.target.value as "completion" | "publication" | "entry" | "revised")}
                      onClick={(e) => e.stopPropagation()}
                      title="Select which date type to display in the table"
                    >
                      <option value="publication">Publication</option>
                      <option value="completion">Completion</option>
                      <option value="entry">Entry</option>
                      <option value="revised">Revised</option>
                    </select>
                  </div>
                </div>
              </th>
              <th 
                className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                onClick={() => handleSort('source')}
              >
                <div className="flex items-center gap-1">
                  Source
                  {renderSortIcon('source')}
                </div>
              </th>
              <th 
                className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('abstract')}
              >
                <div className="flex items-center gap-1">
                  Abstract
                  {renderSortIcon('abstract')}
                </div>
              </th>
              <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                Actions
              </th>
              
              {/* Custom Columns */}
              {columns.map(column => (
                <th
                  key={column.id}
                  className="text-left p-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap group"
                  title={column.description}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-1 rounded flex-1 min-w-0"
                      onClick={() => handleSort(column.id)}
                    >
                      <span className="truncate">{column.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 flex-shrink-0">
                        ({column.type === 'boolean' ? 'Y/N' : 
                          column.type === 'score' ? 
                            `${column.options?.min || 1}-${column.options?.max || 10}` : 
                            'Text'})
                      </span>
                      {renderSortIcon(column.id)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                      onClick={() => onDeleteColumn(column.id)}
                      title={`Delete ${column.name} column`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedArticles.map((article, index) => (
              <tr
                key={article.id}
                className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
              >
                {/* Fixed Columns */}
                <td className="p-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  <div className="truncate" title={article.id}>
                    {article.id.replace('pubmed_', '').replace('scholar_', '')}
                  </div>
                </td>
                <td className="p-2 text-sm text-gray-900 dark:text-gray-100">
                  <div className="truncate" title={article.title}>
                    {article.title}
                  </div>
                </td>
                <td className="p-2 text-sm text-gray-900 dark:text-gray-100">
                  <div className="truncate" title={formatAuthors(article.authors)}>
                    {formatAuthors(article.authors)}
                  </div>
                </td>
                <td className="p-2 text-sm text-gray-900 dark:text-gray-100">
                  <div className="truncate" title={article.journal || '-'}>
                    {article.journal || '-'}
                  </div>
                </td>
                <td className="p-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{formatDate(getArticleDate(article, displayDateType), displayDateType)}</span>
                    {article.source === 'pubmed' && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                        {displayDateType}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2 whitespace-nowrap">
                  {getSourceBadge(article.source)}
                </td>
                <td className="p-2 text-sm text-gray-900 dark:text-gray-100">
                  <div className="truncate" title={article.abstract || 'No abstract available'}>
                    {truncateAbstract(article.abstract, 100)}
                  </div>
                </td>
                <td className="p-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewArticle(article)}
                      className="h-8 w-8 p-0"
                      title="View full article details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {getArticleUrl(article) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(getArticleUrl(article)!, '_blank')}
                        className="h-8 w-8 p-0"
                        title="Open original article"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteArticle(article.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Remove article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
                
                {/* Custom Columns */}
                {columns.map(column => (
                  <td
                    key={column.id}
                    className="p-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap"
                  >
                    {column.type === 'boolean' ? (
                      <span className={
                        column.data[article.id] === 'yes' 
                          ? 'text-green-600 dark:text-green-400 font-medium' 
                          : 'text-gray-500 dark:text-gray-400'
                      }>
                        {column.data[article.id] || '-'}
                      </span>
                    ) : (
                      <div className="truncate" title={column.data[article.id] || '-'}>
                        {column.data[article.id] || '-'}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}