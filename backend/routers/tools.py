from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Tuple
from datetime import datetime
from uuid import uuid4
import random
import json
import base64
import re

from database import get_db
from models import Tool, PromptTemplate, WorkflowStep, File, FileImage
from schemas import (
    ToolResponse, PromptTemplateResponse, LLMExecuteRequest, LLMExecuteResponse,
    PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest, ToolSignature
)
from services.ai_service import AIService
from services.auth_service import validate_token
from models import User
from services import ai_service
from routers.files import get_file_content_as_text
from services.workflow_service import WorkflowService
from services.pubmed_service import pubmed_service

router = APIRouter(
    prefix="/api",
    tags=["tools"]
)

# Initialize AI service
ai_service = AIService()

async def process_template_with_files(
    user_message: str,
    system_message: str | None,
    file_tokens: List[Dict[str, str]],
    file_variables: Dict[str, str],
    db: Session
) -> Tuple[List[Dict[str, Any]], str | None]:
    """
    Process a template with file tokens and return content parts and updated system message.
    
    Args:
        user_message: The user message template with file tokens
        system_message: Optional system message template
        file_tokens: List of file token definitions
        file_variables: Dictionary mapping token names to file IDs
        db: Database session
        
    Returns:
        Tuple of (content parts list, updated system message)
    """
    content_parts = []
    current_text = user_message

    # Handle file tokens
    for token in file_tokens:
        token_name = token['name']
        if token_name not in file_variables:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required file token: {token_name}"
            )

        # Split on the current file token
        parts = current_text.split(f"<<file:{token_name}>>")
        
        # Add any text before the token
        if parts[0].strip():
            content_parts.append({
                'type': 'text',
                'text': parts[0].strip()
            })

        # Get and process the file
        file_id = file_variables[token_name]
        file = db.query(File).filter(File.file_id == file_id).first()
        if not file:
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {file_id}"
            )

        # Add extracted text if available
        if file.extracted_text:
            content_parts.append({
                'type': 'text',
                'text': file.extracted_text
            })

        # Get and add associated images
        images = db.query(FileImage).filter(FileImage.file_id == file_id).all()
        for image in images:
            content_parts.append({
                'type': 'image',
                'source': {
                    'type': 'base64',
                    'media_type': image.mime_type or 'image/jpeg',
                    'data': base64.b64encode(image.image_data).decode('utf-8')
                }
            })

        # Update current_text to the remainder
        current_text = parts[1] if len(parts) > 1 else ""

    # Add any remaining text
    if current_text.strip():
        content_parts.append({
            'type': 'text',
            'text': current_text.strip()
        })

    return content_parts, system_message

@router.get("/tools", response_model=List[ToolResponse])
def get_tools(db: Session = Depends(get_db)):
    """Get all available tools"""
    return db.query(Tool).all()

