/**
 * Unified Article Card Component
 * 
 * Displays articles from any provider (PubMed, Google Scholar) in a consistent format.
 * Adapts display based on the source and available fields.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  FileText, 
  Download, 
  Quote, 
  Calendar,
  MapPin,
  Hash,
  Star,
  Database,
  Search,
  Microscope,
  BookOpen
} from 'lucide-react';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';
import ExtractedFeatures from './ExtractedFeatures';

interface UnifiedArticleCardProps {
  article: CanonicalResearchArticle;
  index: number;
  showExtractedFeatures?: boolean;
}

const SOURCE_CONFIG = {
  pubmed: {
    name: 'PubMed',
    icon: Database,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    urlPrefix: 'https://pubmed.ncbi.nlm.nih.gov/'
  },
  scholar: {
    name: 'Google Scholar',
    icon: Search,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    urlPrefix: 'https://scholar.google.com/'
  }
} as const;

export function UnifiedArticleCard({ 
  article, 
  index, 
  showExtractedFeatures = true 
}: UnifiedArticleCardProps) {
  const sourceConfig = SOURCE_CONFIG[article.source];
  const SourceIcon = sourceConfig.icon;
  
  const hasExtractedFeatures = article.extracted_features && 
    Object.keys(article.extracted_features).length > 0;

  const renderSourceBadge = () => (
    <Badge className={`${sourceConfig.color} flex items-center gap-1`}>
      <SourceIcon className="w-3 h-3" />
      {sourceConfig.name}
    </Badge>
  );

  const renderTitle = () => {
    const titleElement = (
      <h3 className="font-semibold text-lg leading-tight text-gray-900 dark:text-gray-100">
        {article.title}
      </h3>
    );

    if (article.url) {
      return (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline block"
        >
          {titleElement}
        </a>
      );
    }

    return titleElement;
  };

  const renderAuthors = () => {
    if (article.authors.length === 0) return null;

    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {article.authors.join(', ')}
      </p>
    );
  };

  const renderPublicationInfo = () => {
    const parts = [];
    
    if (article.journal) {
      parts.push(article.journal);
    }
    
    if (article.publication_year) {
      parts.push(`${article.publication_year}`);
    } else if (article.publication_date) {
      const year = new Date(article.publication_date).getFullYear();
      if (!isNaN(year)) {
        parts.push(`${year}`);
      }
    }

    if (parts.length === 0) return null;

    return (
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
        <Calendar className="w-4 h-4 mr-1" />
        {parts.join(' • ')}
      </div>
    );
  };

  const renderContent = () => {
    if (article.abstract) {
      return (
        <div className="mt-2">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 mt-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {article.abstract.length > 300 
                ? `${article.abstract.substring(0, 300)}...` 
                : article.abstract
              }
            </p>
          </div>
        </div>
      );
    }

    if (article.snippet) {
      return (
        <div className="mt-2">
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
            {article.snippet}
          </p>
        </div>
      );
    }

    return null;
  };

  const renderMetadata = () => {
    const items = [];

    // Citation count
    if (article.citation_count !== undefined && article.citation_count > 0) {
      items.push(
        <div key="citations" className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Quote className="w-3 h-3 mr-1" />
          {article.citation_count} citation{article.citation_count !== 1 ? 's' : ''}
        </div>
      );
    }

    // Search position
    if (article.search_position) {
      items.push(
        <div key="position" className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Hash className="w-3 h-3 mr-1" />
          #{article.search_position}
        </div>
      );
    }

    // Relevance score
    if (article.relevance_score !== undefined) {
      items.push(
        <div key="relevance" className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Star className="w-3 h-3 mr-1" />
          {article.relevance_score.toFixed(1)}/10
        </div>
      );
    }

    // DOI
    if (article.doi) {
      items.push(
        <div key="doi" className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="w-3 h-3 mr-1" />
          DOI: {article.doi}
        </div>
      );
    }

    if (items.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        {items}
      </div>
    );
  };

  const renderSourceSpecificBadges = () => {
    const badges = [];

    // MeSH terms for PubMed
    if (article.source === 'pubmed' && article.mesh_terms.length > 0) {
      badges.push(
        <Badge key="mesh" variant="secondary" className="text-xs">
          <Microscope className="w-3 h-3 mr-1" />
          {article.mesh_terms.length} MeSH term{article.mesh_terms.length !== 1 ? 's' : ''}
        </Badge>
      );
    }

    // Keywords
    if (article.keywords.length > 0) {
      badges.push(
        <Badge key="keywords" variant="secondary" className="text-xs">
          {article.keywords.length} keyword{article.keywords.length !== 1 ? 's' : ''}
        </Badge>
      );
    }

    return badges;
  };

  const renderActionButtons = () => {
    const buttons = [];

    // PDF link
    if (article.pdf_url) {
      buttons.push(
        <Button
          key="pdf"
          variant="outline"
          size="sm"
          asChild
          className="text-xs"
        >
          <a href={article.pdf_url} target="_blank" rel="noopener noreferrer">
            <Download className="w-3 h-3 mr-1" />
            PDF
          </a>
        </Button>
      );
    }

    // Citations link
    if (article.cited_by_url) {
      buttons.push(
        <Button
          key="citations"
          variant="outline"
          size="sm"
          asChild
          className="text-xs"
        >
          <a href={article.cited_by_url} target="_blank" rel="noopener noreferrer">
            <Quote className="w-3 h-3 mr-1" />
            Citations
          </a>
        </Button>
      );
    }

    // Related articles
    if (article.related_articles_url) {
      buttons.push(
        <Button
          key="related"
          variant="outline"
          size="sm"
          asChild
          className="text-xs"
        >
          <a href={article.related_articles_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3 mr-1" />
            Related
          </a>
        </Button>
      );
    }

    // Versions (Scholar-specific)
    if (article.versions_url) {
      buttons.push(
        <Button
          key="versions"
          variant="outline"
          size="sm"
          asChild
          className="text-xs"
        >
          <a href={article.versions_url} target="_blank" rel="noopener noreferrer">
            <FileText className="w-3 h-3 mr-1" />
            Versions
          </a>
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            {renderTitle()}
            {renderAuthors()}
            {renderPublicationInfo()}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {renderSourceBadge()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {renderContent()}
        
        {/* Badges and metadata */}
        <div className="flex flex-wrap gap-2 mt-3">
          {renderSourceSpecificBadges()}
        </div>
        
        {renderMetadata()}
        
        {/* Action buttons */}
        {renderActionButtons().length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {renderActionButtons()}
          </div>
        )}
        
        {/* Extracted features */}
        {showExtractedFeatures && hasExtractedFeatures && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <ExtractedFeatures 
              article={{ 
                ...article, 
                metadata: { 
                  features: article.extracted_features 
                }
              }} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}