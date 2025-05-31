from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from .base_prompt import BasePrompt
from utils.message_formatter import format_assets, format_langchain_messages, format_messages_for_openai, format_mission

class SampleResponse(BaseModel):
    """Structure for mission definition response"""
    

class SamplePrompt(BasePrompt):
    """Prompt template for mission definition"""
    
    def __init__(self):
        super().__init__(SampleResponse)
        
        self.system_message = """
"""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for supervisor"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            ("human", self.user_message_template)
        ]) 
    
    def get_formatted_messages(self, messages: List[Message], mission: Any, available_assets: List[Dict[str, Any]] = None) -> List[Dict[str, str]]:
        """Get formatted messages for the prompt"""
        # Format available assets into a readable string
        assets_str = "No assets available"
        if available_assets:
            assets_str = format_assets(available_assets)
        
        mission_str = "No mission available"
        if mission:
            mission_str = format_mission(mission)
        
        # Convert messages to langchain message format
        langchain_messages = format_langchain_messages(messages)
        
        # Get the format instructions from the base class
        format_instructions = self.parser.get_format_instructions()

        # Format the messages using the prompt template
        prompt = self.get_prompt_template()
        formatted_messages = prompt.format_messages(
            mission=mission_str,
            messages=langchain_messages,
            available_assets=assets_str,
            format_instructions=format_instructions
        )

        # Convert langchain messages to OpenAI format   
        openai_messages = format_messages_for_openai(formatted_messages)

        return openai_messages  
    

        
