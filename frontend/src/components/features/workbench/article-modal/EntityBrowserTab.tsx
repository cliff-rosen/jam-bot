import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Network,
  Circle,
  ArrowRight,
  Zap,
  AlertCircle,
  Brain,
  Database,
  Loader2,
  RefreshCw
} from 'lucide-react';

import { CanonicalResearchArticle } from '@/types/canonical_types';
import { workbenchApi } from '@/lib/api/workbenchApi';
import {
  EntityRelationshipAnalysis,
  EntityType,
  RelationshipType
} from '@/types/entity-extraction';
import { EntityKnowledgeGraph } from './EntityKnowledgeGraph';

interface EntityBrowserTabProps {
  article: CanonicalResearchArticle;
  groupId?: string;
}

export function EntityBrowserTab({ article, groupId: _groupId }: EntityBrowserTabProps) {
  const [analysis, setAnalysis] = useState<EntityRelationshipAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [archetype, setArchetype] = useState<{ archetype: string; study_type?: string } | null>(null);
  const { toast } = useToast();

  const extractEntities = async (_forceRefresh = false) => {
    if (!article.abstract) {
      toast({
        title: 'No Content Available',
        description: 'Entity extraction requires article abstract or full text.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Stage 1: extract study archetype (plain NL)
      const archRes = await workbenchApi.extractArticleArchtype({
        article_id: article.id,
        title: article.title,
        abstract: article.abstract || ''
      });

      setArchetype({ archetype: archRes.archetype, study_type: archRes.study_type });

      // Stage 2: convert archetype to ER graph
      const graphRes = await workbenchApi.archetypeToErGraph({
        article_id: article.id,
        archetype: archRes.archetype,
        study_type: archRes.study_type
      });

      setAnalysis(graphRes.analysis);

      toast({
        title: 'Entity Graph Generated',
        description: `Archetype detected and converted to graph with ${graphRes.analysis.entities.length} entities and ${graphRes.analysis.relationships.length} relationships.`
      });
    } catch (err) {
      console.error('Entity extraction failed:', err);
      toast({
        title: 'Extraction Failed',
        description: err instanceof Error ? err.message : 'Failed to extract entities',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-extract on load if we have content
    if (article.abstract) {
      extractEntities();
    }
  }, [article.id]);

  const getEntityTypeColor = (type: EntityType): string => {
    const colors = {
      medical_condition: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      biological_factor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      intervention: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      patient_characteristic: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      psychological_factor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      outcome: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      gene: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      protein: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      pathway: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      drug: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      environmental_factor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      animal_model: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
      exposure: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    } as const;
    return colors[type] ?? colors.other;
  };

  const getRelationshipTypeIcon = (type: RelationshipType) => {
    const icons = {
      causal: <Zap className="w-3 h-3" />,
      therapeutic: <Brain className="w-3 h-3" />,
      associative: <Network className="w-3 h-3" />,
      temporal: <ArrowRight className="w-3 h-3" />,
      inhibitory: <AlertCircle className="w-3 h-3" />,
      regulatory: <Database className="w-3 h-3" />,
      interactive: <Network className="w-3 h-3" />,
      paradoxical: <AlertCircle className="w-3 h-3" />,
      correlative: <Network className="w-3 h-3" />,
      predictive: <Network className="w-3 h-3" />
    } as const;
    return icons[type] ?? <Circle className="w-3 h-3" />;
  };

  const getRelationshipColor = (type: RelationshipType): string => {
    const colors = {
      causal: 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20',
      therapeutic: 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20',
      associative: 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20',
      temporal: 'border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20',
      inhibitory: 'border-purple-300 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20',
      regulatory: 'border-cyan-300 bg-cyan-50 dark:border-cyan-600 dark:bg-cyan-900/20',
      interactive: 'border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20',
      paradoxical: 'border-orange-300 bg-orange-50 dark:border-orange-600 dark:bg-orange-900/20',
      correlative: 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/20',
      predictive: 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
    } as const;
    return colors[type] ?? 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/20';
  };

  if (!article.abstract) {
    return (
      <div className="text-center py-8">
        <Network className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Content Available</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Entity extraction requires article abstract or full text.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with extract button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Study Archetype Analysis</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI-powered two-stage: detect study archetype, then generate an entity-relationship graph
          </p>
        </div>
        <Button
          onClick={() => extractEntities(true)}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {analysis ? 'Regenerate' : 'Generate'}
            </>
          )}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing entities and relationships...
          </div>
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        </div>
      )}


      {/* Results */}
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Detected Archetype */}
          {archetype?.archetype && (
            <Card className="p-4 bg-white dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Detected Archetype</div>
                  <p className="text-sm text-gray-800 dark:text-gray-100">
                    {archetype.archetype}
                  </p>
                </div>
                {archetype.study_type && (
                  <Badge variant="secondary" className="self-start">{archetype.study_type}</Badge>
                )}
              </div>
            </Card>
          )}

          {/* Summary */}
          <Card className="p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analysis.entity_count || analysis.entities.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Entities</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analysis.relationship_count || analysis.relationships.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Relationships</div>
              </div>
              <div>
                <Badge variant={analysis.pattern_complexity === 'COMPLEX' ? 'destructive' : 'default'}>
                  {analysis.pattern_complexity}
                </Badge>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complexity</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {new Set(analysis.entities.map(e => e.type)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Entity Types</div>
              </div>
            </div>
          </Card>

          {/* Tabs for different views */}
          <Tabs defaultValue="graph" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="graph">Graph View</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="graph" className="mt-4">
              <EntityKnowledgeGraph analysis={analysis} />
            </TabsContent>

            <TabsContent value="entities" className="space-y-3">
              <div className="grid gap-3">
                {analysis.entities.map((entity) => (
                  <Card key={entity.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {entity.name}
                          </h4>
                          <Badge className={getEntityTypeColor(entity.type)}>
                            {entity.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {entity.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {entity.description}
                          </p>
                        )}
                        {entity.mentions && entity.mentions.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Mentions:</div>
                            {entity.mentions.slice(0, 2).map((mention, idx) => (
                              <div key={idx} className="text-xs bg-gray-100 dark:bg-gray-600 p-2 rounded">
                                "{mention}"
                              </div>
                            ))}
                            {entity.mentions.length > 2 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                +{entity.mentions.length - 2} more mentions
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="relationships" className="space-y-3">
              <div className="grid gap-3">
                {analysis.relationships.map((relationship, idx) => {
                  const sourceEntity = analysis.entities.find(e => e.id === relationship.source_entity_id);
                  const targetEntity = analysis.entities.find(e => e.id === relationship.target_entity_id);

                  return (
                    <Card key={idx} className={`p-4 border-l-4 ${getRelationshipColor(relationship.type)}`}>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {getRelationshipTypeIcon(relationship.type)}
                          <Badge variant="outline" className="text-xs">
                            {relationship.type}
                          </Badge>
                          {relationship.strength && (
                            <Badge
                              variant={relationship.strength === 'strong' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {relationship.strength}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {sourceEntity?.name || relationship.source_entity_id}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {targetEntity?.name || relationship.target_entity_id}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {relationship.description}
                        </p>

                        {relationship.evidence && (
                          <div className="text-xs bg-gray-100 dark:bg-gray-600 p-2 rounded">
                            <strong>Evidence:</strong> {relationship.evidence}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {analysis.complexity_justification && (
                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Complexity Analysis
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {analysis.complexity_justification}
                  </p>
                </Card>
              )}

              {analysis.clinical_significance && (
                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Clinical Significance
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {analysis.clinical_significance}
                  </p>
                </Card>
              )}

              {analysis.key_findings && analysis.key_findings.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Key Findings
                  </h4>
                  <ul className="space-y-2">
                    {analysis.key_findings.map((finding, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                        <Circle className="w-2 h-2 mt-2 flex-shrink-0" />
                        {finding}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}