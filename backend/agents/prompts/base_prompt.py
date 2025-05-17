from typing import Dict, Any, Type
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

class BasePrompt:
    """Base class for all prompts that encapsulates common functionality"""
    
    def __init__(self, response_model: Type[BaseModel]):
        self.parser = PydanticOutputParser(pydantic_object=response_model)
        self.format_instructions = self.parser.get_format_instructions()
        
    def get_formatted_prompt(self, **kwargs: Dict[str, Any]) -> ChatPromptTemplate:
        """Get a formatted prompt template with all necessary variables"""
        # Add format instructions to kwargs if not already present
        if "format_instructions" not in kwargs:
            kwargs["format_instructions"] = self.format_instructions
            
        # Get the prompt template
        prompt_template = self.get_prompt_template()
        
        # Format the template with the provided variables
        return prompt_template.format(**kwargs)
        
    def get_prompt_template(self) -> ChatPromptTemplate:
        """Get the base prompt template. Must be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement get_prompt_template")
        
    def parse_response(self, response: str) -> BaseModel:
        """Parse the LLM response using the configured parser"""
        return self.parser.parse(response) 