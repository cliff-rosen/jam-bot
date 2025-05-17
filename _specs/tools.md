# Fractal Bot Tools Specification

This document outlines the core tools available in the Fractal Bot system, modeled after the RAVE (Research, Analyze, Verify, Explain) agent's capabilities.

## Core Tools

### 1. Question Improvement Tool
Improves and clarifies user questions for better processing.

```typescript
interface QuestionImprovementTool {
  name: "question_improvement";
  description: "Improves and clarifies user questions for better processing";
  inputs: {
    question: {
      type: "string";
      description: "The original user question";
      required: true;
    }
  };
  outputs: {
    improved_question: {
      type: "string";
      description: "The improved and clarified question";
    }
  };
}
```

### 2. Checklist Generator Tool
Generates a checklist of requirements for a well-formed answer.

```typescript
interface ChecklistGeneratorTool {
  name: "checklist_generator";
  description: "Generates a checklist of requirements for a well-formed answer";
  inputs: {
    question: {
      type: "string";
      description: "The question to generate requirements for";
      required: true;
    }
  };
  outputs: {
    checklist: {
      type: "array";
      items: {
        type: "object";
        properties: {
          item_to_score: string;
          current_score: number;
          explanation: string;
        };
      };
      description: "List of requirements with scores";
    }
  };
}
```

### 3. Query Generator Tool
Generates search queries based on the question and checklist.

```typescript
interface QueryGeneratorTool {
  name: "query_generator";
  description: "Generates search queries based on the question and checklist";
  inputs: {
    question: {
      type: "string";
      description: "The question to generate queries for";
      required: true;
    };
    checklist: {
      type: "array";
      description: "The checklist of requirements";
      required: true;
    };
    query_history: {
      type: "array";
      items: string;
      description: "Previous search queries";
      required: false;
    }
  };
  outputs: {
    query: {
      type: "string";
      description: "The generated search query";
    }
  };
}
```

### 4. Search Tool
Performs web searches using the generated query.

```typescript
interface SearchTool {
  name: "search";
  description: "Performs web searches using the generated query";
  inputs: {
    query: {
      type: "string";
      description: "The search query";
      required: true;
    };
    max_results: {
      type: "number";
      description: "Maximum number of results to return";
      required: false;
    }
  };
  outputs: {
    results: {
      type: "array";
      items: {
        type: "object";
        properties: {
          title: string;
          link: string;
          snippet: string;
          content: string;
        };
      };
      description: "Search results";
    }
  };
}
```

### 5. URL Analyzer Tool
Analyzes search results to identify the most relevant URLs.

```typescript
interface URLAnalyzerTool {
  name: "url_analyzer";
  description: "Analyzes search results to identify the most relevant URLs";
  inputs: {
    question: {
      type: "string";
      description: "The original question";
      required: true;
    };
    search_results: {
      type: "array";
      description: "The search results to analyze";
      required: true;
    }
  };
  outputs: {
    urls: {
      type: "array";
      items: {
        type: "object";
        properties: {
          url: string;
          relevance_score: number;
          explanation: string;
        };
      };
      description: "Analyzed URLs with relevance scores";
    }
  };
}
```

### 6. Content Scraper Tool
Scrapes content from selected URLs.

```typescript
interface ContentScraperTool {
  name: "content_scraper";
  description: "Scrapes content from selected URLs";
  inputs: {
    urls: {
      type: "array";
      items: string;
      description: "URLs to scrape";
      required: true;
    }
  };
  outputs: {
    scraped_content: {
      type: "array";
      items: {
        type: "object";
        properties: {
          url: string;
          content: string;
          metadata: object;
        };
      };
      description: "Scraped content from URLs";
    }
  };
}
```

### 7. Knowledge Base Update Tool
Updates the knowledge base with new information.

```typescript
interface KnowledgeBaseUpdateTool {
  name: "knowledge_base_update";
  description: "Updates the knowledge base with new information";
  inputs: {
    question: {
      type: "string";
      description: "The original question";
      required: true;
    };
    current_kb: {
      type: "array";
      description: "Current knowledge base entries";
      required: true;
    };
    new_information: {
      type: "array";
      description: "New information to incorporate";
      required: true;
    }
  };
  outputs: {
    updated_kb: {
      type: "array";
      items: {
        type: "object";
        properties: {
          nugget_id: string;
          content: string;
          confidence: number;
          conflicts_with: string[];
        };
      };
      description: "Updated knowledge base";
    }
  };
}
```

### 8. Answer Generator Tool
Generates a comprehensive answer based on the knowledge base.

```typescript
interface AnswerGeneratorTool {
  name: "answer_generator";
  description: "Generates a comprehensive answer based on the knowledge base";
  inputs: {
    question: {
      type: "string";
      description: "The original question";
      required: true;
    };
    checklist: {
      type: "array";
      description: "The checklist of requirements";
      required: true;
    };
    knowledge_base: {
      type: "array";
      description: "The knowledge base entries";
      required: true;
    }
  };
  outputs: {
    answer: {
      type: "string";
      description: "The generated answer in markdown format";
    }
  };
}
```

### 9. Answer Scorer Tool
Scores the generated answer against the checklist requirements.

```typescript
interface AnswerScorerTool {
  name: "answer_scorer";
  description: "Scores the generated answer against the checklist requirements";
  inputs: {
    question: {
      type: "string";
      description: "The original question";
      required: true;
    };
    answer: {
      type: "string";
      description: "The generated answer";
      required: true;
    };
    checklist: {
      type: "array";
      description: "The checklist of requirements";
      required: true;
    }
  };
  outputs: {
    scored_checklist: {
      type: "array";
      items: {
        type: "object";
        properties: {
          item_to_score: string;
          current_score: number;
          explanation: string;
        };
      };
      description: "Updated checklist with scores";
    }
  };
}
```

## Tool Categories

Tools are organized into the following categories:

1. **Question Processing**
   - Question Improvement Tool
   - Checklist Generator Tool

2. **Research**
   - Query Generator Tool
   - Search Tool
   - URL Analyzer Tool
   - Content Scraper Tool

3. **Knowledge Management**
   - Knowledge Base Update Tool

4. **Answer Generation**
   - Answer Generator Tool
   - Answer Scorer Tool

## Usage Notes

- Tools can be chained together to form complex workflows
- Each tool has specific input requirements and output formats
- Tools maintain state through the knowledge base
- Error handling and retry mechanisms are built into each tool
- Tools can be configured with different models and parameters 