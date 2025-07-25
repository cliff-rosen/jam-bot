"""Article Chat Router - Stateless chat for article discussions"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
import os
import logging

from models import User
from services.auth_service import validate_token
from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/article-chat", tags=["article-chat"])

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class ArticleContext(BaseModel):
    """Context about the article being discussed"""
    id: str
    title: str
    authors: list[str] = Field(default_factory=list)
    abstract: Optional[str] = None
    journal: Optional[str] = None
    publication_year: Optional[int] = None
    doi: Optional[str] = None
    extracted_features: Dict[str, Any] = Field(default_factory=dict)
    source: str  # 'pubmed' or 'scholar'

class ArticleChatRequest(BaseModel):
    """Request for article chat"""
    message: str
    article_context: ArticleContext
    conversation_history: list[Dict[str, str]] = Field(
        default_factory=list,
        description="Previous messages in format [{'role': 'user'|'assistant', 'content': '...'}]"
    )

class ArticleChatResponse(BaseModel):
    """Response from article chat"""
    response: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

@router.post("/chat", response_model=ArticleChatResponse)
async def chat_about_article(
    request: ArticleChatRequest,
    current_user: User = Depends(validate_token)
) -> ArticleChatResponse:
    """
    Stateless chat endpoint for article discussions.
    No database persistence - frontend manages conversation history.
    """
    try:
        # Build the system prompt
        system_prompt = f"""You are an expert research analyst specializing in academic literature analysis. 
You are discussing the following research article:

Title: {request.article_context.title}
Authors: {', '.join(request.article_context.authors)}
Journal: {request.article_context.journal or 'Not specified'}
Year: {request.article_context.publication_year or 'Not specified'}
DOI: {request.article_context.doi or 'Not specified'}

Abstract:
{request.article_context.abstract or 'No abstract available'}

Extracted Features:
{format_features(request.article_context.extracted_features)}

Your role is to:
1. Answer questions about this specific article accurately
2. Explain complex concepts in accessible language
3. Reference specific parts of the article when relevant
4. Be honest about what information is available vs. not available
5. Suggest follow-up questions or areas for deeper exploration

Keep your responses focused on this article and its content."""

        # Build messages for OpenAI
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (last 10 messages for context)
        for msg in request.conversation_history[-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": request.message
        })
        
        # Call OpenAI
        response = await client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            temperature=0.7,
            max_tokens=1500
        )
        
        assistant_response = response.choices[0].message.content
        
        return ArticleChatResponse(
            response=assistant_response,
            metadata={
                "article_id": request.article_context.id,
                "model": "gpt-4-turbo-preview",
                "token_usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error in article chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )

def format_features(features: Dict[str, Any]) -> str:
    """Format extracted features for the prompt"""
    if not features:
        return "No extracted features available"
    
    formatted = []
    for key, value in features.items():
        # Convert snake_case to Title Case
        formatted_key = key.replace('_', ' ').title()
        formatted.append(f"- {formatted_key}: {value}")
    
    return "\n".join(formatted)