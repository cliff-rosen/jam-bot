from typing import List, Optional, Dict, Any
from datetime import datetime
import base64
from bs4 import BeautifulSoup
from sqlalchemy import text
import logging
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config.settings import settings

from models import GoogleOAuth2Credentials
from schemas.email import DateRange

logger = logging.getLogger(__name__)

class EmailService:
    SCOPES = [
        'https://www.googleapis.com/auth/userinfo.profile',  # Match the order from error
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/gmail.readonly',
        'openid'
    ]


    def __init__(self):
        self.service = None
        self.credentials = None

    def has_full_access(self) -> bool:
        """
        Check if we have full access to message content or just metadata
        """
        return 'https://www.googleapis.com/auth/gmail.readonly' in self.credentials.scopes

    async def authenticate(self, user_id: int, db: Session) -> bool:
        """
        Authenticate with Gmail API using stored credentials
        
        Args:
            user_id: User ID
            db: Database session
            
        Returns:
            bool: True if authentication successful, False otherwise
        """
        try:
            # Get credentials from database
            db_credentials = db.query(GoogleOAuth2Credentials).filter(
                GoogleOAuth2Credentials.user_id == user_id
            ).first()
            
            if not db_credentials:
                logger.error(f"No credentials found for user {user_id}")
                return False
                
            # Create credentials object
            self.credentials = Credentials(
                token=db_credentials.token,
                refresh_token=db_credentials.refresh_token,
                token_uri=db_credentials.token_uri,
                client_id=db_credentials.client_id,
                client_secret=db_credentials.client_secret,
                scopes=db_credentials.scopes
            )
            
            # Refresh token if expired
            if self.credentials.expired:
                self.credentials.refresh(Request())
                
                # Update database with new token
                db_credentials.token = self.credentials.token
                db_credentials.expiry = self.credentials.expiry
                db.commit()
            
            # Build Gmail API service
            self.service = build('gmail', 'v1', credentials=self.credentials)
            return True
            
        except Exception as e:
            logger.error(f"Error authenticating with Gmail API: {str(e)}")
            return False

    async def list_labels(self, include_system_labels: bool = True) -> List[Dict[str, Any]]:
        """
        List all email labels/folders
        
        Args:
            include_system_labels: Whether to include system labels
            
        Returns:
            List of label objects
        """
        try:
            if not self.service:
                raise ValueError("Service not initialized. Call authenticate first.")
                
            results = self.service.users().labels().list(userId='me').execute()
            labels = results.get('labels', [])
            
            if not include_system_labels:
                # Filter out system labels
                labels = [label for label in labels if label['type'] != 'system']
                
            return labels
            
        except HttpError as e:
            logger.error(f"Error listing labels: {str(e)}")
            raise

    # Get body - handle different message structures
    def get_body_from_parts(self, parts):
        plain = None
        html = None

        for part in parts:
            # Handle multipart messages
            if part.get('mimeType', '').startswith('multipart/'):
                if 'parts' in part:
                    body = self.get_body_from_parts(part['parts'])
                    if body:
                        return body
            # Handle text/plain
            elif part.get('mimeType') == 'text/plain':
                if 'data' in part['body']:
                    plain = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='replace')
            # Handle text/html
            elif part.get('mimeType') == 'text/html':
                if 'data' in part['body']:
                    html_raw = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='replace')
                    # Clean HTML using BeautifulSoup
                    soup = BeautifulSoup(html_raw, "html.parser")
                    
                    # Remove unwanted elements
                    for element in soup.find_all(['script', 'style', 'meta', 'link', 'noscript', 'iframe', 'form', 'input', 'button', 'img']):
                        element.decompose()
                    
                    # Remove empty tags
                    for tag in soup.find_all():
                        if len(tag.get_text(strip=True)) == 0:
                            tag.decompose()
                    
                    # Clean up whitespace and formatting
                    for tag in soup.find_all(['p', 'div', 'span', 'br']):
                        # Replace multiple spaces with single space
                        if tag.string:
                            tag.string.replace_with(' '.join(tag.string.split()))
                    
                    # Get text with proper spacing and formatting
                    html = soup.get_text(separator='\n', strip=True)
                    # Clean up multiple newlines
                    html = '\n'.join(line.strip() for line in html.split('\n') if line.strip())
        
        # Return both formats if available
        return {
            'html': html,
            'plain': plain
        }
            
    def get_best_body_from_parts(self, parts):
        plain = None
        html = None

        for part in parts:
            print("********************************************************************`")
            print("part mtype: ", part.get('mimeType', ''))
            mime = part.get('mimeType', '')
            body_data = part.get('body', {}).get('data')

            if mime.startswith('multipart/') and 'parts' in part:
                result = self.get_best_body_from_parts(part['parts'])
                if result:
                    return result

            elif mime == 'text/plain' and body_data and not plain:
                plain = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='replace')

            elif mime == 'text/html' and body_data and not html:
                html_raw = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='replace')
                html = BeautifulSoup(html_raw, "html.parser").get_text(separator="\n")

        return plain or html

    async def get_message(
        self,
        message_id: str,
        include_attachments: bool = False,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Get a specific message by ID
        
        Args:
            message_id: Message ID
            include_attachments: Whether to include attachment data (not used)
            include_metadata: Whether to include message metadata (not used)
            
        Returns:
            Message object with essential information
            
        Raises:
            ValueError: If full access is not available
        """
        try:
            logger.info(f"Fetching message {message_id}")
            
            if not self.service:
                logger.error("Service not initialized. Call authenticate first.")
                raise ValueError("Service not initialized. Call authenticate first.")
                
            # Check for full access
            if not self.has_full_access():
                logger.error("Full access to Gmail is required")
                raise ValueError("Full access to Gmail is required. Please reconnect with the correct permissions.")
                
            # Get full message details
            logger.debug(f"Making Gmail API request for message {message_id}")
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'  # Changed from 'metadata' to 'full' to get body
            ).execute()
            
            # Parse message parts
            headers = {}
            body = {'html': None, 'plain': None}
            
            if 'payload' in message:
                payload = message['payload']
                
                # Get headers
                if 'headers' in payload:
                    headers = {
                        header['name'].lower(): header['value']
                        for header in payload['headers']
                    }
                    logger.debug(f"Extracted headers: {list(headers.keys())}")
               
                # Get body
                if 'parts' in payload:
                    logger.info(f"Message {message_id} has multiple parts")
                    body = self.get_body_from_parts(payload['parts'])
                elif 'body' in payload and 'data' in payload['body']:
                    logger.info(f"Message {message_id} has single part")
                    # Convert raw body to plain text
                    raw_body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='replace')
                    body = {'plain': raw_body, 'html': None}
                            
            # Extract essential information
            result = {
                'id': message['id'],
                'date': str(message.get('internalDate', '')),  # Convert to string
                'from': headers.get('from', ''),
                'to': headers.get('to', ''),
                'subject': headers.get('subject', '(No Subject)'),
                'body': body,  # Now always returns {html, plain} structure
                'snippet': message.get('snippet', '')
            }
            
            logger.info(f"Successfully processed message {message_id}")
            return result
            
        except HttpError as e:
            logger.error(f"Gmail API error getting message {message_id}: {str(e)}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting message {message_id}: {str(e)}", exc_info=True)
            raise

    async def get_messages(
        self,
        folders: Optional[List[str]] = None,
        date_range: Optional[DateRange] = None,
        query_terms: Optional[List[str]] = None,
        max_results: int = 100,
        include_attachments: bool = False,
        include_metadata: bool = True,
        db: Optional[Session] = None,
        save_to_newsletters: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get messages from specified folders
        
        Args:
            folders: List of folder/label IDs
            date_range: DateRange object with start and end dates
            query_terms: List of search terms
            max_results: Maximum number of results to return
            include_attachments: Whether to include attachment data (not used)
            include_metadata: Whether to include message metadata (not used)
            db: Database session (used for authentication and saving to newsletters)
            save_to_newsletters: Whether to save messages to newsletters table
            
        Returns:
            List of message objects
        """
        try:
            logger.info(f"Starting get_messages with params: folders={folders}, date_range={date_range}, query_terms={query_terms}, max_results={max_results}")
            
            if not self.service:
                logger.error("Service not initialized. Call authenticate first.")
                raise ValueError("Service not initialized. Call authenticate first.")
                
            # Build search query
            query_parts = []
            
            if date_range:
                if date_range.start:
                    query_parts.append(f'after:{int(date_range.start.timestamp())}')
                if date_range.end:
                    query_parts.append(f'before:{int(date_range.end.timestamp())}')
                    
            if query_terms:
                query_parts.extend(query_terms)
                
            query = ' '.join(query_parts) if query_parts else None
            logger.info(f"Built search query: {query}")
            
            # Get messages with proper label handling
            logger.info(f"Making Gmail API request with query={query}, folders={folders}")
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results,
                labelIds=folders if folders else None
            ).execute()
            
            messages = results.get('messages', [])
            logger.info(f"Retrieved {len(messages)} messages from Gmail API")
            
            detailed_messages = []
            for i, msg in enumerate(messages):
                try:
                    logger.debug(f"Fetching details for message {i+1}/{len(messages)}: {msg['id']}")
                    message = await self.get_message(msg['id'])
                    detailed_messages.append(message)
                    logger.debug(f"Successfully fetched message {i+1}")
                except Exception as e:
                    logger.error(f"Error fetching message {msg['id']}: {str(e)}")
                    continue
                
            logger.info(f"Successfully fetched {len(detailed_messages)} detailed messages")
            return detailed_messages
            
        except HttpError as e:
            logger.error(f"Gmail API error getting messages: {str(e)}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting messages: {str(e)}", exc_info=True)
            raise

    async def store_messages_to_newsletters(self, messages: List[Dict[str, Any]], db: Session) -> List[int]:
        """
        Store a list of email messages in the newsletters table
        
        Args:
            messages: List of message objects from get_messages
            db: Database session
            
        Returns:
            List of inserted newsletter IDs
        """
        try:
            inserted_ids = []
            
            for message in messages:
                # Extract date from internalDate (which is in milliseconds since epoch)
                email_date = datetime.fromtimestamp(int(message['date']) / 1000).date()
                
                # Get the best content - prefer HTML if available, fall back to plain text
                content = message['body'].get('html') or message['body'].get('plain') or ''
                
                # Create newsletter record
                newsletter = {
                    'source_name': message['from'],
                    'issue_identifier': None,  # Can be populated later if needed
                    'email_date': email_date,
                    'subject_line': message['subject'],
                    'raw_content': content,
                    'cleaned_content': None,  # Can be populated later
                    'extraction': '{}',  # Empty JSON object as default
                    'processed_status': 'pending'
                }
                
                # Insert into database using SQLAlchemy text()
                query = text("""
                    INSERT INTO newsletters 
                    (source_name, issue_identifier, email_date, subject_line, 
                     raw_content, cleaned_content, extraction, processed_status)
                    VALUES 
                    (:source_name, :issue_identifier, :email_date, :subject_line,
                     :raw_content, :cleaned_content, :extraction, :processed_status)
                """)
                
                result = db.execute(query, newsletter)
                inserted_ids.append(result.lastrowid)
                
            db.commit()
            return inserted_ids
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error storing messages to newsletters: {str(e)}", exc_info=True)
            raise 

    async def get_messages_and_store(
        self,
        db: Session,
        folders: Optional[List[str]] = None,
        date_range: Optional[DateRange] = None,
        query_terms: Optional[List[str]] = None,
        max_results: int = 100,
        include_attachments: bool = False,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """
        Get messages from Gmail and store them in the newsletters table
        
        Args:
            db: Database session (required)
            folders: List of folder/label IDs
            date_range: DateRange object with start and end dates
            query_terms: List of search terms
            max_results: Maximum number of results to return
            include_attachments: Whether to include attachment data
            include_metadata: Whether to include message metadata
            
        Returns:
            Dictionary containing:
            - messages: List of fetched message objects
            - stored_ids: List of IDs of successfully stored newsletters
            - error: Error message if storage failed (None if successful)
        """
        try:
            # First get the messages
            messages = await self.get_messages(
                folders=folders,
                date_range=date_range,
                query_terms=query_terms,
                max_results=max_results,
                include_attachments=include_attachments,
                include_metadata=include_metadata,
                db=db
            )
            
            # Then store them
            try:
                stored_ids = await self.store_messages_to_newsletters(messages, db)
                return {
                    'messages': messages,
                    'stored_ids': stored_ids,
                    'error': None
                }
            except Exception as e:
                logger.error(f"Error storing messages to newsletters: {str(e)}")
                return {
                    'messages': messages,
                    'stored_ids': [],
                    'error': str(e)
                }
                
        except Exception as e:
            logger.error(f"Error in get_messages_and_store: {str(e)}")
            raise 