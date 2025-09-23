"""
Auto-tracking decorator for SmartSearch2 API endpoints

Provides automatic event tracking with minimal code changes.
"""

import functools
import asyncio
from typing import Callable, Optional, Any
from uuid import uuid4
from fastapi import Request
from sqlalchemy.orm import Session

from services.event_tracking import EventTracker
from models import EventType
from utils.tracking_helpers import get_journey_id_from_request


def auto_track(
    event_type: EventType,
    extract_data_fn: Optional[Callable] = None
):
    """
    Decorator that automatically tracks events for API endpoints

    Args:
        event_type: The EventType to track
        extract_data_fn: Optional function to extract event data from the result
                        Function signature: (result, *args, **kwargs) -> dict

    Example:
        @auto_track(
            EventType.SEARCH_EXECUTE,
            extract_data_fn=lambda result, *args, **kwargs: {
                "query": args[0].query,
                "results_count": len(result.articles)
            }
        )
        async def search(request: SearchRequest, req: Request, db: Session):
            # Your normal endpoint code
            return results

    The decorator will:
    1. Extract user_id and journey_id from the request
    2. Execute your function
    3. Optionally extract data from the result
    4. Track the event automatically
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Find Request, Session, Response, and current_user objects
            request = None
            db = None
            current_user = None
            response = None

            # Check args for Request and other objects
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                # Check if this is a database session (has query method)
                elif hasattr(arg, 'query') and hasattr(arg, 'add'):
                    db = arg
                # Check if this looks like a user object
                elif hasattr(arg, 'user_id') or hasattr(arg, 'id'):
                    current_user = arg
                # Check if this looks like a Response object
                elif hasattr(arg, 'headers') and hasattr(arg, 'status_code'):
                    response = arg

            # Also check kwargs for db Session, current_user, and response
            if not db:
                db = kwargs.get('db')
            if not current_user:
                current_user = kwargs.get('current_user')
            if not response:
                response = kwargs.get('response')

            # If we have db and user, we can track
            if db and current_user:
                try:
                    # Get tracking identifiers
                    user_id = getattr(current_user, 'user_id', str(current_user))
                    journey_id = get_journey_id_from_request(request) if request else None

                    # Skip tracking if no valid journey ID
                    if not journey_id:
                        print(f"[TRACKING ERROR] Skipping event tracking - no valid journey ID for {event_type}")
                        return await func(*args, **kwargs)

                    # Execute the actual function
                    result = await func(*args, **kwargs)

                    # Extract event data if function provided
                    event_data = {}
                    if extract_data_fn:
                        try:
                            event_data = extract_data_fn(result, *args, **kwargs)
                        except Exception as e:
                            # Don't let data extraction failure break the endpoint
                            print(f"Failed to extract event data: {e}")
                            event_data = {"error": "Failed to extract data"}

                    # Track the event
                    try:
                        tracker = EventTracker(db)
                        tracker.track_event(
                            user_id=user_id,
                            journey_id=journey_id,
                            event_type=event_type,
                            event_data=event_data
                        )
                    except Exception as e:
                        # Don't let tracking failure break the endpoint
                        print(f"Failed to track event: {e}")

                    # DO NOT set response headers - frontend owns journey ID management

                    return result

                except Exception as e:
                    # If anything goes wrong, still execute the function
                    print(f"Tracking decorator error: {e}")
                    return await func(*args, **kwargs)
            else:
                # No tracking possible, just execute function
                return await func(*args, **kwargs)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Similar logic for sync functions
            request = None
            db = None
            current_user = None
            response = None

            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif hasattr(arg, 'query') and hasattr(arg, 'add'):
                    db = arg
                elif hasattr(arg, 'user_id') or hasattr(arg, 'id'):
                    current_user = arg
                elif hasattr(arg, 'headers') and hasattr(arg, 'status_code'):
                    response = arg

            if not db:
                db = kwargs.get('db')
            if not current_user:
                current_user = kwargs.get('current_user')
            if not response:
                response = kwargs.get('response')

            if db and current_user:
                try:
                    user_id = getattr(current_user, 'user_id', str(current_user))
                    journey_id = get_journey_id_from_request(request) if request else None

                    # Skip tracking if no valid journey ID
                    if not journey_id:
                        print(f"[TRACKING ERROR] Skipping event tracking - no valid journey ID for {event_type}")
                        return func(*args, **kwargs)

                    # Execute function
                    result = func(*args, **kwargs)

                    # Extract data
                    event_data = {}
                    if extract_data_fn:
                        try:
                            event_data = extract_data_fn(result, *args, **kwargs)
                        except:
                            event_data = {"error": "Failed to extract data"}

                    # Track event
                    try:
                        tracker = EventTracker(db)
                        tracker.track_event(
                            user_id=user_id,
                            journey_id=journey_id,
                            event_type=event_type,
                            event_data=event_data
                        )
                    except:
                        pass

                    # DO NOT set response headers - frontend owns journey ID management

                    return result
                except:
                    return func(*args, **kwargs)
            else:
                return func(*args, **kwargs)

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# Convenient pre-configured decorators for common events

def track_search(extract_data_fn: Optional[Callable] = None):
    """Track a search execution"""
    return auto_track(EventType.SEARCH_EXECUTE, extract_data_fn)


def track_filter(extract_data_fn: Optional[Callable] = None):
    """Track a filter application"""
    return auto_track(EventType.FILTER_APPLY, extract_data_fn)


def track_columns(extract_data_fn: Optional[Callable] = None):
    """Track column extraction"""
    return auto_track(EventType.COLUMNS_ADD, extract_data_fn)


def track_scholar_enrichment(extract_data_fn: Optional[Callable] = None):
    """Track Google Scholar enrichment"""
    return auto_track(EventType.SCHOLAR_ENRICH_COMPLETE, extract_data_fn)