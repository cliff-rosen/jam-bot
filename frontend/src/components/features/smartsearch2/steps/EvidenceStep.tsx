import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface EvidenceStepProps {
    evidenceSpec: string;
    setEvidenceSpec: (spec: string) => void;
}

export function EvidenceStep({
    evidenceSpec,
    setEvidenceSpec
}: EvidenceStepProps) {
    return (
        <div className="space-y-4">
            <div>
                <Badge variant="outline" className="mb-3">Step 2 of 4</Badge>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Review Evidence Specification
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    The AI has created an evidence specification from your research question. Review and edit it if needed before generating keywords.
                </p>
            </div>

            <div>
                <Label className="text-sm font-medium mb-2 block">
                    Evidence Specification
                </Label>
                <Textarea
                    value={evidenceSpec}
                    onChange={(e) => setEvidenceSpec(e.target.value)}
                    rows={6}
                    className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    placeholder="Evidence specification will appear here..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    This specification describes what documents are needed for your research
                </p>
            </div>
        </div>
    );
}