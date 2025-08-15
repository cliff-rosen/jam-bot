"""
Smart Search Session Service

Manages smart search session tracking and database operations.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from models import SmartSearchSession

logger = logging.getLogger(__name__)


class SmartSearchSessionService:
    """Service for managing smart search session operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_session(self, user_id: str, original_question: str) -> SmartSearchSession:
        """Create a new smart search session"""
        try:
            session = SmartSearchSession(
                user_id=user_id,
                original_question=original_question,
                status="in_progress",
                last_step_completed="question_input"
            )
            self.db.add(session)
            self.db.commit()
            self.db.refresh(session)
            
            logger.info(f"Created new smart search session {session.id} for user {user_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to create session for user {user_id}: {e}")
            self.db.rollback()
            raise
    
    def get_session(self, session_id: str, user_id: str) -> Optional[SmartSearchSession]:
        """Get an existing session by ID and user"""
        try:
            session = self.db.query(SmartSearchSession).filter(
                SmartSearchSession.id == session_id,
                SmartSearchSession.user_id == user_id
            ).first()
            
            if not session:
                logger.warning(f"Session {session_id} not found for user {user_id}")
            
            return session
            
        except Exception as e:
            logger.error(f"Failed to get session {session_id} for user {user_id}: {e}")
            raise
    
    def get_or_create_session(self, user_id: str, original_question: str, session_id: Optional[str] = None) -> SmartSearchSession:
        """Get existing session or create new one"""
        if session_id:
            session = self.get_session(session_id, user_id)
            if session:
                return session
        
        # Create new session if none found or no session_id provided
        return self.create_session(user_id, original_question)
    
    def update_refinement_step(self, session_id: str, user_id: str, 
                              refined_question: str, submitted_refined_question: str) -> SmartSearchSession:
        """Update session with question refinement data"""
        try:
            session = self.get_session(session_id, user_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            session.refined_question = refined_question
            session.submitted_refined_question = submitted_refined_question
            session.last_step_completed = "question_refinement"
            session.total_api_calls = (session.total_api_calls or 0) + 1
            
            self.db.commit()
            logger.info(f"Updated refinement step for session {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to update refinement step for session {session_id}: {e}")
            self.db.rollback()
            raise
    
    def update_search_query_step(self, session_id: str, user_id: str,
                                 generated_search_query: str, submitted_search_query: str) -> SmartSearchSession:
        """Update session with search query generation data"""
        try:
            session = self.get_session(session_id, user_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            session.generated_search_query = generated_search_query
            session.submitted_search_query = submitted_search_query
            session.last_step_completed = "search_query_generation"
            session.total_api_calls = (session.total_api_calls or 0) + 1
            
            self.db.commit()
            logger.info(f"Updated search query step for session {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to update search query step for session {session_id}: {e}")
            self.db.rollback()
            raise
    
    def update_search_execution_step(self, session_id: str, user_id: str,
                                    total_available: int, returned: int, sources: List[str],
                                    is_pagination_load: bool = False) -> SmartSearchSession:
        """Update session with search execution data"""
        try:
            session = self.get_session(session_id, user_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # Combine with existing search metadata for pagination tracking
            existing_metadata = session.search_metadata or {}
            
            if is_pagination_load:
                # This is a "load more" request
                pagination_loads = existing_metadata.get("pagination_loads", 0) + 1
                total_retrieved = existing_metadata.get("total_retrieved", 0) + returned
            else:
                # This is the initial search
                pagination_loads = 1
                total_retrieved = returned
            
            search_metadata = {
                "total_available": total_available,
                "total_retrieved": total_retrieved,
                "sources_searched": sources,
                "last_search_timestamp": datetime.utcnow().isoformat(),
                "pagination_loads": pagination_loads
            }
            
            session.search_metadata = search_metadata
            session.articles_retrieved_count = total_retrieved
            session.last_step_completed = "search_execution"
            
            self.db.commit()
            logger.info(f"Updated search execution step for session {session_id} - {'pagination load' if is_pagination_load else 'initial search'}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to update search execution step for session {session_id}: {e}")
            self.db.rollback()
            raise
    
    def update_article_selection_step(self, session_id: str, user_id: str,
                                     selected_count: int) -> SmartSearchSession:
        """Update session with article selection data"""
        try:
            session = self.get_session(session_id, user_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            session.articles_selected_count = selected_count
            session.last_step_completed = "article_selection"
            
            self.db.commit()
            logger.info(f"Updated article selection step for session {session_id} - {selected_count} articles selected")
            return session
            
        except Exception as e:
            logger.error(f"Failed to update article selection step for session {session_id}: {e}")
            self.db.rollback()
            raise
    
    def update_discriminator_step(self, session_id: str, user_id: str,
                                 generated_discriminator: str, submitted_discriminator: str,
                                 strictness: str) -> SmartSearchSession:
        """Update session with discriminator generation data"""
        try:
            session = self.get_session(session_id, user_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            session.generated_discriminator = generated_discriminator
            session.submitted_discriminator = submitted_discriminator
            session.filter_strictness = strictness
            session.last_step_completed = "discriminator_generation"
            session.total_api_calls = (session.total_api_calls or 0) + 1
            
            self.db.commit()
            logger.info(f"Updated discriminator step for session {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to update discriminator step for session {session_id}: {e}")
            self.db.rollback()
            raise
    
    def update_filtering_step(self, session_id: str, user_id: str,
                             total_filtered: int, accepted: int, rejected: int,
                             average_confidence: float, duration_seconds: int) -> SmartSearchSession:
        """Update session with filtering results data"""
        try:
            session = self.get_session(session_id, user_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            filtering_metadata = {
                "total_filtered": total_filtered,
                "accepted": accepted,
                "rejected": rejected,
                "average_confidence": average_confidence,
                "filtering_duration_seconds": duration_seconds,
                "filtering_timestamp": datetime.utcnow().isoformat()
            }
            
            session.filtering_metadata = filtering_metadata
            session.last_step_completed = "filtering"
            session.status = "completed"
            
            # Calculate total session duration
            if session.created_at:
                duration = datetime.utcnow() - session.created_at.replace(tzinfo=None)
                session.session_duration_seconds = int(duration.total_seconds())
            
            self.db.commit()
            logger.info(f"Updated filtering step for session {session_id} - {accepted}/{total_filtered} articles accepted")
            return session
            
        except Exception as e:
            logger.error(f"Failed to update filtering step for session {session_id}: {e}")
            self.db.rollback()
            raise
    
    def mark_session_abandoned(self, session_id: str, user_id: str) -> Optional[SmartSearchSession]:
        """Mark a session as abandoned"""
        try:
            session = self.get_session(session_id, user_id)
            if not session:
                return None
            
            session.status = "abandoned"
            
            # Calculate session duration
            if session.created_at:
                duration = datetime.utcnow() - session.created_at.replace(tzinfo=None)
                session.session_duration_seconds = int(duration.total_seconds())
            
            self.db.commit()
            logger.info(f"Marked session {session_id} as abandoned")
            return session
            
        except Exception as e:
            logger.error(f"Failed to mark session {session_id} as abandoned: {e}")
            self.db.rollback()
            raise
    
    def get_user_sessions(self, user_id: str, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get user's search session history"""
        try:
            sessions = self.db.query(SmartSearchSession).filter(
                SmartSearchSession.user_id == user_id
            ).order_by(SmartSearchSession.created_at.desc()).offset(offset).limit(limit).all()
            
            total = self.db.query(SmartSearchSession).filter(
                SmartSearchSession.user_id == user_id
            ).count()
            
            return {
                "sessions": [session.to_dict() for session in sessions],
                "total": total
            }
            
        except Exception as e:
            logger.error(f"Failed to get sessions for user {user_id}: {e}")
            raise