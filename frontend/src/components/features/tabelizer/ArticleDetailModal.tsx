import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExternalLink, Calendar, Users, BookOpen, Send, MessageCircle, X } from 'lucide-react';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ArticleDetailModalProps {
  article: CanonicalResearchArticle;
  onClose: () => void;
}

export function ArticleDetailModal({ article, onClose }: ArticleDetailModalProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm here to help you analyze this article: "${article.title}". You can ask me questions about the methodology, findings, implications, or anything else related to this research.`,
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Here you would integrate with your chat API
      // For now, we'll simulate a response
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you're asking about "${userMessage.content}". Based on the article "${article.title}", I can help analyze specific aspects. Could you be more specific about what you'd like to know about this research?`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold truncate">Article Analysis</h2>
            {getSourceBadge(article.source)}
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
          <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Article Chat</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ask questions about this research
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-1 opacity-70 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about this article..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - Article Details */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {article.title}
                </h1>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Authors</div>
                    <div className="text-sm font-medium">
                      {article.authors.length > 0 ? article.authors.join(', ') : 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Journal</div>
                    <div className="text-sm font-medium">
                      {article.journal || 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Year</div>
                    <div className="text-sm font-medium">
                      {article.publication_year || 'Not specified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Article ID */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Article ID</h3>
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {article.id}
                </code>
              </div>

              {/* Abstract */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Abstract</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {article.abstract ? (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {article.abstract}
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No abstract available for this article.
                    </p>
                  )}
                </div>
              </div>

              {/* Citations */}
              {article.citation_count !== undefined && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Citations</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Cited by {article.citation_count} publications
                  </div>
                </div>
              )}

              {/* Additional metadata if available */}
              {article.source_metadata && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {article.extracted_features && (
                      <div className="mt-2">
                        <span className="font-medium">Extracted Features: </span>
                        <span className="text-xs">
                          {Object.keys(article.extracted_features).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Analysis</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMessage("What is the main research question?")}
                    className="text-xs"
                  >
                    Research Question
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMessage("What methodology was used?")}
                    className="text-xs"
                  >
                    Methodology
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMessage("What are the key findings?")}
                    className="text-xs"
                  >
                    Key Findings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMessage("What are the limitations?")}
                    className="text-xs"
                  >
                    Limitations
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMessage("How does this relate to other research?")}
                    className="text-xs"
                  >
                    Related Research
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}