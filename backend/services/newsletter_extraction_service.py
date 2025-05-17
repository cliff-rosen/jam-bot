from typing import Dict, Any
import logging
from langchain_openai import ChatOpenAI
import os
from agents.prompts.newsletter_extraction import NewsletterExtractionPrompt, NewsletterExtractionResponse

logger = logging.getLogger(__name__)

class NewsletterExtractionService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.prompt = NewsletterExtractionPrompt()
        
    async def extract_from_newsletter(
        self,
        content: str,
        source: str,
        date: str
    ) -> Dict[str, Any]:
        """
        Extract structured information from a newsletter article using AI
        
        Args:
            content: The newsletter article content
            source: The source of the newsletter
            date: The date of the newsletter
            
        Returns:
            Dictionary containing extracted information in structured format
        """
        try:

            prompt = NewsletterExtractionPrompt()

            # Create and format the prompt
            formatted_prompt = prompt.get_formatted_prompt(
                content=content,
                source=source,
                date=date
            )
            
            # Get extraction from LLM
            response = await self.llm.ainvoke(formatted_prompt)

            extraction = prompt.parse_response(response.content)

            return extraction.dict()
                
        except Exception as e:
            logger.error(f"Error extracting from newsletter: {str(e)}")
            raise 