@router.get("/tools/{tool_id}", response_model=ToolResponse)
def get_tool(tool_id: str, db: Session = Depends(get_db)):
    """Get a specific tool by ID"""
    tool = db.query(Tool).filter(Tool.tool_id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool

@router.get("/prompt-templates", response_model=List[PromptTemplateResponse])
async def list_prompt_templates(db: Session = Depends(get_db)):
    """List all prompt templates"""
    templates = db.query(PromptTemplate).all()
    return templates

@router.get("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
async def get_prompt_template(template_id: str, db: Session = Depends(get_db)):
    """Get a prompt template by ID"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.get("/prompt-templates/{template_id}/signature", response_model=ToolSignature)
async def get_prompt_template_signature(template_id: str, db: Session = Depends(get_db)):
    """Get a prompt template's tool signature"""
    workflow_service = WorkflowService(db)
    signature = workflow_service._get_llm_signature(template_id)
    return signature

@router.post("/prompt-templates", response_model=PromptTemplateResponse)
async def create_prompt_template(
    template: PromptTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new prompt template"""
    db_template = PromptTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: str,
    template: PromptTemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update a prompt template"""
    db_template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for key, value in template.model_dump(exclude_unset=True).items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/prompt-templates/{template_id}")
async def delete_prompt_template(template_id: str, db: Session = Depends(get_db)):
    """Delete a prompt template"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"status": "success"}

@router.post("/prompt-templates/test", response_model=LLMExecuteResponse)
async def test_prompt_template(
    test_data: PromptTemplateTest,
    db: Session = Depends(get_db)
):
    """Test a prompt template with parameters"""
    try:
        # Format both templates
        user_message = test_data.user_message_template
        system_message = test_data.system_message_template
        
        # Replace string tokens in both templates
        string_tokens = [t['name'] for t in test_data.tokens if t['type'] == 'string']
        for token_name in string_tokens:
            if token_name not in test_data.parameters:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required string token: {token_name}"
                )
            value = str(test_data.parameters[token_name])
            if system_message:
                system_message = system_message.replace(f"{{{{{token_name}}}}}", value)
            user_message = user_message.replace(f"{{{{{token_name}}}}}", value)

        # Process file tokens
        file_tokens = [t for t in test_data.tokens if t['type'] == 'file']
        content_parts, system_message = await process_template_with_files(
            user_message=user_message,
            system_message=system_message,
            file_tokens=file_tokens,
            file_variables=test_data.parameters,
            db=db
        )

        # Build messages array (only user message)
        messages = [{
            'role': 'user',
            'content': content_parts if content_parts else user_message
        }]

        # Execute the LLM request with system message as separate parameter
        response = await ai_service.send_messages(
            messages=messages,
            max_tokens=1000,
            system=system_message if system_message else None
        )

        # Process response based on schema type
        if test_data.output_schema["type"] == "object":
            try:
                response = json.loads(response)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"LLM response was not valid JSON: {str(e)}"
                )

        return LLMExecuteResponse(
            template_id=None,
            messages=messages,
            response=response
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute_llm", response_model=LLMExecuteResponse)
async def execute_llm(request: LLMExecuteRequest, db: Session = Depends(get_db)):
    """Execute an LLM prompt template with provided parameters"""
    template = db.query(PromptTemplate).filter(PromptTemplate.template_id == request.prompt_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Validate all required tokens are provided
    for token in template.tokens:
        if token['type'] == 'string' and token['name'] not in request.regular_variables:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required string token: {token['name']}"
            )
        elif token['type'] == 'file' and token['name'] not in request.file_variables:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required file token: {token['name']}"
            )

    try:
        # Format both templates
        user_message = template.user_message_template
        system_message = template.system_message_template

        # Replace string tokens in both templates
        string_tokens = [t['name'] for t in template.tokens if t['type'] == 'string']
        for token_name in string_tokens:
            value = str(request.regular_variables[token_name])
            if system_message:
                system_message = system_message.replace(f"{{{{{token_name}}}}}", value)
            user_message = user_message.replace(f"{{{{{token_name}}}}}", value)

        # Process file tokens
        file_tokens = [t for t in template.tokens if t['type'] == 'file']
        content_parts, system_message = await process_template_with_files(
            user_message=user_message,
            system_message=system_message,
            file_tokens=file_tokens,
            file_variables=request.file_variables,
            db=db
        )

        # Build messages array
        messages = [{
            'role': 'user',
            'content': content_parts if content_parts else user_message
        }]

        # Call LLM using AI service
        llm_response = await ai_service.send_messages(
            messages=messages,
            model=request.model,
            max_tokens=request.max_tokens,
            system=system_message if system_message else None
        )

        # Process response based on schema type
        response = llm_response
        if template.output_schema["type"] == "object":
            try:
                response = json.loads(llm_response)
            except json.JSONDecodeError as e:
                print(f"LLM response was not valid JSON")
                print(f"LLM response: {llm_response}")                
                raise HTTPException(
                    status_code=422,
                    detail=f"LLM response was not valid JSON: {str(e)}"
                )

        return LLMExecuteResponse(
            template_id=template.template_id,
            messages=messages,
            response=response
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pubmed/search")
async def search_pubmed(query: str, db: Session = Depends(get_db)):
    """Search PubMed for articles"""
    try:
        results = await pubmed_service.search(query)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
    
