# Lab Component Generate Answer Design Specification

## Overview

This document outlines the design for a new endpoint in the Lab component that implements an iterative answer generation system using the format: `generate_answer(instruct, resp_format, eval_crit, iter_max)`.

## Core Concept

The endpoint enables iterative refinement of AI-generated answers based on:
1. **Instruction** (`instruct`) - The question or task to complete
2. **Response Format** (`resp_format`) - The desired structure/format of the answer
3. **Evaluation Criteria** (`eval_crit`) - Criteria to evaluate if the answer is satisfactory
4. **Maximum Iterations** (`iter_max`) - Maximum number of refinement attempts
5. **Score Threshold** - Minimum score (0.0-1.0) to accept an answer

## Process Flow

The system follows a clear three-step iterative process:

1. **Generation Step**: Send the instruction and response format to the LLM to generate an answer (without evaluation)
2. **Evaluation Step**: Send the generated answer and evaluation criteria to the LLM for scoring and feedback
3. **Decision Step**: 
   - If score >= threshold: Accept the answer
   - If score < threshold AND iterations < iter_max: Return to step 1 with feedback
   - If iterations = iter_max: Return the best answer so far

## Architecture Analysis

### Existing Components We Can Leverage

1. **BasePromptCaller Pattern**
   - Already provides structured prompt calling with response models
   - Handles JSON schema validation
   - Includes logging and error handling
   - Can be extended for our iterative use case

2. **LLM Service**
   - Supports multiple providers (OpenAI, Anthropic)
   - Has chat completion methods we can use
   - Handles streaming and non-streaming responses

3. **Prompt Patterns**
   - Existing prompts show how to structure complex interactions
   - Mission and Hop prompts demonstrate multi-step reasoning
   - Newsletter extraction shows evaluation patterns

## Proposed Implementation

### 1. Separate Prompt Callers for Generation and Evaluation

```python
# Generation Prompt Caller
class AnswerResponse(BaseModel):
    """Response from answer generation"""
    answer: str = Field(description="The generated answer")

class AnswerGeneratorPromptCaller(BasePromptCaller):
    """Prompt caller for answer generation only"""
    
    def __init__(self):
        system_message = """You are an expert AI assistant that generates high-quality answers.
        
Focus on creating the best possible answer that follows the specified format requirements.
If you receive feedback from previous attempts, incorporate those improvements."""
        
        super().__init__(
            response_model=AnswerResponse,
            system_message=system_message
        )

# Evaluation Prompt Caller
class EvaluationResponse(BaseModel):
    """Response from answer evaluation"""
    score: float = Field(description="Score from 0.0 to 1.0 indicating how well the answer meets criteria")
    meets_criteria: bool = Field(description="Whether the answer meets the evaluation criteria")
    evaluation_reasoning: str = Field(description="Detailed explanation of the evaluation")
    improvement_suggestions: List[str] = Field(
        default_factory=list,
        description="Specific suggestions for improvement if criteria not fully met"
    )

class AnswerEvaluatorPromptCaller(BasePromptCaller):
    """Prompt caller for answer evaluation only"""
    
    def __init__(self):
        system_message = """You are an expert evaluator assessing whether answers meet specified criteria.
        
Your task is to:
1. Carefully analyze the provided answer against the evaluation criteria
2. Provide a score from 0.0 to 1.0 (where 1.0 means fully meets all criteria)
3. Explain your reasoning in detail
4. If the score is below 1.0, provide specific, actionable improvement suggestions"""
        
        super().__init__(
            response_model=EvaluationResponse,
            system_message=system_message
        )
```

### 2. Service Layer: `IterativeAnswerService`

