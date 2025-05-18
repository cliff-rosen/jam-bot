from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from services.auth_service import validate_token
from services.email_service import EmailService
from services.newsletter_extraction_service import NewsletterExtractionService
from schemas.email import (
    EmailLabel,
    EmailMessage,
    EmailSearchParams,
    EmailAgentResponse
)
from schemas.asset import Asset, FileType
from database import get_db
import logging
from fastapi.responses import RedirectResponse
from config.settings import settings
from google_auth_oauthlib.flow import Flow
from models import GoogleOAuth2Credentials, User
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt
import asyncio
import uuid
from schemas.newsletter import Newsletter, NewsletterExtractionRange
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email", tags=["email"])
email_service = EmailService()
newsletter_extraction_service = NewsletterExtractionService()


def credentials_to_dict(credentials):
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }


@router.get("/auth/init")
async def init_oauth2(
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Initialize the OAuth2 flow for Google Mail API
    
    Args:
        user: Authenticated user
        db: Database session
        
    Returns:
        JSON response with the authorization URL
    """
    try:
        # Log the redirect URI being used
        logger.info(f"Using redirect URI: {settings.GOOGLE_REDIRECT_URI}")
        
        # Create OAuth2 flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                    "scopes": email_service.SCOPES
                }
            },
            scopes=email_service.SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        
        # Generate authorization URL
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='false',
            prompt='consent'
        )
        
        # Log the generated authorization URL
        logger.info(f"Generated authorization URL: {auth_url}")
        
        # Store state in session or database for verification
        # For now, we'll use the user_id as part of the state
        state = f"{state}_{user.user_id}"
        
        return {"url": auth_url}
        
    except Exception as e:
        logger.error(f"Error initializing OAuth2 flow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initializing OAuth2 flow: {str(e)}"
        )

@router.get("/auth/callback")
async def oauth2_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    Handle the OAuth2 callback from Google
    
    Args:
        code: Authorization code from Google
        state: State parameter for verification
        db: Database session
        
    Returns:
        JSON response with success status
    """
    try:
        # Log the received parameters
        logger.info(f"Received callback with state: {state}")
        
        # Create OAuth2 flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                    "scopes": email_service.SCOPES
                }
            },
            scopes=email_service.SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Decode the ID token
        try:
            # Add a small delay to ensure token is valid
            await asyncio.sleep(1)
            
            # Get the raw ID token
            raw_id_token = credentials.id_token
            print("Raw ID token: ", raw_id_token)

            # Decode without verification first to get the token data
            decoded_token = jwt.decode(raw_id_token, options={"verify_signature": False})
    
            
            # Get the email from the decoded token
            user_email = decoded_token.get('email')
            if not user_email:
                raise ValueError("No email found in ID token")
                
            logger.info(f"Got email from ID token: {user_email}")
            
        except Exception as e:
            logger.error(f"Error decoding ID token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to decode ID token: {str(e)}"
            )
        
        user = db.query(User).filter(User.email == user_email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User not found for email: {user_email}"
            )
        
        # Store credentials in database
        db_credentials = GoogleOAuth2Credentials(
            user_id=user.user_id,
            token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_uri=credentials.token_uri,
            client_id=credentials.client_id,
            client_secret=credentials.client_secret,
            scopes=credentials.scopes,
            expiry=credentials.expiry
        )
        
        # Update or insert credentials
        existing_credentials = db.query(GoogleOAuth2Credentials).filter(
            GoogleOAuth2Credentials.user_id == user.user_id
        ).first()
        
        if existing_credentials:
            # Check if scopes have changed
            if set(existing_credentials.scopes) != set(credentials.scopes):
                logger.info(f"Scopes have changed for user {user.user_id}. Updating credentials.")
                # Update all fields including scopes
                for key, value in db_credentials.__dict__.items():
                    if key != '_sa_instance_state':
                        setattr(existing_credentials, key, value)
            else:
                # Only update token-related fields if scopes haven't changed
                existing_credentials.token = credentials.token
                existing_credentials.refresh_token = credentials.refresh_token
                existing_credentials.expiry = credentials.expiry
        else:
            db.add(db_credentials)
            
        db.commit()
        
        # Return success response
        return {"success": True, "message": "Gmail connected successfully"}
        
    except Exception as e:
        logger.error(f"Error handling OAuth2 callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error handling OAuth2 callback: {str(e)}"
        )

