# Example Workflow: Research and Answer Generation

This example demonstrates how to use the Fractal Bot tools to create a research and answer generation workflow.

## Workflow Overview

The workflow processes a user's question through several stages:
1. Question improvement and requirement analysis
2. Research and information gathering
3. Knowledge base management
4. Answer generation and validation

## Workflow Definition

```typescript
interface ResearchWorkflow {
  name: "research_and_answer";
  description: "A workflow for researching and answering complex questions";
  stages: [
    {
      name: "Question Processing",
      steps: [
        {
          name: "Improve Question",
          tool: "question_improvement",
          inputs: {
            question: "{{mission.question}}"
          }
        },
        {
          name: "Generate Requirements",
          tool: "checklist_generator",
          inputs: {
            question: "{{steps.improve_question.outputs.improved_question}}"
          }
        }
      ]
    },
    {
      name: "Research",
      steps: [
        {
          name: "Generate Search Query",
          tool: "query_generator",
          inputs: {
            question: "{{steps.improve_question.outputs.improved_question}}",
            checklist: "{{steps.generate_requirements.outputs.checklist}}"
          }
        },
        {
          name: "Perform Search",
          tool: "search",
          inputs: {
            query: "{{steps.generate_search_query.outputs.query}}",
            max_results: 10
          }
        },
        {
          name: "Analyze URLs",
          tool: "url_analyzer",
          inputs: {
            question: "{{steps.improve_question.outputs.improved_question}}",
            search_results: "{{steps.perform_search.outputs.results}}"
          }
        },
        {
          name: "Scrape Content",
          tool: "content_scraper",
          inputs: {
            urls: "{{steps.analyze_urls.outputs.urls}}"
          }
        }
      ]
    },
    {
      name: "Knowledge Management",
      steps: [
        {
          name: "Update Knowledge Base",
          tool: "knowledge_base_update",
          inputs: {
            question: "{{steps.improve_question.outputs.improved_question}}",
            current_kb: "{{mission.knowledge_base}}",
            new_information: "{{steps.scrape_content.outputs.scraped_content}}"
          }
        }
      ]
    },
    {
      name: "Answer Generation",
      steps: [
        {
          name: "Generate Answer",
          tool: "answer_generator",
          inputs: {
            question: "{{steps.improve_question.outputs.improved_question}}",
            checklist: "{{steps.generate_requirements.outputs.checklist}}",
            knowledge_base: "{{steps.update_knowledge_base.outputs.updated_kb}}"
          }
        },
        {
          name: "Score Answer",
          tool: "answer_scorer",
          inputs: {
            question: "{{steps.improve_question.outputs.improved_question}}",
            answer: "{{steps.generate_answer.outputs.answer}}",
            checklist: "{{steps.generate_requirements.outputs.checklist}}"
          }
        }
      ]
    }
  ]
}
```

## Example Usage

Here's how this workflow would process a sample question:

```typescript
const mission = {
  question: "What are the environmental impacts of electric vehicles compared to traditional cars?",
  knowledge_base: [] // Initially empty
};

// The workflow would:
// 1. Improve the question to be more specific and clear
// 2. Generate a checklist of requirements for a comprehensive answer
// 3. Generate search queries based on the improved question
// 4. Search for relevant information
// 5. Analyze and scrape content from the most relevant sources
// 6. Update the knowledge base with new information
// 7. Generate a comprehensive answer
// 8. Score the answer against the requirements

// The final output would include:
const output = {
  improved_question: "What are the environmental impacts of electric vehicles compared to traditional internal combustion engine vehicles, considering factors such as manufacturing, operation, and end-of-life disposal?",
  checklist: [
    {
      item_to_score: "Addresses manufacturing environmental impact",
      current_score: 0.9,
      explanation: "Comprehensive coverage of manufacturing processes"
    },
    {
      item_to_score: "Addresses operational environmental impact",
      current_score: 0.95,
      explanation: "Detailed analysis of operational emissions and energy use"
    },
    // ... more checklist items
  ],
  answer: "# Environmental Impact Comparison: Electric vs. Traditional Vehicles\n\n## Manufacturing Impact\n...\n## Operational Impact\n...\n## End-of-Life Impact\n...",
  final_score: 0.92
};
```

## Workflow Benefits

1. **Structured Processing**: Each stage has a clear purpose and output
2. **Quality Control**: The checklist ensures comprehensive coverage
3. **Knowledge Management**: Information is organized and maintained
4. **Validation**: Answer scoring ensures quality
5. **Flexibility**: Tools can be reconfigured or replaced as needed

## Implementation Notes

- Each tool can be configured with different models
- Error handling should be implemented at each step
- The workflow can be extended with additional tools
- State management is handled through the knowledge base
- The workflow can be parallelized where possible 