```python
class IterationData(BaseModel):
    """Data for each iteration"""
    answer: str
    evaluation: EvaluationResponse
    iteration_number: int

class IterativeAnswerService:
    def __init__(self, score_threshold: float = 0.8):
        self.generator = AnswerGeneratorPromptCaller()
        self.evaluator = AnswerEvaluatorPromptCaller()
        self.score_threshold = score_threshold
        
    async def generate_answer(
        self,
        instruct: str,
        resp_format: str,
        eval_crit: str,
        iter_max: int = 3,
        model: str = "gpt-4o",
        score_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generate an answer iteratively until it meets criteria or max iterations reached
        
        Process:
        1. Generate answer based on instruction and format
        2. Evaluate answer against criteria
        3. If score >= threshold, accept; otherwise iterate with feedback
        
        Returns:
            {
                "final_answer": str,
                "iterations": List[IterationData],
                "success": bool,
                "total_iterations": int,
                "final_score": float
            }
        """
        threshold = score_threshold or self.score_threshold
        iterations = []
        feedback = None
        
        for i in range(iter_max):
            # Step 1: Generate answer
            generation_messages = self._build_generation_messages(
                instruct, 
                resp_format,
                feedback=feedback
            )
            
            answer_response = await self.generator.invoke(
                messages=generation_messages,
                instruction=instruct,
                response_format=resp_format
            )
            
            # Step 2: Evaluate answer
            evaluation_messages = self._build_evaluation_messages(
                answer_response.answer,
                eval_crit
            )
            
            eval_response = await self.evaluator.invoke(
                messages=evaluation_messages,
                answer=answer_response.answer,
                evaluation_criteria=eval_crit
            )
            
            # Store iteration data
            iteration = IterationData(
                answer=answer_response.answer,
                evaluation=eval_response,
                iteration_number=i + 1
            )
            iterations.append(iteration)
            
            # Step 3: Check if we should accept or continue
            if eval_response.score >= threshold:
                return {
                    "final_answer": answer_response.answer,
                    "iterations": iterations,
                    "success": True,
                    "total_iterations": i + 1,
                    "final_score": eval_response.score
                }
            
            # Prepare feedback for next iteration
            feedback = self._prepare_feedback(eval_response)
        
        # Max iterations reached - return best answer
        best_iteration = max(iterations, key=lambda x: x.evaluation.score)
        return {
            "final_answer": best_iteration.answer,
            "iterations": iterations,
            "success": False,
            "total_iterations": iter_max,
            "final_score": best_iteration.evaluation.score
        }
    
    def _build_generation_messages(
        self, 
        instruct: str, 
        resp_format: str,
        feedback: Optional[str] = None
    ) -> List[ChatMessage]:
        """Build messages for answer generation"""
        messages = []
        
        # Main instruction
        user_content = f"""Instruction: {instruct}

Response Format: {resp_format}"""
        
        # Add feedback if this is a retry
        if feedback:
            user_content += f"\n\nPrevious Attempt Feedback:\n{feedback}"
        
        messages.append(ChatMessage(role="user", content=user_content))
        return messages
    
    def _build_evaluation_messages(
        self,
        answer: str,
        eval_crit: str
    ) -> List[ChatMessage]:
        """Build messages for answer evaluation"""
        user_content = f"""Please evaluate the following answer against the specified criteria.

Answer to Evaluate:
{answer}

Evaluation Criteria:
{eval_crit}

Provide a score from 0.0 to 1.0 and detailed feedback."""
        
        return [ChatMessage(role="user", content=user_content)]
    
    def _prepare_feedback(self, eval_response: EvaluationResponse) -> str:
        """Prepare feedback for the next generation attempt"""
        feedback = f"Score: {eval_response.score}\n"
        feedback += f"Evaluation: {eval_response.evaluation_reasoning}\n"
        
        if eval_response.improvement_suggestions:
            feedback += "\nImprovement Suggestions:\n"
            for i, suggestion in enumerate(eval_response.improvement_suggestions, 1):
                feedback += f"{i}. {suggestion}\n"
        
        return feedback
```

### 3. API Endpoint

```python
# backend/routers/lab.py
@router.post("/generate-answer")
async def generate_answer(
    request: GenerateAnswerRequest,
    current_user: User = Depends(get_current_user)
) -> GenerateAnswerResponse:
    """
    Generate an answer iteratively based on criteria
    """
    service = IterativeAnswerService()
    
    result = await service.generate_answer(
        instruct=request.instruct,
        resp_format=request.resp_format,
        eval_crit=request.eval_crit,
        iter_max=request.iter_max
    )
    
    return GenerateAnswerResponse(**result)
```

### 4. Request/Response Models

```python
# backend/schemas/lab.py
class GenerateAnswerRequest(BaseModel):
    instruct: str = Field(..., description="The question or instruction")
    resp_format: str = Field(..., description="Desired response format")
    eval_crit: str = Field(..., description="Evaluation criteria")
    iter_max: int = Field(default=3, ge=1, le=10, description="Max iterations")
    score_threshold: float = Field(default=0.8, ge=0.0, le=1.0, description="Minimum score to accept answer")
    model: Optional[str] = Field(default="gpt-4o", description="LLM model to use")

class GenerateAnswerResponse(BaseModel):
    final_answer: str
    iterations: List[IterationData]
    success: bool
    total_iterations: int
    final_score: float
    metadata: Optional[Dict[str, Any]] = None
```

