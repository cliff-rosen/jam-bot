import logging
from typing import Optional, List, Dict, Union, Literal, Any, AsyncGenerator
from typing_extensions import TypedDict
from config.settings import settings
from .llm.base import LLMProvider
from .llm.anthropic_provider import AnthropicProvider
from .llm.openai_provider import OpenAIProvider
from .llm.model_data import (
    OPENAI_MODELS,
    ANTHROPIC_MODELS,
    DEFAULT_MODELS,
    FAST_MODELS,
    MODEL_ALIASES,
    MODEL_CATEGORIES
)
import traceback

logger = logging.getLogger(__name__)

class MessageContent(TypedDict, total=False):
    """TypedDict for message content that can include text and/or image data"""
    text: str
    image_url: str
    image_data: bytes
    image_mime_type: str

class Message(TypedDict):
    """TypedDict for a complete message including role and content"""
    role: Literal["user", "assistant", "system"]
    content: Union[str, List[MessageContent]]

class LLMRequest(TypedDict, total=False):
    """TypedDict for LLM request parameters"""
    messages: List[Message]
    model: Optional[str]
    max_tokens: Optional[int]
    system: Optional[str]
    temperature: Optional[float]
    stream: Optional[bool]
    provider: Optional[str]
    use_fast: Optional[bool]

class AIService:
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {
            "openai": OpenAIProvider(),
            "anthropic": AnthropicProvider()
        }
        # Initialize provider mapping from models
        self._model_to_provider: Dict[str, str] = {}
        for model in OPENAI_MODELS:
            self._model_to_provider[model] = "openai"
        for model in ANTHROPIC_MODELS:
            self._model_to_provider[model] = "anthropic"
        # Add aliases to the mapping
        for alias, model in MODEL_ALIASES.items():
            self._model_to_provider[alias] = self._model_to_provider[model]

    def get_provider_for_model(self, model: str) -> str:
        """Get the provider for a given model"""
        if model in self._model_to_provider:
            return self._model_to_provider[model]
        raise ValueError(f"Unknown model: {model}")

    def get_default_model(self, provider: str) -> str:
        """Get the default model for a provider"""
        if provider not in DEFAULT_MODELS:
            raise ValueError(f"Unknown provider: {provider}")
        return DEFAULT_MODELS[provider]

    def get_fast_model(self, provider: str) -> str:
        """Get the fast model for a provider"""
        if provider not in FAST_MODELS:
            raise ValueError(f"Unknown provider: {provider}")
        return FAST_MODELS[provider]

    def get_model_info(self, model: str) -> Dict[str, Any]:
        """Get information about a model"""
        # Check if it's an alias
        if model in MODEL_ALIASES:
            model = MODEL_ALIASES[model]
            
        # Check provider-specific model lists
        if model in OPENAI_MODELS:
            return {"provider": "openai", **OPENAI_MODELS[model]}
        elif model in ANTHROPIC_MODELS:
            return {"provider": "anthropic", **ANTHROPIC_MODELS[model]}
        else:
            raise ValueError(f"Unknown model: {model}")

    def get_models_by_category(self, category: str) -> List[str]:
        """Get all models in a specific category"""
        if category not in MODEL_CATEGORIES:
            raise ValueError(f"Unknown category: {category}")
        return MODEL_CATEGORIES[category]

    def get_models_by_provider(self, provider: str) -> List[str]:
        """Get all models for a specific provider"""
        if provider == "openai":
            return list(OPENAI_MODELS.keys())
        elif provider == "anthropic":
            return list(ANTHROPIC_MODELS.keys())
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def close(self):
        """Cleanup method to close all provider sessions"""
        for provider in self.providers.values():
            await provider.close()

    async def invoke_llm(self, request: LLMRequest) -> Union[str, AsyncGenerator[str, None]]:
        """
        Invoke an LLM with the given request parameters. This is the main entry point for all LLM interactions.

        Args:
            request: Dictionary containing:
                - messages: List of messages with role and content
                - model: Optional model to use (defaults to provider's default)
                - max_tokens: Optional maximum tokens for response
                - system: Optional system message
                - temperature: Optional temperature for response
                - stream: Whether to stream the response
                - provider: Which provider to use (defaults to provider from model)
                - use_fast: Whether to use the fast model for the provider

        Returns:
            Either a string response or an async generator for streaming responses
        """
        try:
            # Get model and determine provider
            model = request.get("model")
            if not model:
                # Use fast model if specified, otherwise use default
                use_fast = request.get("use_fast", False)
                provider = request.get("provider", "openai")  # Default to openai if no model or provider specified
                model = self.get_fast_model(provider) if use_fast else self.get_default_model(provider)
            else:
                # Determine provider from model
                provider = self.get_provider_for_model(model)

            # Validate provider exists
            if provider not in self.providers:
                raise ValueError(f"Invalid provider: {provider}")
            provider_instance = self.providers[provider]

            # Validate messages
            messages = request.get("messages")
            if not messages:
                raise ValueError("No messages provided in request")
            if not isinstance(messages, list):
                raise ValueError(f"Messages must be a list, got {type(messages)}")

            # Prepare other parameters
            system = request.get("system")
            max_tokens = request.get("max_tokens")
            temperature = request.get("temperature")

            # Log request details (excluding sensitive content)
            logger.info(f"LLM Request - Provider: {provider}, Model: {model}, Stream: {request.get('stream', False)}")
            logger.debug(f"LLM Request Details - Max Tokens: {max_tokens}, Temperature: {temperature}")

            # Handle streaming
            if request.get("stream", False):
                return provider_instance.create_chat_completion_stream(
                    messages=messages,
                    model=model,
                    max_tokens=max_tokens,
                    system=system,
                    temperature=temperature
                )
            else:
                return await provider_instance.create_chat_completion(
                    messages=messages,
                    model=model,
                    max_tokens=max_tokens,
                    system=system,
                    temperature=temperature
                )

        except Exception as e:
            error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "traceback": traceback.format_exc(),
                "request_info": {
                    "provider": provider if 'provider' in locals() else None,
                    "model": model if 'model' in locals() else None,
                    "stream": request.get("stream", False),
                    "message_count": len(request.get("messages", [])),
                }
            }
            logger.error(f"Error in invoke_llm: {error_details}")
            # Re-raise with more context
            raise Exception(f"Error invoking LLM: {str(e)}\nDetails: {error_details}")

    async def send_messages(self, 
                          messages: List[Message],
                          model: Optional[str] = None,
                          max_tokens: Optional[int] = None,
                          system: Optional[str] = None,
                          provider: Optional[str] = None,
                          stream: bool = False
                          ) -> Union[str, AsyncGenerator[str, None]]:
        """
        Legacy method that wraps invoke_llm for backward compatibility.
        Send a collection of messages that can contain text and/or images to the AI provider.

        Args:
            messages: List of messages with role and content. Content can be text or image data.
            model: Optional model to use (defaults to provider's default)
            max_tokens: Optional maximum tokens for response
            system: Optional system message to include in the prompt
            provider: Optional provider to use (defaults to provider from model)
            stream: Whether to stream the response

        Returns:
            Either a string response or an async generator for streaming responses
        """
        request: LLMRequest = {
            "messages": messages,
            "model": model,
            "max_tokens": max_tokens,
            "system": system,
            "provider": provider,
            "stream": stream
        }
        return await self.invoke_llm(request)

# Create a singleton instance
ai_service = AIService()

__all__ = ['ai_service']
