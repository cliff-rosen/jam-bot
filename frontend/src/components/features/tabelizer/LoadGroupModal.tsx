import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// ScrollArea component not available, using div with overflow
import { 
  Loader2, 
  Search, 
  FolderOpen, 
  Trash2, 
  AlertCircle,
  FileText,
  Hash,
  Calendar
} from 'lucide-react';
import { articleGroupApi, ArticleGroup } from '@/lib/api/articleGroupApi';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface LoadGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (groupId: string) => Promise<void>;
  currentGroupId?: string;
}

export function LoadGroupModal({
  isOpen,
  onClose,
  onLoad,
  currentGroupId
}: LoadGroupModalProps) {
  const [groups, setGroups] = useState<ArticleGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ArticleGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load groups when modal opens
  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
  }, [isOpen]);

  // Filter groups based on search
  useEffect(() => {
    const filtered = groups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (group.search_query && group.search_query.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredGroups(filtered);
  }, [groups, searchTerm]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await articleGroupApi.listGroups(0, 100);
      setGroups(response.groups);
      setFilteredGroups(response.groups);
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your saved groups',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedGroupId) {
      toast({
        title: 'Error',
        description: 'Please select a group to load',
        variant: 'destructive'
      });
      return;
    }

    try {
      await onLoad(selectedGroupId);
      onClose();
    } catch (error) {
      console.error('Load failed:', error);
    }
  };

  const handleDelete = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingGroupId(groupId);
    try {
      await articleGroupApi.deleteGroup(groupId);
      toast({
        title: 'Success',
        description: `Group "${groupName}" deleted successfully`
      });
      // Reload groups
      await loadGroups();
      // Clear selection if deleted group was selected
      if (selectedGroupId === groupId) {
        setSelectedGroupId('');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive'
      });
    } finally {
      setDeletingGroupId(null);
    }
  };

  const getProviderBadge = (provider?: string) => {
    if (!provider) return null;
    const config = provider === 'pubmed' 
      ? { label: 'PubMed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
      : { label: 'Scholar', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Load Article Group</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Select a saved group to load articles and columns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* Groups List */}
          <div className="h-[400px] pr-4 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  {searchTerm ? 'No groups match your search.' : 'You don\'t have any saved groups yet.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedGroupId === group.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${currentGroupId === group.id ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {group.name}
                          </h3>
                          {currentGroupId === group.id && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Current
                            </Badge>
                          )}
                          {getProviderBadge(group.search_provider)}
                        </div>
                        
                        {group.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {group.description}
                          </p>
                        )}

                        {group.search_query && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 mb-2 italic">
                            "{group.search_query}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {group.article_count} articles
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {group.columns.length} columns
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(group.updated_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(group.id, group.name);
                        }}
                        disabled={deletingGroupId === group.id}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        {deletingGroupId === group.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleLoad} 
            disabled={!selectedGroupId || isLoading}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}