## Alternative Approaches

### Approach 1: Using Existing Chat Completion (Simpler)

Instead of creating a new prompt caller, we could use the LLM service directly:

```python
async def generate_answer_simple(
    self,
    instruct: str,
    resp_format: str,
    eval_crit: str,
    iter_max: int = 3
) -> Dict[str, Any]:
    llm_service = LLMService()
    
    system_prompt = f"""Generate an answer following these requirements:
    Format: {resp_format}
    Evaluation Criteria: {eval_crit}
    
    After generating, evaluate if it meets the criteria."""
    
    messages = [{"role": "user", "content": instruct}]
    
    for i in range(iter_max):
        response = await llm_service.create_chat_completion(
            messages=messages,
            system=system_prompt
        )
        
        # Parse response to check if criteria met
        # Add to messages for next iteration if needed
        # ...
```

### Approach 2: Reusing Mission/Hop Pattern

We could model this as a simplified mission with evaluation hops:

```python
# Create a mission with:
# - Goal: Generate answer meeting criteria
# - Input: instruction
# - Output: formatted answer
# - Hops: Generate → Evaluate → Refine (repeat)
```

## Frontend Integration

### Lab Component Updates

```typescript
// frontend/src/pages/Lab.tsx additions
interface GenerateAnswerParams {
    instruct: string;
    resp_format: string;
    eval_crit: string;
    iter_max: number;
}

const [generateParams, setGenerateParams] = useState<GenerateAnswerParams>({
    instruct: '',
    resp_format: '',
    eval_crit: '',
    iter_max: 3
});

const handleGenerateAnswer = async () => {
    const response = await labApi.generateAnswer(generateParams);
    // Display results with iteration history
};
```

## Key Design Decisions

1. **Separation of Concerns**: Generation and evaluation are completely separate steps with distinct prompt callers
2. **Score-Based Decisions**: Using numeric scores (0.0-1.0) with configurable thresholds provides clear accept/reject logic
3. **Feedback Loop**: Failed attempts receive specific feedback for improvement in the next iteration
4. **Best Answer Selection**: If max iterations reached, return the highest-scoring answer rather than the last one
5. **Iteration History**: Full history preserved for analysis and debugging
6. **Flexible Criteria**: Text-based criteria allow for any evaluation type

## Benefits of This Design

1. **Leverages Existing Infrastructure**: Uses BasePromptCaller and LLM services
2. **Type Safety**: Pydantic models ensure structured responses
3. **Extensibility**: Easy to add features like:
   - Different evaluation strategies
   - Parallel generation attempts
   - Custom prompt templates
   - Caching of successful patterns
4. **Observability**: Full iteration history for debugging
5. **Flexibility**: Works with any instruction/format/criteria combination

## Example Usage

```python
result = await generate_answer(
    instruct="Explain quantum computing",
    resp_format="A 3-paragraph explanation suitable for high school students",
    eval_crit="Must use analogies, avoid jargon, and include a practical example",
    iter_max=5,
    score_threshold=0.85
)

# Result includes:
# - final_answer: The best answer generated
# - iterations: History of all attempts with evaluations
# - success: Whether score threshold was met
# - total_iterations: How many iterations were used
# - final_score: The score of the final answer

# Example iteration data:
# iteration[0] = {
#     "answer": "Quantum computing is like...",
#     "evaluation": {
#         "score": 0.7,
#         "meets_criteria": False,
#         "evaluation_reasoning": "Good use of analogies but lacks practical example",
#         "improvement_suggestions": ["Add a real-world application example", "Simplify technical terms"]
#     },
#     "iteration_number": 1
# }
```

## Implementation Priority

1. **Phase 1**: Basic implementation with IterativeAnswerPromptCaller
2. **Phase 2**: Add caching and optimization
3. **Phase 3**: Enhanced UI with iteration visualization
4. **Phase 4**: Advanced features (parallel attempts, custom templates)

## Testing Strategy

1. **Unit Tests**: Test prompt caller with mock responses
2. **Integration Tests**: Test full iteration flow
3. **Evaluation Tests**: Verify criteria assessment accuracy
4. **Performance Tests**: Measure iteration efficiency 