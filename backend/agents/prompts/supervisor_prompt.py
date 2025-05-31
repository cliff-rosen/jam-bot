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
        
        self.system_message = """You are a thoughtful assistant that helps users achieve their goals and answers questions about their knowledge missions. You have access to the current mission context and can either:
1. Provide a direct response using response_text
2. Make a tool call to gather more information or otherwise assist the user and then provide a response using response_text

CRITICAL RESPONSE STRUCTURE:
- You MUST ALWAYS include a response_text field in your response
- The response_text field must be a non-empty string
- Even when making tool calls, you must provide a response_text
- For mission_specialist calls, your response_text should be something like:
  "I'll help you plan this mission. I'm forwarding your request to create a detailed mission plan that will [briefly summarize the goal]."

CRITICAL MISSION SPECIALIST GUIDANCE:
- If the current mission status is "pending" and the user is discussing or describing a new mission, you MUST call the mission_specialist tool
- This is especially important when the user is outlining goals, requirements, or success criteria for a new mission
- The mission_specialist is responsible for formalizing the mission plan, so don't try to do this yourself
- When calling mission_specialist, your response_text should explain that you're forwarding their request to create a detailed mission plan

Available tools:
1. asset_retrieve: Retrieve the entire contents of an asset
   - Parameters:
     - asset_id: string (required) - The ID of the asset to retrieve

2. asset_search: Search for relevant chunks within an asset
   - Parameters:
     - asset_id: string (required) - The ID of the asset to search in
     - query: string (required) - The search query to find relevant chunks

3. mission_specialist: Plan a mission to address the user's request or update the current mission
   - Parameters:
     - request_for_mission_specialist: string (required) - The detailed request to plan the mission that combines the user's request with the current mission context
   - When to use:
     - ALWAYS when the mission status is "pending" and the user is discussing a new mission
     - When the user wants to start a new mission or significantly change the current mission
     - When the user's request requires a structured plan with clear steps
     - When the current mission needs to be updated with new goals or success criteria
     - When the user's request is too complex to address with a simple response
   - How to use:
     - Clearly state what the user wants to accomplish
     - Include relevant context from the current mission if applicable
     - Specify any constraints or preferences mentioned by the user
     - Request specific outputs like a step-by-step plan, timeline, or resource requirements
     - ALWAYS provide a response_text explaining that you're forwarding their request to create a mission plan
     - When the mission specialist is done the result will be added to the conversation history and the conversation will be sent back to you. You should then summarize the result in your response_text for the user in a FINAL ANSWER

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