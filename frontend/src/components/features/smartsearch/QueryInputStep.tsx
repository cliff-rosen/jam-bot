import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';

interface QueryInputStepProps {
  question: string;
  setQuestion: (question: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function QueryInputStep({ question, setQuestion, onSubmit, loading }: QueryInputStepProps) {
  return (
    <Card className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Enter Your Research Question
      </h2>
      <div className="space-y-4">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., What are the effects of CRISPR gene editing on cancer treatment outcomes?"
          rows={4}
          className="dark:bg-gray-700 dark:text-gray-100"
        />
        <Button
          onClick={onSubmit}
          disabled={loading || !question.trim()}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {loading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Refining...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Refine & Generate Keywords
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}