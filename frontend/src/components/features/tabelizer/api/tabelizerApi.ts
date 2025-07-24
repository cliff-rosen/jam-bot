import { api } from '@/lib/api/index';
import { ExtractColumnRequest, ExtractColumnResponse, TabelizerColumn } from '../types';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';

export const tabelizerApi = {
  async extractColumn(request: ExtractColumnRequest): Promise<ExtractColumnResponse> {
    const response = await api.post('/api/tabelizer/extract-column', request);
    return response.data;
  },

  async exportCsv(articles: CanonicalResearchArticle[], columns: TabelizerColumn[]): Promise<string> {
    // For MVP, we'll do CSV generation client-side
    const headers = ['ID', 'Title', 'Authors', 'Journal', 'Year', 'Source'];
    columns.forEach(col => headers.push(col.name));

    const rows = articles.map(article => {
      const row = [
        article.id.replace('pubmed_', '').replace('scholar_', ''),
        `"${article.title.replace(/"/g, '""')}"`,
        `"${article.authors.join('; ').replace(/"/g, '""')}"`,
        `"${(article.journal || '-').replace(/"/g, '""')}"`,
        article.publication_year || '-',
        article.source,
      ];

      columns.forEach(col => {
        const value = col.data[article.id] || '-';
        row.push(`"${value.replace(/"/g, '""')}"`);
      });

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },
};