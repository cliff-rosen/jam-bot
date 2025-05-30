from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from schemas.chat import Message, MessageRole
from .base_prompt import BasePrompt

class ToolCall(BaseModel):
    """Structure for tool calls"""
    name: str = Field(description="Name of the tool to call")
    parameters: Dict[str, Any] = Field(description="Parameters for the tool call")

class SupervisorResponse(BaseModel):
    """Structure for supervisor's response"""
    response_text: str = Field(description="The main response text from the supervisor")
    tool_call: Optional[ToolCall] = Field(default=None, description="Optional tool call to make")

class SupervisorPrompt(BasePrompt):
    """Prompt template for supervisor"""
    
    def __init__(self):
        super().__init__(SupervisorResponse)
        
        self.system_message = """You are a helpful assistant that helps users achieve their goals and answers questions about their knowledge missions. You have access to the current mission context and can either:
1. Provide a direct response using response_text
2. Make a tool call to gather more information and then provide a response using response_text

Available tools:
1. asset_retrieve: Retrieve the entire contents of an asset
   - Parameters:
     - asset_id: string (required) - The ID of the asset to retrieve

2. asset_search: Search for relevant chunks within an asset
   - Parameters:
     - asset_id: string (required) - The ID of the asset to search in
     - query: string (required) - The search query to find relevant chunks

Current Mission:
{mission}

Available Assets:
{available_assets}

Always consider the mission's goal and success criteria when determining how to respond."""

    def get_prompt_template(self) -> ChatPromptTemplate:
        """Return a ChatPromptTemplate for supervisor"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_message),
            MessagesPlaceholder(variable_name="messages")
        ])

    def get_formatted_messages(
        self,
        messages: List[Message],
        mission: Any,
        available_assets: List[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Get formatted messages for the prompt"""
        # Format available assets into a readable string
        assets_str = "No assets available"
        if available_assets:
            assets_str = "\n".join([
                f"- {asset.get('name', 'Unnamed')} (ID: {asset.get('id', 'unknown')}): {asset.get('description', 'No description')}"
                for asset in available_assets
            ])

        # Format mission into a readable string
        mission_str = f"""Goal: {mission.goal}
Success Criteria:
{mission.success_criteria}

Inputs Required:
{mission.inputs}

Expected Outputs:
{mission.outputs}"""

        # Convert messages to langchain message format
        langchain_messages = []
        for msg in messages:
            if msg.role == MessageRole.USER:
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == MessageRole.ASSISTANT:
                langchain_messages.append(AIMessage(content=msg.content))
            elif msg.role == MessageRole.SYSTEM:
                langchain_messages.append(SystemMessage(content=msg.content))

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
        openai_messages = []
        for msg in formatted_messages:
            if isinstance(msg, SystemMessage):
                openai_messages.append({"role": "system", "content": msg.content})
            elif isinstance(msg, HumanMessage):
                openai_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                openai_messages.append({"role": "assistant", "content": msg.content})

        return openai_messages 