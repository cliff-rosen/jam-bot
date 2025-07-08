"""
Mission Utilities

This module provides utilities for mission processing, sanitization, and 
chat context preparation.
"""

from typing import Dict, Any, Optional, List
from schemas.workflow import Mission, Hop
from schemas.asset import Asset
from schemas.chat import AssetReference
from services.asset_summary_service import AssetSummaryService
from services.asset_service import AssetService


def sanitize_asset_for_chat(asset: Asset) -> dict:
    """
    Sanitize an asset for chat context by removing large content values.
    
    Args:
        asset: The asset to sanitize
        
    Returns:
        Dictionary with asset metadata but no content values
    """
    # Explicitly exclude 'value' field to reduce payload size
    return {
        "id": asset.id,
        "name": asset.name,
        "description": asset.description,
        "schema_definition": asset.schema_definition.model_dump() if asset.schema_definition else None,
        "status": asset.status.value if asset.status else None,
        "subtype": asset.subtype,
        "role": asset.role,
        "asset_metadata": {
            **(asset.asset_metadata.model_dump() if asset.asset_metadata else {}),
            "token_count": getattr(asset.asset_metadata, 'token_count', 0) if asset.asset_metadata else 0
        }
    }


def sanitize_hop_for_chat(hop: Hop) -> dict:
    """
    Sanitize a hop for chat context by removing asset content values.
    
    Args:
        hop: The hop to sanitize
        
    Returns:
        Dictionary with hop data but sanitized assets
    """
    hop_dict = hop.model_dump(mode='json')
    
    # Sanitize hop state assets
    hop_dict['hop_state'] = {
        key: sanitize_asset_for_chat(asset)
        for key, asset in hop.hop_state.items()
    }
    
    return hop_dict


def sanitize_mission_for_chat(mission: Mission) -> dict:
    """
    Sanitize a mission for chat context by removing large asset content values.
    
    Args:
        mission: The mission to sanitize
        
    Returns:
        Dictionary with mission structure but no large asset values
    """
    if not mission:
        return {}
    
    mission_dict = mission.model_dump(mode='json')
    
    # Sanitize mission state assets
    mission_dict['mission_state'] = {
        key: sanitize_asset_for_chat(asset)
        for key, asset in mission.mission_state.items()
    }
    
    # Sanitize current hop
    if mission.current_hop:
        mission_dict['current_hop'] = sanitize_hop_for_chat(mission.current_hop)
    
    # Sanitize hop history
    mission_dict['hop_history'] = [
        sanitize_hop_for_chat(hop) for hop in mission.hop_history
    ]
    
    # Sanitize input and output assets using helper methods
    mission_dict['inputs'] = [
        sanitize_asset_for_chat(asset) for asset in mission.get_inputs()
    ]
    mission_dict['outputs'] = [
        sanitize_asset_for_chat(asset) for asset in mission.get_outputs()
    ]
    
    return mission_dict


async def enrich_chat_context_with_assets(
    chat_payload: dict, 
    user_id: int, 
    db: Any
) -> dict:
    """
    Enrich chat context with asset summaries fetched from the backend.
    
    Args:
        chat_payload: The incoming chat payload
        user_id: User ID for asset fetching
        db: Database session
        
    Returns:
        Enhanced payload with asset summaries
    """
    enriched_payload = chat_payload.copy()
    
    try:
        # Fetch asset summaries from the backend
        asset_service = AssetService()
        summary_service = AssetSummaryService()
        
        # Get all user assets
        assets = asset_service.get_user_assets(user_id)
        
        # Create summaries as a dictionary with asset_id as key
        asset_summaries = {}
        for asset in assets:
            summary = summary_service.create_asset_summary(asset)
            asset_summaries[asset.id] = summary.summary
        
        # Add to payload
        enriched_payload['asset_summaries'] = asset_summaries
        
    except Exception as e:
        print(f"Failed to enrich chat context with assets: {e}")
        # Continue without asset summaries rather than failing
        enriched_payload['asset_summaries'] = {}
    
    return enriched_payload


async def prepare_chat_context(
    mission: Optional[Mission], 
    user_id: int, 
    db: Any,
    additional_payload: Optional[dict] = None
) -> dict:
    """
    Prepare complete chat context with sanitized mission and asset summaries.
    
    Args:
        mission: The mission to include in context
        user_id: User ID for asset fetching
        db: Database session
        additional_payload: Any additional payload data
        
    Returns:
        Complete chat context payload
    """
    # Start with sanitized mission
    payload = {
        "mission": sanitize_mission_for_chat(mission) if mission else None
    }
    
    # Add additional payload if provided
    if additional_payload:
        payload.update(additional_payload)
    
    # Enrich with asset summaries
    return await enrich_chat_context_with_assets(payload, user_id, db) 