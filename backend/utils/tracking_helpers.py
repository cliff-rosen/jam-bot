"""
Helper functions for event tracking

Utilities to extract user and journey information from requests.
"""

from typing import Optional
from uuid import uuid4
from fastapi import Request


def get_user_id_from_current_user(current_user) -> str:
    """
    Extract user ID from authenticated user object

    Args:
        current_user: Authenticated user object from validate_token

    Returns:
        User identifier string
    """
    if hasattr(current_user, 'user_id'):
        return current_user.user_id
    elif hasattr(current_user, 'id'):
        return current_user.id
    else:
        return str(current_user)


def get_journey_id_from_request(request: Request) -> str:
    """
    Extract or generate journey ID from request

    Tries in order:
    1. X-Journey-Id header (from frontend)
    2. journey_id from query parameters
    3. Generates new UUID if not found

    Args:
        request: FastAPI Request object

    Returns:
        Journey identifier string
    """
    # Try headers (primary method)
    if 'X-Journey-Id' in request.headers:
        journey_id = request.headers['X-Journey-Id']
        print(f"[TRACKING ERROR] Found X-Journey-Id header: '{journey_id}'")
        if journey_id and journey_id.strip():  # Make sure it's not empty or whitespace
            print(f"[TRACKING] Using journey ID from header: {journey_id}")
            return journey_id
        else:
            print(f"[TRACKING ERROR] Header journey ID was empty or whitespace")

    # Try query parameters (backup method)
    if 'journey_id' in request.query_params:
        journey_id = request.query_params['journey_id']
        print(f"[TRACKING] Found journey_id in query params: '{journey_id}'")
        if journey_id and journey_id.strip():  # Make sure it's not empty or whitespace
            print(f"[TRACKING] Using journey ID from query: {journey_id}")
            return journey_id

    # TRACKING ERROR: Frontend should ALWAYS provide journey ID
    # Log this as an error and return None to skip tracking
    print(f"[TRACKING ERROR] No valid journey ID provided by frontend! Request path: {request.url.path if request else 'unknown'}")
    print(f"[TRACKING ERROR] Headers: {dict(request.headers) if request else 'no request'}")
    return None  # Return None to indicate tracking should be skipped


def add_journey_to_response_header(response, journey_id: str):
    """
    Add journey ID to response headers

    This helps the frontend track the journey across requests

    Args:
        response: FastAPI Response object
        journey_id: Journey identifier
    """
    response.headers['X-Journey-Id'] = journey_id
    return response


def create_journey_context(request: Request) -> dict:
    """
    Create a tracking context dictionary from request

    Args:
        request: FastAPI Request object

    Returns:
        Dictionary with user_id and journey_id
    """
    return {
        'user_id': get_user_id_from_request(request),
        'journey_id': get_journey_id_from_request(request)
    }


# Pre-built data extractors for common endpoints

def extract_search_data(result, *args, **kwargs) -> dict:
    """Extract data from search endpoint result"""
    # Try to get request from args first, then kwargs
    request = args[0] if args else kwargs.get('request')

    data = {
        'source': 'unknown',
        'query': 'unknown',
        'results_count': 0
    }

    # Try to extract from request
    if request and hasattr(request, 'query'):
        data['query'] = request.query
    if request and hasattr(request, 'source'):
        data['source'] = request.source

    # Try to extract from result
    if hasattr(result, 'articles'):
        data['results_count'] = len(result.articles)
    elif hasattr(result, 'pagination'):
        data['results_count'] = result.pagination.returned if hasattr(result.pagination, 'returned') else 0

    return data


def extract_filter_data(result, *args, **kwargs) -> dict:
    """Extract data from filter endpoint result"""
    request = args[0] if args else None
    data = {
        'filter_condition': 'unknown',
        'strictness': 'medium',
        'input_count': 0,
        'accepted': 0,
        'rejected': 0
    }

    # Extract from request
    if request:
        if hasattr(request, 'filter_condition'):
            data['filter_condition'] = request.filter_condition
        if hasattr(request, 'strictness'):
            data['strictness'] = request.strictness

    # Extract from result
    if hasattr(result, 'total_processed'):
        data['input_count'] = result.total_processed
    if hasattr(result, 'total_accepted'):
        data['accepted'] = result.total_accepted
    if hasattr(result, 'total_rejected'):
        data['rejected'] = result.total_rejected
    if hasattr(result, 'average_confidence'):
        data['average_confidence'] = result.average_confidence

    return data


def extract_columns_data(result, *args, **kwargs) -> dict:
    """Extract data from column extraction endpoint result"""
    request = args[0] if args else None
    data = {
        'features_count': 0,
        'articles_processed': 0,
        'success_rate': 0.0
    }

    # Extract from request
    if request and hasattr(request, 'features'):
        data['features_count'] = len(request.features)
        data['features'] = [
            {'name': f.name, 'description': f.description}
            for f in request.features
            if hasattr(f, 'name') and hasattr(f, 'description')
        ]

    # Extract from result
    if hasattr(result, 'results'):
        data['articles_processed'] = len(result.results)
        # Calculate success rate
        successful = sum(1 for r in result.results.values() if r and not r.get('error'))
        data['success_rate'] = successful / len(result.results) if result.results else 0

    return data


def extract_scholar_data(result, *args, **kwargs) -> dict:
    """Extract data from Google Scholar enrichment result"""
    data = {
        'keywords': 'unknown',
        'articles_added': 0
    }

    # Extract from result
    if isinstance(result, list):
        data['articles_added'] = len(result)
    elif hasattr(result, 'articles'):
        data['articles_added'] = len(result.articles)

    # Try to get keywords from request
    request = args[0] if args else None
    if request and hasattr(request, 'keywords'):
        data['keywords'] = request.keywords

    return data