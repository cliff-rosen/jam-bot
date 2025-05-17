from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import uuid
import logging
from sqlalchemy.orm import Session
from database import SessionLocal
from services.ai_service import AIService
from services.search_service import google_search
from schemas import (
    Message, 
    ChatResponse, 
    MessageRole, 
    Asset, 
    Agent, 
    AgentStatus
)
import json
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define available tools
TOOLS = [
    {
        "name": "search",
        "description": "Search the web using Google to find relevant information",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to execute"
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return (default: 5)",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "retrieve",
        "description": "Retrieve specific information from a URL or content",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to retrieve content from"
                },
                "query": {
                    "type": "string",
                    "description": "Specific information to extract from the content"
                },
                "max_length": {
                    "type": "integer",
                    "description": "Maximum length of content to retrieve (default: 1000)",
                    "default": 1000
                }
            },
            "required": ["url", "query"]
        }
    }
]

class BotService:
    def __init__(self, db: Session):
        self.db = db
        self.ai_service = AIService()
        self.workflow_state = {
            "current_step": 0,
            "total_steps": 0,
            "status": "idle",
            "active_agents": [],
            "pending_approvals": []
        }

    def get_clean_response_json(self, response: str) -> str:
        """Clean the response to ensure it's valid JSON"""
        
        response = response.strip()
        
        # Remove markdown code blocks if present
        if response.startswith('```json'):
            response = response[7:]
        if response.endswith('```'):    
            response = response[:-3]
            
        # Try to parse the complete response as JSON
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            # If parsing fails, try to fix newlines in string values
            try:
                # Find all string values in the JSON and escape newlines
                def escape_newlines(match):
                    # Get the string content (without quotes)
                    content = match.group(1)
                    # Escape newlines and other control characters
                    content = content.replace('\n', '\\n')
                    content = content.replace('\r', '\\r')
                    content = content.replace('\t', '\\t')
                    return f'"{content}"'
                
                # This regex matches string values in JSON, including the quotes
                fixed_response = re.sub(r'"([^"]*?)"', escape_newlines, response)
                return json.loads(fixed_response)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON: {str(e)}")
                logger.error(f"Response after cleaning: {fixed_response}")
                raise ValueError(f"AI response must be valid JSON: {str(e)}")

    async def process_message(self, message: str, history: List[Dict[str, Any]], assets: List[Asset] = None) -> ChatResponse:
        """Process a user message and return a response with appropriate side effects"""
        try:
            # 1. Initialize conversation state
            messages = self._initialize_conversation_history(history, message)
            tool_use_history = []
            iteration = 0
            max_iterations = 5

            # 2. Main processing loop
            while iteration < max_iterations:
                logger.info(f"Processing message: {message}")
                logger.info(f"Messages: {messages}")
                
                # Get AI response
                response = await self._get_ai_response(messages, assets)
                logger.info(f"AI response: {response}")

                # Process response
                response_data = self.get_clean_response_json(response)
                self._validate_response_data(response_data)
                
                # Handle based on response type
                if response_data["type"] == "tool":
                    logger.info(f"Processing Tool use response")
                    # Execute tool and update conversation
                    tool_results = await self._execute_tool(response_data["tool"])
                    logger.info(f"Tool results: {tool_results}")
                    self._update_tool_history(tool_use_history, iteration, response_data["tool"], tool_results)
                    self._update_conversation_history(messages, response_data["tool"], tool_results)
                    iteration += 1
                    continue
                    
                elif response_data["type"] == "final_response":
                    logger.info(f"Processing Final response")
                    # Process final response and return
                    processed_response = await self._process_final_response(response_data)
                    return self._create_chat_response(
                        response_data["response"],
                        processed_response,
                        tool_use_history
                    )
                
                else:
                    raise ValueError(f"Invalid response type: {response_data['type']}")

            # 3. Handle max iterations reached
            return self._create_max_iterations_response(tool_use_history)

        except Exception as e:
            # 4. Handle errors
            return self._create_error_response(str(e))

    def _initialize_conversation_history(self, history: List[Dict[str, Any]], message: str) -> List[Dict[str, Any]]:
        """Initialize conversation history with current message"""
        messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in history
        ]
        messages.append({"role": "user", "content": message})
        return messages

    async def _get_ai_response(self, messages: List[Dict[str, Any]], assets: List[Asset]) -> str:
        """Get response from AI service"""
        return await self.ai_service.send_messages(
            messages=messages,
            system=self._get_system_prompt(assets)
        )

    def _validate_response_data(self, response_data: Dict[str, Any]) -> None:
        """Validate response data structure"""
        if not isinstance(response_data, dict):
            raise ValueError("Response must be a JSON object")
        if "type" not in response_data:
            raise ValueError("Response must include a 'type' field")

    def _update_tool_history(self, tool_use_history: List[Dict[str, Any]], 
                            iteration: int, tool: Dict[str, Any], 
                            results: Dict[str, Any]) -> None:
        """Update tool use history"""
        tool_use_history.append({
            "iteration": iteration + 1,
            "tool": tool,
            "results": results
        })

    def _update_conversation_history(self, messages: List[Dict[str, Any]], 
                                   tool: Dict[str, Any], 
                                   results: Dict[str, Any]) -> None:
        """Update conversation history with tool execution"""
        logger.info(f"Updating conversation history with tool execution", tool, results)
        messages.extend([
            {
                "role": "assistant",
                "content": json.dumps({"type": "tool", "tool": tool})
            },
            {
                "role": "assistant",
                "content": json.dumps({
                    "type": "tool_result",
                    "tool": tool["name"],
                    "results": results
                })
            }
        ])

    async def _process_final_response(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process final response including agent jobs and assets"""
        agent_jobs = self._process_agent_jobs(response_data.get("agent_jobs", []))
        assets = self._process_assets(response_data.get("assets", []))
        return {
            "final_response": response_data["response"],
            "agent_jobs": agent_jobs,
            "assets": assets
        }

    def _process_agent_jobs(self, agent_jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process and validate agent jobs"""
        processed_jobs = []
        for job in agent_jobs:
            # Ensure input_asset_ids is a list
            if "input_asset_ids" not in job:
                job["input_asset_ids"] = []
            elif not isinstance(job["input_asset_ids"], list):
                job["input_asset_ids"] = [job["input_asset_ids"]]
            
            # Validate required fields
            if "agentType" not in job:
                raise ValueError(f"Agent job missing required field 'agentType'")
            if "output_asset_configs" not in job:
                raise ValueError(f"Agent job missing required field 'output_asset_configs'")
            
            # Add default metadata if not present
            if "metadata" not in job:
                job["metadata"] = {}
            if "priority" not in job["metadata"]:
                job["metadata"]["priority"] = "medium"
            if "tags" not in job["metadata"]:
                job["metadata"]["tags"] = []
            if "estimated_duration" not in job["metadata"]:
                job["metadata"]["estimated_duration"] = "5m"
            
            processed_jobs.append(job)
        return processed_jobs

    def _process_assets(self, assets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process and validate assets"""
        processed_assets = []
        for asset in assets:
            if "asset_id" not in asset:
                asset["asset_id"] = str(uuid.uuid4())
            if "metadata" not in asset:
                asset["metadata"] = {}
            if "createdAt" not in asset["metadata"]:
                asset["metadata"]["createdAt"] = datetime.now().isoformat()
            if "updatedAt" not in asset["metadata"]:
                asset["metadata"]["updatedAt"] = datetime.now().isoformat()
            if "creator" not in asset["metadata"]:
                asset["metadata"]["creator"] = "bot"
            if "version" not in asset["metadata"]:
                asset["metadata"]["version"] = 1
            
            processed_assets.append(asset)
        return processed_assets

    def _create_chat_response(self, response: str, processed_response: Dict[str, Any], 
                             tool_use_history: List[Dict[str, Any]]) -> ChatResponse:
        """Create final chat response"""
        return ChatResponse(
            message=Message.create(
                id=str(uuid.uuid4()),
                role=MessageRole.ASSISTANT,
                content=response,
                metadata=self._get_message_metadata(processed_response)
            ),
            sideEffects={
                "final_response": response,
                "agent_jobs": processed_response.get("agent_jobs", []),
                "assets": processed_response.get("assets", []),
                "tool_use_history": tool_use_history
            }
        )

    def _create_max_iterations_response(self, tool_use_history: List[Dict[str, Any]]) -> ChatResponse:
        """Create response for max iterations reached"""
        return ChatResponse(
            message=Message(
                message_id=str(uuid.uuid4()),
                role=MessageRole.ASSISTANT,
                content="I've reached the maximum number of tool use iterations. Please try rephrasing your request.",
                timestamp=datetime.now(),
                metadata={
                    "error": True,
                    "max_iterations_reached": True,
                    "tool_use_history": tool_use_history
                }
            ),
            sideEffects={"tool_use_history": tool_use_history}
        )

    def _create_error_response(self, error_message: str) -> ChatResponse:
        """Create error response"""
        return ChatResponse(
            message=Message(
                message_id=str(uuid.uuid4()),
                role=MessageRole.ASSISTANT,
                content=f"Error processing message: {error_message}",
                timestamp=datetime.now(),
                metadata={"error": True}
            ),
            sideEffects={}
        )

    async def _execute_tool(self, tool_call: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return its results"""
        tool_name = tool_call.get("name")
        tool_params = tool_call.get("parameters", {})
        
        if tool_name == "search":
            logger.info(f"Executing search with query: {tool_params.get('query')}")
            try:
                # Get search results using the actual search service
                results = await google_search(
                    query=tool_params.get('query'),
                    num_results=tool_params.get('num_results', 5)
                )
                
                # Transform results to match expected format
                formatted_results = [
                    {
                        "title": result["title"],
                        "url": result["link"],
                        "snippet": result["snippet"],
                        "displayLink": result["displayLink"],
                        "pagemap": result.get("pagemap", {})
                    }
                    for result in results
                ]
                
                logger.info(f"Search returned {len(formatted_results)} results")
                return {
                    "results": formatted_results
                }
                
            except Exception as e:
                logger.error(f"Error executing search: {str(e)}")
                return {
                    "results": [],
                    "error": str(e)
                }
        elif tool_name == "retrieve":
            logger.info(f"Executing retrieve for URL: {tool_params.get('url')}")
            try:
                import requests
                from bs4 import BeautifulSoup
                import re

                # Fetch the content
                response = requests.get(tool_params.get('url'))
                response.raise_for_status()
                
                # Parse the content
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                # Get text content
                text = soup.get_text()
                
                # Clean up whitespace
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = ' '.join(chunk for chunk in chunks if chunk)
                
                # Truncate to max length if specified
                max_length = tool_params.get('max_length', 1000)
                if len(text) > max_length:
                    text = text[:max_length] + "..."
                
                # Extract relevant content based on query
                query = tool_params.get('query', '').lower()
                relevant_chunks = []
                
                # Split into paragraphs
                paragraphs = text.split('\n\n')
                for para in paragraphs:
                    if query in para.lower():
                        relevant_chunks.append(para.strip())
                
                return {
                    "url": tool_params.get('url'),
                    "query": query,
                    "content": relevant_chunks if relevant_chunks else [text[:max_length] + "..."],
                    "total_length": len(text)
                }
                
            except Exception as e:
                logger.error(f"Error executing retrieve: {str(e)}")
                return {
                    "error": str(e),
                    "url": tool_params.get('url'),
                    "query": tool_params.get('query')
                }
        else:
            raise ValueError(f"Unknown tool: {tool_name}")

    def _get_message_metadata(self, side_effects: Dict[str, Any]) -> Dict[str, Any]:
        """Generate appropriate metadata for the message based on side effects"""
        metadata = {}
        
        if side_effects.get("tool_executed"):
            metadata["tool_executed"] = side_effects["tool_executed"]
            metadata["tool_results"] = side_effects["tool_results"]
        
        if side_effects.get("final_response"):
            metadata["final_response"] = side_effects["final_response"]
            if side_effects.get("assets"):
                metadata["asset_references"] = [asset["asset_id"] for asset in side_effects["assets"]]
            if side_effects.get("agent_jobs"):
                metadata["agent_jobs"] = side_effects["agent_jobs"]
            
        # Add tool use history to metadata if it exists
        if side_effects.get("tool_use_history"):
            metadata["tool_use_history"] = side_effects["tool_use_history"]
            
        return metadata

    def _get_system_prompt(self, assets: List[Asset] = None) -> str:
        """Get the system prompt for the AI service"""
        base_prompt = f"""You are FractalBot, an intelligent assistant that helps users accomplish tasks through a combination of conversation and automated workflows.

CRITICAL: You must ALWAYS respond with a SINGLE valid JSON object. Your entire response must be ONE JSON object, not multiple objects or a mix of text and JSON.
DO NOT wrap your response in markdown code blocks (```json) or any other formatting.
DO NOT include any text before or after the JSON object.
DO NOT return multiple JSON objects in sequence - only return ONE object.

You have two possible response formats: 

1. To use a tool (directly executable by you):
{{
    "type": "tool",
    "tool": {{
        "name": "search",
        "parameters": {{
            "query": "your search query here",
            "num_results": 5
        }}
    }}
}}

2. To give a final response (which can include recommending agent jobs and/or directly generating assets):
{{
    "type": "final_response",
    "response": "Your response text here",
    "agent_jobs": [
        {{
            "agentType": "list_labels|get_messages|get_message|email_summarizer|email_list_summarizer",  // The agentType MUST be one of these exact values
            "input_parameters": {{
                "operation": "list_labels|get_messages|get_message",  // Must match agentType
                // Operation-specific parameters as shown below
            }},
            "input_asset_ids": ["asset_id_1", "asset_id_2"],  // REQUIRED: Array of input asset IDs that this agent will process
            "output_asset_configs": [
                {{
                    "name": "Required name for the output asset",
                    "description": "Description of what this asset will contain",
                    "fileType": "txt|pdf|csv|json|png|jpg|jpeg|gif|mp3|mp4|wav|unknown",
                    "dataType": "unstructured|email_list|generic_list|generic_table"
                }}
            ],
            "description": "Optional description of what this job will do",
            "metadata": {{  // Optional metadata for the job
                "priority": "high|medium|low",
                "tags": ["tag1", "tag2"],
                "estimated_duration": "5m",
                // ... other metadata as needed
            }}
        }}
    ],
    "assets": [  // Optional: For directly generated assets like poems, summaries, etc.
        {{
            "asset_id": "uuid-string",  // Will be auto-generated if not provided
            "name": "Required name for the asset",
            "description": "Description of the asset",
            "fileType": "txt|pdf|csv|json|png|jpg|jpeg|gif|mp3|mp4|wav|unknown",
            "dataType": "unstructured|email_message|email_list|generic_list|generic_table",
            "content": "The actual content of the asset",
            "metadata": {{
                "createdAt": "timestamp",
                "updatedAt": "timestamp",
                "creator": "user/bot/agent",
                "tags": ["tag1", "tag2"],
                "agent_associations": ["agent_id1", "agent_id2"],
                "version": 1
            }}
        }}
    ]
}}

IMPORTANT DISTINCTION:
1. Tools (Directly Usable):
   - These are tools you can directly execute in your responses
   - Currently available tools:
{json.dumps(TOOLS, indent=2)}

2. Agent Jobs (Recommendable):
   - These are specialized workers you can recommend to the user
   - You CANNOT directly execute agent jobs
   - You can only propose them in the "agent_jobs" array of a final_response
   - The user must approve and launch them
   
   Available Agent Types:
   - list_labels: Lists all email folders/labels
     * General inputs:
       - agentType: list_labels
       - input_parameters:
       {{
           "operation": "list_labels",
           "include_system_labels": true  // Whether to include system labels like INBOX, SENT, etc.
       }}
       - input_asset_ids: []  // No input assets needed
       - output_asset_configs: [{{  // Will contain the list of labels
           "name": "Email Labels List",
           "description": "List of all email folders and labels",
           "fileType": "json",
           "dataType": "generic_list"
       }}]
     * Example: "I'll create a list_labels agent job to list all your email folders and labels"

   - get_messages: Retrieves messages from specified folders
     * General inputs:
       - agentType: get_messages
       - input_parameters:
       {{
           "operation": "get_messages",
           "folders": ["folder1", "folder2"],  // List of folder o label IDs to search (must be IDs and not names)
           "date_range": {{
               "start": "2024-03-01T00:00:00Z",  // ISO 8601 format
               "end": "2024-03-23T23:59:59Z"     // ISO 8601 format
           }},
           "query_terms": ["term1", "term2"],    // Optional search terms
           "max_results": 100,                   // Maximum number of emails to retrieve
           "include_attachments": false,         // Whether to include email attachments
           "include_metadata": true              // Whether to include email metadata (headers, etc.)
       }}
       - input_asset_ids: []  // No input assets needed
       - output_asset_configs: [{{  // Will contain the retrieved messages
           "name": "Retrieved Emails",
           "description": "List of emails matching the search criteria",
           "fileType": "json",
           "dataType": "email_list"
       }}]
     * Example: "I'll create a get_messages agent job to retrieve your recent work emails from the past month"

   - get_message: Retrieves a specific message by ID
     * General inputs:
       - agentType: get_message
       - input_parameters:
       {{
           "operation": "get_message",
           "message_id": "message_id_here",      // The ID of the specific message
           "include_attachments": true,          // Whether to include email attachments
           "include_metadata": true              // Whether to include email metadata
       }}
       - input_asset_ids: []  // No input assets needed
       - output_asset_configs: [{{  // Will contain the specific message
           "name": "Retrieved Email",
           "description": "The specific email message with ID",
           "fileType": "json",
           "dataType": "email_list"
       }}]
     * Example: "I'll create a get_message agent job to retrieve the specific email with ID 'abc123'"

   - email_summarizer: Creates a summary of a single email message
     * General inputs:
       - agentType: email_summarizer
       - input_parameters: {{}}  // No parameters needed
       - input_asset_ids: ["email_asset_id"]  // REQUIRED: ID of the email asset to summarize
       - output_asset_configs: [{{  // Will contain the email summary
           "name": "Email Summary",
           "description": "Summary of the email message",
           "fileType": "txt",
           "dataType": "unstructured"
       }}]
     * Example: "I'll create an email_summarizer agent job to summarize this email"

   - email_list_summarizer: Creates summaries of multiple email messages
     * General inputs:
       - agentType: email_list_summarizer
       - input_parameters: {{}}  // No parameters needed
       - input_asset_ids: ["email_list_asset_id"]  // REQUIRED: ID of the email list asset to summarize
       - output_asset_configs: [{{  // Will contain the list of email summaries
           "name": "Email List Summary",
           "description": "Summaries of multiple email messages",
           "fileType": "json",
           "dataType": "generic_list"  // Each item in the list will have: email_id, subject, from, to, date, and summary
       }}]
     * Example: "I'll create an email_list_summarizer agent job to summarize these emails"

3. Direct Asset Generation:
   - You can directly generate assets in your final response
   - Use the "assets" array in your final_response
   - Include all required fields (name, description, fileType, dataType, content)
   - Example: Generating a poem
     {{
         "type": "final_response",
         "response": "Here's a poem I wrote for you:",
         "assets": [
             {{
                 "name": "Generated Poem",
                 "description": "A poem generated by the bot",
                 "fileType": "txt",
                 "dataType": "unstructured",
                 "content": "Roses are red...",
                 "metadata": {{
                     "createdAt": "2024-03-23T12:00:00Z",
                     "creator": "bot",
                     "tags": ["poem", "generated"]
                 }}
             }}
         ]
     }}

CRITICAL: When recommending an agent job, you MUST do TWO things:
1. Add the agent job to the "agent_jobs" array in your response with:
   - agentType: MUST be one of: list_labels, get_messages, get_message, email_summarizer, or email_list_summarizer
   - input_parameters object with:
     * operation: The specific operation to perform (must match agentType)
     * Operation-specific parameters as shown above
   - output_asset_configs: Array of asset configurations that will be created

2. EXPLAIN THE AGENT JOB IN YOUR RESPONSE TEXT. This is MANDATORY. Include:
   - Which operation it will perform
   - All relevant parameters and their values
   - What outputs it will produce
   - How it will help solve the user's problem

Asset Types:
- fileType: The format of the file (txt, pdf, csv, json, png, jpg, jpeg, gif, mp3, mp4, wav, unknown)
- dataType: The type of structured data (unstructured, email_list, generic_list, generic_table)"""

        if assets:
            # Add current assets to the system prompt
            assets_section = "\n\nCurrent Assets Available:\n"
            for asset in assets:
                assets_section += f"""
Asset ID: {asset.asset_id}
Name: {asset.name}
Description: {asset.description or 'No description provided'}
File Type: {asset.fileType}
Data Type: {asset.dataType}
Content: {asset.content}
Metadata: {json.dumps(asset.metadata, indent=2)}
"""
            base_prompt += assets_section
            print("type of asset.content: ", type(asset.content))

        return base_prompt 