@router.get("/labels", response_model=EmailAgentResponse)
async def list_labels(
    include_system_labels: bool = True,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    List all email labels/folders
    
    Args:
        include_system_labels: Whether to include system labels
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with list of labels
    """
    try:
        # Authenticate with Gmail API
        if not await email_service.authenticate(user.user_id, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Gmail API"
            )
            
        # Get labels
        labels = await email_service.list_labels(include_system_labels)
        
        return EmailAgentResponse(
            success=True,
            data={'labels': labels},
            metadata={'total_labels': len(labels)}
        )
        
    except Exception as e:
        logger.error(f"Error listing labels: {str(e)}")
        return EmailAgentResponse(
            success=False,
            error=str(e)
        )

@router.post("/messages", response_model=EmailAgentResponse)
async def get_messages(
    params: EmailSearchParams,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Get messages based on search parameters
    
    Args:
        params: Search parameters
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with list of messages
    """
    try:
        # Authenticate with Gmail API
        if not await email_service.authenticate(user.user_id, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Gmail API"
            )
            
        # Get messages
        print(f"Params: {params}")
        messages = await email_service.get_messages(
            folders=params.folders,
            date_range=params.date_range,
            query_terms=params.query_terms,
            max_results=params.max_results,
            include_attachments=params.include_attachments,
            include_metadata=params.include_metadata
        )
        
        return EmailAgentResponse(
            success=True,
            data={
                'messages': messages
            },
            metadata={
                'total_messages': len(messages),
                'query': params.dict()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}")
        return EmailAgentResponse(
            success=False,
            error=str(e)
        )

@router.post("/messages/store", response_model=EmailAgentResponse)
async def get_messages_and_store(
    params: EmailSearchParams,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Get messages from Gmail and store them in the newsletters table
    
    Args:
        params: Email search parameters
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with messages and storage results
    """
    try:
        # Authenticate with Gmail API
        if not await email_service.authenticate(user.user_id, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Gmail API"
            )
            
        # Get messages and store them
        result = await email_service.get_messages_and_store(
            db=db,
            folders=params.folders,
            date_range=params.date_range,
            query_terms=params.query_terms,
            max_results=params.max_results,
            include_attachments=params.include_attachments,
            include_metadata=params.include_metadata
        )
        
        # Check if there was an error storing messages
        if result['error']:
            return EmailAgentResponse(
                success=True,  # Still true because we got the messages
                data={
                    'messages': result['messages'],
                    'stored_ids': result['stored_ids'],
                    'storage_error': result['error']
                },
                message=f"Retrieved {len(result['messages'])} messages. Warning: {result['error']}"
            )
            
        return EmailAgentResponse(
            success=True,
            data={
                'messages': result['messages'],
                'stored_ids': result['stored_ids']
            },
            message=f"Successfully retrieved and stored {len(result['messages'])} messages"
        )
        
    except Exception as e:
        logger.error(f"Error in get_messages_and_store: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/messages/{message_id}", response_model=EmailAgentResponse)
async def get_message(
    message_id: str,
    include_attachments: bool = False,
    include_metadata: bool = True,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Get a specific message by ID
    
    Args:
        message_id: Message ID
        include_attachments: Whether to include attachment data
        include_metadata: Whether to include message metadata
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with message details
    """
    try:
        # Authenticate with Gmail API
        if not await email_service.authenticate(user.user_id, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Gmail API"
            )
            
        # Get message
        message = await email_service.get_message(
            message_id,
            include_attachments=include_attachments,
            include_metadata=include_metadata
        )
        
        return EmailAgentResponse(
            success=True,
            data={'message': message},
            metadata={
                'has_attachments': len(message.get('attachments', [])) > 0,
                'attachment_count': len(message.get('attachments', []))
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting message: {str(e)}")
        return EmailAgentResponse(
            success=False,
            error=str(e)
        )

@router.post("/auth/disconnect")
async def disconnect_gmail(
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Disconnect Gmail by removing OAuth2 credentials
    
    Args:
        user: Authenticated user
        db: Database session
        
    Returns:
        JSON response with success status
    """
    try:
        # Find and delete the user's Gmail credentials
        credentials = db.query(GoogleOAuth2Credentials).filter(
            GoogleOAuth2Credentials.user_id == user.user_id
        ).first()
        
        if credentials:
            db.delete(credentials)
            db.commit()
            return {"success": True, "message": "Gmail disconnected successfully"}
        else:
            return {"success": True, "message": "Gmail was not connected"}
            
    except Exception as e:
        logger.error(f"Error disconnecting Gmail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error disconnecting Gmail: {str(e)}"
        )

@router.post("/newsletter/extract", response_model=EmailAgentResponse)
async def extract_newsletter(
    newsletter: Newsletter,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Extract structured information from a newsletter
    
    Args:
        newsletter: Newsletter data to extract from
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with extracted information
    """
    try:
        # Get the content - prefer cleaned content if available, fall back to raw content
        content = newsletter.cleaned_content or newsletter.raw_content
        
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No content found in newsletter"
            )
            
        # Extract information using AI
        extraction = await newsletter_extraction_service.extract_from_newsletter(
            content=content,
            source=newsletter.source_name,
            date=str(newsletter.email_date)
        )
        
        # Update the newsletter record with the extraction
        from sqlalchemy import text
        query = text("""
            UPDATE newsletters 
            SET extraction = :extraction,
                processed_status = 'extracted'
            WHERE id = :id AND processed_status = 'pending'
        """)
        
        db.execute(query, {
            'extraction': extraction,
            'id': newsletter.id
        })
        db.commit()
        
        return EmailAgentResponse(
            success=True,
            data={
                'newsletter': newsletter.dict(),
                'extraction': extraction
            },
            message="Successfully extracted information from newsletter"
        )
        
    except Exception as e:
        logger.error(f"Error extracting newsletter: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/newsletter/extract/range", response_model=EmailAgentResponse)
async def extract_newsletter_range(
    range: NewsletterExtractionRange,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Extract structured information from a range of newsletters
    
    Args:
        range: Range of newsletter IDs to process
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with extraction results
    """
    try:
        # Get all newsletters in the range
        from sqlalchemy import text
        query = text("""
            SELECT * FROM newsletters 
            WHERE id BETWEEN :min_id AND :max_id
            AND (processed_status IS NULL OR processed_status = 'pending')
        """)
        
        result = db.execute(query, {
            'min_id': range.min_id,
            'max_id': range.max_id
        })
        
        # Convert rows to dictionaries properly
        newsletters = []
        for row in result:
            newsletter = {
                'id': row.id,
                'source_name': row.source_name,
                'issue_identifier': row.issue_identifier,
                'email_date': row.email_date,
                'subject_line': row.subject_line,
                'raw_content': row.raw_content,
                'cleaned_content': row.cleaned_content,
                'extraction': row.extraction,
                'processed_status': row.processed_status
            }
            newsletters.append(newsletter)
        
        if not newsletters:
            return EmailAgentResponse(
                success=True,
                data={'processed': 0},
                message="No pending newsletters found in the specified range"
            )
            
        # Process each newsletter
        processed = 0
        errors = []
        
        for newsletter in newsletters:
            try:
                # Get the content - prefer cleaned content if available, fall back to raw content
                content = newsletter['cleaned_content'] or newsletter['raw_content']
                
                if not content:
                    errors.append(f"Newsletter {newsletter['id']}: No content found")
                    continue
                    
                # Extract information using AI
                extraction = await newsletter_extraction_service.extract_from_newsletter(
                    content=content,
                    source=newsletter['source_name'],
                    date=str(newsletter['email_date'])
                )
                
                # Convert extraction to JSON string
                extraction_json = json.dumps(extraction)
                
                # Update the newsletter record
                update_query = text("""
                    UPDATE newsletters 
                    SET extraction = :extraction,
                        processed_status = 'extracted'
                    WHERE id = :id
                """)
                
                db.execute(update_query, {
                    'extraction': extraction_json,
                    'id': newsletter['id']
                })
                
                processed += 1
                
            except Exception as e:
                error_msg = f"Newsletter {newsletter['id']}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                continue
                
        # Commit all successful updates
        db.commit()
        
        return EmailAgentResponse(
            success=True,
            data={
                'processed': processed,
                'total': len(newsletters),
                'errors': errors if errors else None
            },
            message=f"Successfully processed {processed} out of {len(newsletters)} newsletters"
        )
        
    except Exception as e:
        logger.error(f"Error processing newsletter range: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/newsletters", response_model=EmailAgentResponse)
async def get_newsletters(
    page: int = 1,
    page_size: int = 10,
    source_name: Optional[str] = None,
    processed_status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Retrieve newsletters with pagination and filtering options
    
    Args:
        page: Page number (1-based)
        page_size: Number of items per page
        source_name: Filter by source name
        processed_status: Filter by processing status
        start_date: Filter by start date
        end_date: Filter by end date
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with list of newsletters and pagination info
    """
    try:
        # Build the base query
        from sqlalchemy import text
        query = text("""
            SELECT * FROM newsletters 
            WHERE 1=1
        """)
        params = {}
        
        # Add filters
        if source_name:
            query = text(str(query) + " AND source_name = :source_name")
            params['source_name'] = source_name
            
        if processed_status:
            query = text(str(query) + " AND processed_status = :processed_status")
            params['processed_status'] = processed_status
            
        if start_date:
            query = text(str(query) + " AND email_date >= :start_date")
            params['start_date'] = start_date
            
        if end_date:
            query = text(str(query) + " AND email_date <= :end_date")
            params['end_date'] = end_date
            
        # Add pagination
        offset = (page - 1) * page_size
        query = text(str(query) + " ORDER BY email_date DESC LIMIT :limit OFFSET :offset")
        params['limit'] = page_size
        params['offset'] = offset
        
        # Execute query
        result = db.execute(query, params)
        
        # Convert rows to dictionaries
        newsletters = []
        for row in result:
            # Parse extraction from JSON string to object if it exists
            extraction = None
            if row.extraction:
                try:
                    extraction = json.loads(row.extraction)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse extraction JSON for newsletter {row.id}")
                    extraction = None

            newsletter = {
                'id': row.id,
                'source_name': row.source_name,
                'issue_identifier': row.issue_identifier,
                'email_date': row.email_date,
                'subject_line': row.subject_line,
                'raw_content': row.raw_content,
                'cleaned_content': row.cleaned_content,
                'extraction': extraction,
                'processed_status': row.processed_status
            }
            newsletters.append(newsletter)
            
        # Get total count for pagination
        count_query = text("""
            SELECT COUNT(*) FROM newsletters 
            WHERE 1=1
        """)
        count_params = {k: v for k, v in params.items() if k not in ['limit', 'offset']}
        
        if source_name:
            count_query = text(str(count_query) + " AND source_name = :source_name")
        if processed_status:
            count_query = text(str(count_query) + " AND processed_status = :processed_status")
        if start_date:
            count_query = text(str(count_query) + " AND email_date >= :start_date")
        if end_date:
            count_query = text(str(count_query) + " AND email_date <= :end_date")
            
        total_count = db.execute(count_query, count_params).scalar()
        
        return EmailAgentResponse(
            success=True,
            data={
                'newsletters': newsletters,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                }
            },
            message=f"Successfully retrieved {len(newsletters)} newsletters"
        )
        
    except Exception as e:
        logger.error(f"Error retrieving newsletters: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 