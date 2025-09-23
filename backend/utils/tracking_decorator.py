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


def auto_track_test():
    """
    Minimal test decorator to debug why decorators aren't working
    """
    print("[AUTO_TRACK_TEST] Decorator function called")

    def decorator(func: Callable) -> Callable:
        print(f"[AUTO_TRACK_TEST] Decorating function: {func.__name__}")

        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            print(f"[AUTO_TRACK_TEST] Wrapper executing for {func.__name__}")
            print(f"[AUTO_TRACK_TEST] Args count: {len(args)}")
            print(f"[AUTO_TRACK_TEST] Kwargs keys: {list(kwargs.keys())}")

            # Just call the original function
            result = await func(*args, **kwargs)

            print(f"[AUTO_TRACK_TEST] Function {func.__name__} completed")
            return result

        print(f"[AUTO_TRACK_TEST] Returning wrapper for {func.__name__}")
        return wrapper

    print("[AUTO_TRACK_TEST] Returning decorator")
    return decorator


def auto_track(
    event_type: EventType,
    extract_data_fn: Optional[Callable] = None
):
    """
    Simplified decorator that automatically tracks events for API endpoints

    Only supports async functions (all FastAPI endpoints are async)
    """
    print(f"[AUTO_TRACK] Decorator function called with event type: {event_type}")

    def decorator(func: Callable) -> Callable:
        print(f"[AUTO_TRACK] Decorating function: {func.__name__}")

        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            print(f"[AUTO_TRACK] Wrapper executing for {func.__name__}")
            print(f"[AUTO_TRACK] Args count: {len(args)}")
            print(f"[AUTO_TRACK] Kwargs keys: {list(kwargs.keys())}")

            # Find Request, db Session, and current_user
            request = None
            db = None
            current_user = None

            # Check positional args
            for i, arg in enumerate(args):
                if isinstance(arg, Request):
                    request = arg
                    print(f"[AUTO_TRACK] Found Request at arg[{i}]")

            # Check kwargs (FastAPI passes dependencies as kwargs)
            db = kwargs.get('db')
            current_user = kwargs.get('current_user')

            # Also check kwargs for Request (FastAPI might pass it as kwarg)
            if not request:
                request = kwargs.get('req')  # The parameter name in the function signature is 'req'
                if request:
                    print(f"[AUTO_TRACK] Found Request in kwargs as 'req'")

            if db:
                print(f"[AUTO_TRACK] Found db in kwargs")
            if current_user:
                print(f"[AUTO_TRACK] Found current_user in kwargs: {current_user}")
            if request:
                print(f"[AUTO_TRACK] Request object found: {type(request)}")
            else:
                print(f"[AUTO_TRACK] No Request object found")

            # Execute the original function first
            result = await func(*args, **kwargs)

            # Track if we have what we need
            if db and current_user and request:
                try:
                    user_id = getattr(current_user, 'user_id', str(current_user))
                    journey_id = get_journey_id_from_request(request)

                    if journey_id:
                        print(f"[AUTO_TRACK] Tracking event: user={user_id}, journey={journey_id}, type={event_type}")

                        # Extract event data if function provided
                        event_data = {}
                        if extract_data_fn:
                            try:
                                event_data = extract_data_fn(result, *args, **kwargs)
                            except Exception as e:
                                print(f"[AUTO_TRACK] Failed to extract event data: {e}")

                        # Track the event
                        tracker = EventTracker(db)
                        tracker.track_event(
                            user_id=user_id,
                            journey_id=journey_id,
                            event_type=event_type,
                            event_data=event_data
                        )
                        print(f"[AUTO_TRACK] Event tracked successfully")
                    else:
                        print(f"[AUTO_TRACK ERROR] No journey ID found - skipping tracking")
                except Exception as e:
                    print(f"[AUTO_TRACK ERROR] Failed to track event: {e}")
            else:
                print(f"[AUTO_TRACK] Missing requirements - db: {bool(db)}, user: {bool(current_user)}, request: {bool(request)}")

            return result

        print(f"[AUTO_TRACK] Returning wrapper for {func.__name__}")
        return wrapper

    print("[AUTO_TRACK] Returning decorator")
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