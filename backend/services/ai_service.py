import logging
from typing import Optional, List, Dict, TypedDict, AsyncGenerator, Union, Literal
from config.settings import settings
from .llm.base import LLMProvider
from .llm.anthropic_provider import AnthropicProvider
from .llm.openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)

FAST_MODEL = "claude-3-5-haiku-20241022"

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

class AIService:
    def __init__(self):
        #self.provider: LLMProvider = AnthropicProvider()
        self.provider: LLMProvider = OpenAIProvider()

    def set_provider(self, provider: str):
        """Change the LLM provider"""
        if provider == "openai":
            self.provider = OpenAIProvider()
        elif provider == "anthropic":
            self.provider = AnthropicProvider()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def close(self):
        """Cleanup method to close the provider session"""
        await self.provider.close()

    async def send_messages(self, 
                          messages: List[Message],
                          model: Optional[str] = None,
                          max_tokens: Optional[int] = None,
                          system: Optional[str] = None
                          ) -> str:
        """
        Send a collection of messages that can contain text and/or images to the AI provider.

        Args:
            messages: List of messages with role and content. Content can be text or image data.
            model: Optional model to use (defaults to provider's default)
            max_tokens: Optional maximum tokens for response
            system: Optional system message to include in the prompt

        Returns:
            The AI provider's response text
        """
        try:
            # Format messages for the provider
            formatted_messages = []
            
            for msg in messages:
                if isinstance(msg["content"], str):
                    # Simple text message
                    formatted_messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
                else:
                    # Message with potential multiple content parts
                    content_parts = []
                    for part in msg["content"]:
                        if "text" in part:
                            content_parts.append({
                                "type": "text",
                                "text": part["text"]
                            })
                        if "image_url" in part:
                            content_parts.append({
                                "type": "image",
                                "image_url": part["image_url"]
                            })
                        elif "image_data" in part and "image_mime_type" in part:
                            # Convert binary image data to base64
                            import base64
                            image_base64 = base64.b64encode(part["image_data"]).decode('utf-8')
                            content_parts.append({
                                "type": "image",
                                "image_url": f"data:{part['image_mime_type']};base64,{image_base64}"
                            })
                    
                    formatted_messages.append({
                        "role": msg["role"],
                        "content": content_parts
                    })

            # Send to provider
            response = await self.provider.create_chat_completion(
                messages=formatted_messages,
                model=model,
                max_tokens=max_tokens,
                system=system
            )

            return response

        except Exception as e:
            logger.error(f"Error in send_messages: {str(e)}")
            raise


# Create a singleton instance
ai_service = AIService()

__all__ = ['ai_service']
