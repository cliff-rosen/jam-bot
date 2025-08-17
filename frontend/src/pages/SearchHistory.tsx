import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Search, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { smartSearchApi } from '@/lib/api/smartSearchApi';

interface SearchSession {
  id: string;
  original_question: string;
  refined_question?: string;
  submitted_refined_question?: string;
  generated_search_query?: string;
  submitted_search_query?: string;
  created_at: string;
  updated_at: string;
  // Search execution metadata from search_metadata
  search_metadata?: {
    total_available?: number;
    total_retrieved?: number;
    sources_searched?: string[];
  };
  articles_retrieved_count?: number;
  articles_selected_count?: number;
  // Filtering metadata  
  filtering_metadata?: {
    total_filtered?: number;
    accepted?: number;
    rejected?: number;
    average_confidence?: number;
  };
  generated_discriminator?: string;
  submitted_discriminator?: string;
  filter_strictness?: string;
  // Status
  status?: string;
  last_step_completed?: string;
}

export default function SearchHistory() {
  const [sessions, setSessions] = useState<SearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await smartSearchApi.getUserSessions();
      // Extract sessions array from response object
      setSessions(response?.sessions || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load search history';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStepBadge = (step?: string) => {
    const stepMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'question_input': { label: 'Started', variant: 'outline' },
      'question_refinement': { label: 'Evidence Spec', variant: 'outline' },
      'search_query_generation': { label: 'Keywords', variant: 'outline' },
      'search_execution': { label: 'Search Complete', variant: 'secondary' },
      'discriminator_generation': { label: 'Filter Setup', variant: 'secondary' },
      'filtering': { label: 'Completed', variant: 'default' }
    };

    const stepInfo = stepMap[step || 'question_input'] || { label: 'Unknown', variant: 'outline' as const };
    return <Badge variant={stepInfo.variant}>{stepInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin mr-2 h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-lg text-gray-600 dark:text-gray-400">Loading search history...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Search History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage your Smart Search sessions
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadSessions}
              variant="outline"
              disabled={loading}
              className="dark:border-gray-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/smart-search">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Search className="w-4 h-4 mr-2" />
                New Search
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </Card>
        )}

        {sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No search history yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start your first Smart Search to see your search sessions here.
            </p>
            <Link to="/smart-search">
              <Button>
                <Search className="w-4 h-4 mr-2" />
                Start Your First Search
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Main content */}
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {session.original_question}
                      </h3>
                      {getStepBadge(session.last_step_completed)}
                    </div>

                    {/* Evidence spec if available */}
                    {(session.submitted_refined_question || session.refined_question) && (
                      <div className="mb-3 pl-8">
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                          "{session.submitted_refined_question || session.refined_question}"
                        </p>
                      </div>
                    )}

                    {/* Search query if available */}
                    {(session.submitted_search_query || session.generated_search_query) && (
                      <div className="mb-3 pl-8">
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {session.submitted_search_query || session.generated_search_query}
                        </p>
                      </div>
                    )}

                    {/* Results summary */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 pl-8">
                      {session.search_metadata?.total_available !== undefined && (
                        <div className="flex items-center gap-1">
                          <Search className="w-4 h-4" />
                          <span>{session.search_metadata.total_available.toLocaleString()} articles found</span>
                        </div>
                      )}
                      {session.filtering_metadata?.accepted !== undefined && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{session.filtering_metadata.accepted} accepted after filtering</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(session.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Link to={`/smart-search?session=${session.id}`}>
                      <Button variant="outline" size="sm">
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}