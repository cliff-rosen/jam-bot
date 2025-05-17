from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from .base_prompt import BasePrompt

class NewsletterExtractionResponse(BaseModel):
    """Structure for newsletter extraction response"""
    basics: Dict[str, str] = Field(
        description="Basic information about the newsletter",
        default_factory=lambda: {"source": "", "date": ""}
    )
    findings: Dict[str, List[str]] = Field(
        description="Key findings from the newsletter",
        default_factory=lambda: {
            "model_capabilities": [],
            "new_releases": [],
            "tools_workflows": [],
            "market_adoption": [],
            "use_cases": [],
            "implementation_insights": []
        }
    )
    top_takeaways: List[str] = Field(
        description="The 2-3 most significant developments from this newsletter"
    )

class NewsletterExtractionPrompt(BasePrompt):
    """Prompt template for newsletter extraction"""
    
    def __init__(self):
        super().__init__(NewsletterExtractionResponse)
        
        self.system_message = """You are an expert at analyzing newsletter articles and extracting structured information about AI developments. Your task is to identify and categorize key information about:
1. Model capabilities and advancements
2. New releases and updates
3. Tools and workflows
4. Market adoption and trends
5. Notable use cases
6. Implementation insights

Focus on concrete developments rather than speculation. For each category, provide specific, factual information found in the article. If no relevant information is found for a category, include "none found"."""

        self.user_message_template = """Please analyze the following newsletter article and extract the key information into a structured format.

Article for extraction:
Source: {source}
Date: {date}

{content}

{format_instructions}"""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for newsletter extraction"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            ("human", self.user_message_template)
        ]) 