from openai import AsyncOpenAI
import logging
from typing import List, Dict, Optional, AsyncGenerator, Any, Set
from config.settings import settings
from .base import LLMProvider
from .model_data import OPENAI_MODELS, MODEL_ALIASES

logger = logging.getLogger(__name__)

class OpenAIProvider(LLMProvider):
    # Required parameters that should never be filtered out
    REQUIRED_PARAMETERS: Set[str] = {"model", "messages"}
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
    def get_default_model(self) -> str:
        return "gpt-4-turbo-preview"

    def _get_model_info(self, model: str) -> Dict[str, Any]:
        """Get model information including supported parameters"""
        # Check if it's an alias
        if model in MODEL_ALIASES:
            model = MODEL_ALIASES[model]
        
        if model not in OPENAI_MODELS:
            raise ValueError(f"Unknown model: {model}")
            
        return OPENAI_MODELS[model]

    def _filter_parameters(self, model: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Filter parameters based on model support while preserving required parameters"""
        model_info = self._get_model_info(model)
        supported_params = model_info.get("supported_parameters", set())
        
        # Always include required parameters
        filtered_params = {k: v for k, v in params.items() if k in self.REQUIRED_PARAMETERS}
        
        # Add supported optional parameters
        for k, v in params.items():
            if k not in self.REQUIRED_PARAMETERS and k in supported_params:
                filtered_params[k] = v
        
        # Log any removed optional parameters
        removed_params = set(params.keys()) - supported_params - self.REQUIRED_PARAMETERS
        if removed_params:
            logger.warning(f"Removed unsupported optional parameters for model {model}: {removed_params}")
            
        return filtered_params

    async def generate(self, 
        prompt: str, 
        model: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        try:
            model = model or self.get_default_model()
            params = {
                "model": model,
                "prompt": prompt,
                "max_tokens": max_tokens
            }
            
            # Filter parameters based on model support
            filtered_params = self._filter_parameters(model, params)
            
            response = await self.client.completions.create(**filtered_params)
            return response.choices[0].text.strip()
        except Exception as e:
            logger.error(f"Error generating OpenAI response with model {model}: {str(e)}")
            raise

    async def generate_stream(self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        try:
            model = model or self.get_default_model()
            params = {
                "model": model,
                "prompt": prompt,
                "max_tokens": max_tokens,
                "stream": True
            }
            
            # Filter parameters based on model support
            filtered_params = self._filter_parameters(model, params)
            
            stream = await self.client.completions.create(**filtered_params)
            async for chunk in stream:
                if chunk.choices[0].text:
                    yield chunk.choices[0].text
        except Exception as e:
            logger.error(f"Error generating streaming OpenAI response with model {model}: {str(e)}")
            raise

    async def create_chat_completion(self, 
        messages: List[Dict[str, str]], 
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        system: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        try:
            model = model or self.get_default_model()
            
            # Add system message if provided
            chat_messages = []
            if system:
                chat_messages.append({"role": "system", "content": system})
            chat_messages.extend(messages)
            
            # Prepare parameters
            params = {
                "model": model,
                "messages": chat_messages,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            # Filter parameters based on model support
            filtered_params = self._filter_parameters(model, params)
            
            response = await self.client.chat.completions.create(**filtered_params)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error creating OpenAI chat completion with model {model}: {str(e)}")
            raise

    async def create_chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        system: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        try:
            model = model or self.get_default_model()
            
            # Add system message if provided
            chat_messages = []
            if system:
                chat_messages.append({"role": "system", "content": system})
            chat_messages.extend(messages)
            
            # Prepare parameters
            params = {
                "model": model,
                "messages": chat_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": True
            }
            
            # Filter parameters based on model support
            filtered_params = self._filter_parameters(model, params)
            
            stream = await self.client.chat.completions.create(**filtered_params)
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"Error creating streaming OpenAI chat completion with model {model}: {str(e)}")
            raise

    async def close(self):
        await self.client.close() 