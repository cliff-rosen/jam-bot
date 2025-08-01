from typing import Dict, Any, List, Optional, Union, Type
from pydantic import BaseModel, create_model, Field
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import PydanticOutputParser
from openai import AsyncOpenAI
from schemas.chat import ChatMessage
from utils.message_formatter import format_langchain_messages, format_messages_for_openai
from utils.prompt_logger import log_prompt_messages
import json

class BasePromptCaller:
    """Base class for creating and using prompt callers"""
    
    def __init__(
        self,
        response_model: Union[Type[BaseModel], Dict[str, Any]],
        system_message: Optional[str] = None,
        messages_placeholder: bool = True
    ):
        """
        Initialize a prompt caller.
        
        Args:
            response_model: Either a Pydantic model class or a JSON schema dict
            system_message: The system message to use in the prompt (optional)
            messages_placeholder: Whether to include a messages placeholder in the prompt
        """
        # Handle both Pydantic models and JSON schemas
        if isinstance(response_model, dict):
            # Convert JSON schema to Pydantic model
            self.response_model = self._json_schema_to_pydantic_model(response_model)
            self._is_dynamic_model = True
            self._original_schema = response_model
        else:
            # Use the Pydantic model directly
            self.response_model = response_model
            self._is_dynamic_model = False
            self._original_schema = None
            
        self.parser = PydanticOutputParser(pydantic_object=self.response_model)
        self.system_message = system_message
        self.messages_placeholder = messages_placeholder
        
        # Initialize OpenAI client
        self.client = AsyncOpenAI()
        
    def _json_schema_to_pydantic_model(self, schema: Dict[str, Any], model_name: str = "DynamicModel") -> Type[BaseModel]:
        """
        Convert a JSON schema to a Pydantic model class dynamically.
        
        Args:
            schema: JSON schema dictionary
            model_name: Name for the generated model class
            
        Returns:
            Dynamically created Pydantic model class
        """
        if schema.get("type") != "object":
            raise ValueError("Only object type schemas are supported")
        
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        # Build field definitions for create_model
        field_definitions = {}
        
        for prop_name, prop_schema in properties.items():
            prop_type = prop_schema.get("type", "string")
            description = prop_schema.get("description", "")
            
            # Map JSON schema types to Python types
            if prop_type == "string":
                if "enum" in prop_schema:
                    # Create literal type for enums
                    from typing import Literal
                    enum_values = tuple(prop_schema["enum"])
                    python_type = Literal[enum_values]
                else:
                    python_type = str
            elif prop_type == "number":
                python_type = float
            elif prop_type == "integer":
                python_type = int
            elif prop_type == "boolean":
                python_type = bool
            elif prop_type == "array":
                # Simple array handling - could be enhanced
                python_type = List[Any]
            elif prop_type == "object":
                # Simple object handling - could be enhanced
                python_type = Dict[str, Any]
            else:
                python_type = str  # Default fallback
            
            # Handle required vs optional fields
            if prop_name in required:
                field_definitions[prop_name] = (python_type, Field(description=description))
            else:
                field_definitions[prop_name] = (Optional[python_type], Field(None, description=description))
        
        # Create the dynamic model with a unique name based on schema hash
        unique_name = f"{model_name}_{abs(hash(json.dumps(schema, sort_keys=True)))}"
        return create_model(unique_name, **field_definitions)
    
    def get_prompt_template(self) -> ChatPromptTemplate:
        """Get the prompt template with system message and optional messages placeholder"""
        messages = []
        if self.system_message:
            messages.append(("system", self.system_message))
        if self.messages_placeholder:
            messages.append(MessagesPlaceholder(variable_name="messages"))
        return ChatPromptTemplate.from_messages(messages)
    
    def get_formatted_messages(
        self,
        messages: List[ChatMessage],
        **kwargs: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Format messages for the prompt"""
        # Convert messages to langchain format
        langchain_messages = format_langchain_messages(messages)
        
        # Get format instructions
        format_instructions = self.parser.get_format_instructions()
        
        # Format messages using template
        prompt = self.get_prompt_template()
        formatted_messages = prompt.format_messages(
            messages=langchain_messages,
            format_instructions=format_instructions,
            **kwargs
        )
        
        # Convert to OpenAI format
        return format_messages_for_openai(formatted_messages)
    
    def get_schema(self) -> Dict[str, Any]:
        """Get the JSON schema for the response model"""
        # If we started with a JSON schema, return the original
        if self._is_dynamic_model and self._original_schema:
            return self._original_schema
        # Otherwise get schema from Pydantic model
        return self.response_model.model_json_schema()
    
    def get_response_model_name(self) -> str:
        """Get the name of the response model"""
        return self.response_model.__name__
    
    async def invoke(
        self,
        messages: List[ChatMessage] = None,
        log_prompt: bool = True,
        **kwargs: Dict[str, Any]
    ) -> BaseModel:
        """
        Invoke the prompt and get a parsed response.
        
        Args:
            messages: List of conversation messages (optional)
            log_prompt: Whether to log the prompt messages
            **kwargs: Additional variables to format into the prompt
            
        Returns:
            Parsed response as an instance of the response model
        """
        # Use empty list if no messages provided
        if messages is None:
            messages = []
        
        # Format messages
        formatted_messages = self.get_formatted_messages(messages, **kwargs)
        
        # Log prompt if requested
        if log_prompt:
            try:
                log_file_path = log_prompt_messages(
                    messages=formatted_messages,
                    prompt_type=self.__class__.__name__.lower()
                )
                print(f"Prompt messages logged to: {log_file_path}")
            except Exception as log_error:
                print(f"Warning: Failed to log prompt: {log_error}")
        
        # Get schema
        schema = self.get_schema()
        
        # Call OpenAI
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=formatted_messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "schema": schema,
                    "name": self.get_response_model_name()
                }
            }
        )
        
        # Parse response
        response_text = response.choices[0].message.content
        return self.parser.parse(response_text) 