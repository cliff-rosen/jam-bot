"""
User Session Service

This service handles all business logic for user sessions including:
- Session creation and management
- Session lifecycle (active, completed, abandoned, archived)
- Integration with Chat and Mission entities
- Session persistence and recovery
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from uuid import uuid4
import re

from models import UserSession, User, Chat, Mission, ChatMessage, UserSessionStatus
from schemas.user_session import (
    CreateUserSessionRequest, 
    CreateUserSessionResponse,
    UpdateUserSessionRequest,
    ListUserSessionsResponse,
    UserSessionSummary
)
from schemas.chat import Chat as ChatSchema, ChatMessage as ChatMessageSchema
from schemas.workflow import Mission as MissionSchema
from exceptions import NotFoundError, ValidationError


class UserSessionService:
    """Service for managing user sessions"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _generate_next_session_name(self, user_id: int) -> str:
        """Generate the next session name like 'Session 1', 'Session 2', etc."""
        # Get all existing session names for this user
        session_names = self.db.query(UserSession.name).filter(
            UserSession.user_id == user_id
        ).all()
        
        # Extract numbers from session names that match "Session N" pattern
        session_numbers = []
        for (name,) in session_names:
            if name:
                match = re.match(r'^Session (\d+)$', name)
                if match:
                    session_numbers.append(int(match.group(1)))
        
        # Find the next available number
        next_number = max(session_numbers) + 1 if session_numbers else 1
        
        return f"Session {next_number}"
    
    def create_user_session(self, user_id: int, request: CreateUserSessionRequest) -> CreateUserSessionResponse:
        """Create a new user session with associated chat"""
        try:
            # Generate session name if not provided
            session_name = request.name if request.name else self._generate_next_session_name(user_id)
            
            # Create chat first
            chat = Chat(
                id=str(uuid4()),
                user_id=user_id,
                title=session_name,
                context_data={}
            )
            self.db.add(chat)
            self.db.flush()  # Get the chat ID
            
            # Create user session
            user_session = UserSession(
                id=str(uuid4()),
                user_id=user_id,
                name=session_name,
                status=UserSessionStatus.ACTIVE,
                chat_id=chat.id,
                session_metadata=request.session_metadata or {},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_activity_at=datetime.utcnow()
            )
            
            self.db.add(user_session)
            self.db.commit()
            
            # Convert to schemas
            chat_schema = ChatSchema(
                id=chat.id,
                user_session_id=user_session.id,
                title=chat.title,
                chat_metadata=chat.context_data,
                created_at=chat.created_at,
                updated_at=chat.updated_at,
                messages=[]
            )
            
            user_session_schema = self._convert_to_schema(user_session)
            user_session_schema.chat = chat_schema
            
            return CreateUserSessionResponse(
                user_session=user_session_schema,
                chat=chat_schema
            )
            
        except Exception as e:
            self.db.rollback()
            raise ValidationError(f"Failed to create user session: {str(e)}")
    
    def get_user_session(self, user_id: int, session_id: str) -> Optional[UserSession]:
        """Get a specific user session with full context"""
        user_session = self.db.query(UserSession).options(
            joinedload(UserSession.chat).joinedload(Chat.messages),
            joinedload(UserSession.mission).joinedload(Mission.hops)
        ).filter(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        ).first()
        
        if not user_session:
            return None
        
        # Update last activity
        user_session.last_activity_at = datetime.utcnow()
        self.db.commit()
        
        return self._convert_to_schema(user_session)
    
    def list_user_sessions(self, user_id: int, page: int = 1, per_page: int = 20, 
                          status: Optional[UserSessionStatus] = None) -> ListUserSessionsResponse:
        """List user sessions with pagination and filtering"""
        query = self.db.query(UserSession).filter(UserSession.user_id == user_id)
        
        if status:
            query = query.filter(UserSession.status == status)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        sessions = query.order_by(desc(UserSession.last_activity_at)).offset(offset).limit(per_page).all()
        
        # Convert to schemas
        session_schemas = [self._convert_to_schema(session) for session in sessions]
        
        return ListUserSessionsResponse(
            sessions=session_schemas,
            total=total,
            page=page,
            per_page=per_page
        )
    
    def get_active_session(self, user_id: int) -> Optional[UserSession]:
        """Get the user's current active session - lightweight, no relationships"""
        user_session = self.db.query(UserSession).filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.status == UserSessionStatus.ACTIVE
            )
        ).order_by(desc(UserSession.last_activity_at)).first()
        
        if not user_session:
            return None
        
        # Update last activity
        user_session.last_activity_at = datetime.utcnow()
        self.db.commit()
        
        return user_session  # Return model directly, no schema conversion
    
    def update_user_session(self, user_id: int, session_id: str, 
                          request: UpdateUserSessionRequest) -> Optional[UserSession]:
        """Update an existing user session"""
        user_session = self.db.query(UserSession).filter(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        ).first()
        
        if not user_session:
            return None
        
        # Update fields
        if request.name is not None:
            user_session.name = request.name
        if request.status is not None:
            user_session.status = request.status
        if request.mission_id is not None:
            user_session.mission_id = request.mission_id
        if request.session_metadata is not None:
            user_session.session_metadata = request.session_metadata
        
        user_session.updated_at = datetime.utcnow()
        user_session.last_activity_at = datetime.utcnow()
        
        self.db.commit()
        
        return self._convert_to_schema(user_session)
    
    def update_user_session_lightweight(self, user_id: int, session_id: str, 
                                      request: UpdateUserSessionRequest) -> Optional[UserSession]:
        """Update session and return lightweight model (no schema conversion)"""
        user_session = self.db.query(UserSession).filter(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        ).first()
        
        if not user_session:
            return None
        
        # Update fields
        if request.name is not None:
            user_session.name = request.name
        if request.status is not None:
            user_session.status = request.status
        if request.mission_id is not None:
            user_session.mission_id = request.mission_id
        if request.session_metadata is not None:
            user_session.session_metadata = request.session_metadata
        
        user_session.updated_at = datetime.utcnow()
        user_session.last_activity_at = datetime.utcnow()
        
        self.db.commit()
        
        return user_session  # Return model directly
    
    def link_mission_to_session(self, user_id: int, session_id: str, mission_id: str) -> Optional[UserSession]:
        """Link a mission to a user session"""
        user_session = self.db.query(UserSession).filter(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        ).first()
        
        if not user_session:
            return None
        
        # Verify mission exists and belongs to user
        mission = self.db.query(Mission).filter(
            and_(
                Mission.id == mission_id,
                Mission.user_id == user_id
            )
        ).first()
        
        if not mission:
            raise ValidationError("Mission not found or doesn't belong to user")
        
        user_session.mission_id = mission_id
        user_session.updated_at = datetime.utcnow()
        user_session.last_activity_at = datetime.utcnow()
        
        self.db.commit()
        
        return self._convert_to_schema(user_session)
    
    def link_mission_to_session_lightweight(self, user_id: int, session_id: str, mission_id: str) -> Optional[UserSession]:
        """Link a mission to a user session - return lightweight model"""
        user_session = self.db.query(UserSession).filter(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        ).first()
        
        if not user_session:
            return None
        
        # Verify mission exists and belongs to user
        mission = self.db.query(Mission).filter(
            and_(
                Mission.id == mission_id,
                Mission.user_id == user_id
            )
        ).first()
        
        if not mission:
            raise ValidationError("Mission not found or doesn't belong to user")
        
        user_session.mission_id = mission_id
        user_session.updated_at = datetime.utcnow()
        user_session.last_activity_at = datetime.utcnow()
        
        self.db.commit()
        
        return user_session  # Return model directly
    
    def update_session_activity(self, user_id: int, session_id: str):
        """Update session activity timestamp"""
        user_session = self.db.query(UserSession).filter(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        ).first()
        
        if user_session:
            user_session.last_activity_at = datetime.utcnow()
            self.db.commit()
    
    def complete_session(self, user_id: int, session_id: str) -> Optional[UserSession]:
        """Mark session as completed"""
        return self.update_user_session(
            user_id, 
            session_id, 
            UpdateUserSessionRequest(status=UserSessionStatus.COMPLETED)
        )
    
    def abandon_inactive_sessions(self, hours_threshold: int = 24) -> int:
        """Mark inactive sessions as abandoned (cleanup job)"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_threshold)
        
        updated_count = self.db.query(UserSession).filter(
            and_(
                UserSession.status == UserSessionStatus.ACTIVE,
                UserSession.last_activity_at < cutoff_time
            )
        ).update({
            UserSession.status: UserSessionStatus.ABANDONED,
            UserSession.updated_at: datetime.utcnow()
        })
        
        self.db.commit()
        return updated_count
    
    def archive_abandoned_sessions(self, days_threshold: int = 7) -> int:
        """Archive abandoned sessions (cleanup job)"""
        cutoff_time = datetime.utcnow() - timedelta(days=days_threshold)
        
        updated_count = self.db.query(UserSession).filter(
            and_(
                UserSession.status == UserSessionStatus.ABANDONED,
                UserSession.updated_at < cutoff_time
            )
        ).update({
            UserSession.status: UserSessionStatus.ARCHIVED,
            UserSession.updated_at: datetime.utcnow()
        })
        
        self.db.commit()
        return updated_count
    
    def delete_archived_sessions(self, days_threshold: int = 90) -> int:
        """Delete archived sessions (cleanup job)"""
        cutoff_time = datetime.utcnow() - timedelta(days=days_threshold)
        
        deleted_count = self.db.query(UserSession).filter(
            and_(
                UserSession.status == UserSessionStatus.ARCHIVED,
                UserSession.updated_at < cutoff_time
            )
        ).delete()
        
        self.db.commit()
        return deleted_count
    
    def _convert_to_schema(self, user_session: UserSession) -> UserSession:
        """Convert SQLAlchemy model to Pydantic schema"""
        from schemas.user_session import UserSession as UserSessionSchema
        
        # Base session data
        session_data = {
            'id': user_session.id,
            'user_id': user_session.user_id,
            'name': user_session.name,
            'status': user_session.status,
            'session_metadata': user_session.session_metadata,
            'created_at': user_session.created_at.isoformat(),
            'updated_at': user_session.updated_at.isoformat(),
            'last_activity_at': user_session.last_activity_at.isoformat()
        }
        
        # Add relationships if loaded
        if user_session.chat:
            messages = []
            if user_session.chat.messages:
                messages = [
                    ChatMessageSchema(
                        id=msg.id,
                        sequence_order=msg.sequence_order,
                        role=msg.role,
                        content=msg.content,
                        message_metadata=msg.message_metadata,
                        created_at=msg.created_at.isoformat()
                    ) for msg in sorted(user_session.chat.messages, key=lambda x: x.sequence_order)
                ]
            
            session_data['chat'] = ChatSchema(
                id=user_session.chat.id,
                user_session_id=user_session.id,
                title=user_session.chat.title,
                chat_metadata=user_session.chat.context_data,
                created_at=user_session.chat.created_at,
                updated_at=user_session.chat.updated_at,
                messages=messages
            )
        
        if user_session.mission:
            # Import here to avoid circular import
            from services.mission_service import MissionService
            mission_service = MissionService(self.db)
            session_data['mission'] = mission_service.get_mission_schema(user_session.mission)
        
        return UserSessionSchema(**session_data) 