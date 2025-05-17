# Workflow Sample Data Structures

## Example Journey: Client Feedback Analysis

This document provides concrete examples of data structures and state transitions for a sample journey analyzing client feedback.

### 1. Journey Card Data

```typescript
{
  id: "j_2024_03_15_001",
  title: "Q1 Client Feedback Analysis",
  goal: "Analyze customer feedback from Q1 2024 to identify key themes and sentiment",
  status: "AWAITING_JOURNEY", // Initial state
  creator: "Sarah Chen",
  createdAt: "2024-03-15T10:30:00Z",
  updatedAt: "2024-03-15T10:30:00Z",
  tags: ["feedback", "analysis", "quarterly-review"],
  deliverableType: "report",
  progress: {
    currentStep: 0,
    totalSteps: 0,
    completedSteps: 0
  }
}
```

### 2. Workflow Definition

```typescript
{
  id: "wf_2024_03_15_001",
  journeyId: "j_2024_03_15_001",
  status: "PROPOSED",
  steps: [
    {
      id: "step_001",
      label: "Email Collection",
      description: "Search and collect client emails from Q1 2024",
      type: "ACTION",
      tool: {
        id: "email_search",
        config: {
          dateRange: "2024-01-01/2024-03-31",
          searchTerms: ["feedback", "review", "opinion"]
        }
      }
    },
    {
      id: "step_002",
      label: "Feedback Extraction",
      description: "Extract feedback points from collected emails",
      type: "ACTION",
      tool: {
        id: "feedback_extractor",
        config: {
          format: "structured_json",
          fields: ["sentiment", "topic", "urgency"]
        }
      }
    },
    {
      id: "step_003",
      label: "Theme Analysis",
      description: "Identify common themes and patterns",
      type: "ACTION",
      tool: {
        id: "theme_analyzer",
        config: {
          minThemeFrequency: 3,
          maxThemes: 10
        }
      }
    },
    {
      id: "step_004",
      label: "Quality Check",
      description: "Evaluate analysis quality and coverage",
      type: "EVALUATION",
      evaluationConfig: {
        conditions: [
          {
            id: "cond_001",
            variable: "coverage_score",
            operator: "less_than",
            value: 0.8,
            targetStepIndex: 2  // Jump back to Theme Analysis
          }
        ],
        defaultAction: "continue",
        maximumJumps: 3
      }
    },
    {
      id: "step_005",
      label: "Report Generation",
      description: "Create final analysis report",
      type: "ACTION",
      tool: {
        id: "report_generator",
        config: {
          template: "quarterly_feedback",
          format: "pdf"
        }
      }
    }
  ]
}
```

### 3. Asset Examples

```typescript
// After Step 1
{
  id: "asset_001",
  type: "dataset",
  label: "Q1 Client Emails",
  metadata: {
    emailCount: 145,
    dateRange: "2024-01-01/2024-03-31",
    source: "email_search"
  },
  content: {
    type: "json",
    location: "/assets/j_2024_03_15_001/email_dataset.json"
  },
  stepId: "step_001",
  version: 1
}

// After Step 2
{
  id: "asset_002",
  type: "structured_data",
  label: "Extracted Feedback Points",
  metadata: {
    pointCount: 213,
    categories: ["product", "service", "pricing"]
  },
  content: {
    type: "json",
    location: "/assets/j_2024_03_15_001/feedback_points.json"
  },
  stepId: "step_002",
  version: 1
}

// Final Report
{
  id: "asset_003",
  type: "report",
  label: "Q1 2024 Client Feedback Analysis",
  metadata: {
    pageCount: 15,
    sections: ["executive_summary", "themes", "recommendations"]
  },
  content: {
    type: "pdf",
    location: "/assets/j_2024_03_15_001/q1_analysis.pdf"
  },
  stepId: "step_005",
  version: 1
}
```

### 4. Chat Message Examples

```typescript
[
  {
    id: "msg_001",
    role: "user",
    content: "I need to analyze our client feedback from Q1 2024",
    timestamp: "2024-03-15T10:30:00Z",
    metadata: {
      type: "goal",
      phase: "journey_creation"
    }
  },
  {
    id: "msg_002",
    role: "assistant",
    content: "I'll help you analyze the Q1 client feedback. I've created a journey card for this analysis - you can review it in the task area.",
    timestamp: "2024-03-15T10:30:05Z",
    metadata: {
      type: "journey_proposal",
      journeyId: "j_2024_03_15_001"
    }
  },
  {
    id: "msg_003",
    role: "system",
    content: "Journey card accepted",
    timestamp: "2024-03-15T10:30:15Z",
    metadata: {
      type: "state_change",
      newState: "AWAITING_WORKFLOW_DESIGN"
    }
  }
]
```

### 5. Current Task States

```typescript
// During Step 1 Execution
{
  stepId: "step_001",
  status: "RUNNING",
  tool: {
    id: "email_search",
    status: "active",
    progress: 0.65,
    message: "Scanning email archives..."
  },
  input: {
    dateRange: "2024-01-01/2024-03-31",
    searchTerms: ["feedback", "review", "opinion"]
  }
}

// After Step 1 Completion (Before Acceptance)
{
  stepId: "step_001",
  status: "PENDING_ACCEPTANCE",
  tool: {
    id: "email_search",
    status: "complete",
    progress: 1.0,
    message: "Email collection complete"
  },
  output: {
    type: "dataset",
    preview: {
      totalEmails: 145,
      matchedTerms: {
        feedback: 89,
        review: 45,
        opinion: 31
      }
    }
  },
  acceptanceRequired: true
}
```

## Layout Recommendations

1. **Top Bar**
   - Journey card (when active)
   - Current state indicator
   - Progress bar

2. **Left Sidebar**
   - Workflow steps list
   - Step status indicators
   - Navigation controls

3. **Main Content Area**
   - Current task details
   - Tool interface
   - Results preview
   - Accept/Reject controls

4. **Right Sidebar**
   - Assets panel
   - Chat interface
   - Context help

5. **Bottom Bar**
   - Step navigation
   - Action buttons
   - Status messages

This layout ensures all components are easily accessible while maintaining a clear focus on the current task. 