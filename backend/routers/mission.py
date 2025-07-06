from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from services.auth_service import validate_token
from services.mission_service import MissionService
from schemas.workflow import Mission

router = APIRouter(prefix="/missions", tags=["missions"])


@router.post("/", response_model=dict)
async def create_mission(
    mission: Mission,
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """Create a new mission"""
    try:
        mission_service = MissionService(db)
        mission_id = await mission_service.create_mission(current_user.user_id, mission)
        return {"mission_id": mission_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{mission_id}", response_model=Mission)
async def get_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """Get a mission by ID"""
    try:
        mission_service = MissionService(db)
        mission = await mission_service.get_mission(mission_id, current_user.user_id)
        if not mission:
            raise HTTPException(status_code=404, detail="Mission not found")
        return mission
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{mission_id}")
async def update_mission(
    mission_id: str,
    mission: Mission,
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """Update an existing mission"""
    try:
        mission_service = MissionService(db)
        success = await mission_service.update_mission(mission_id, current_user.user_id, mission)
        if not success:
            raise HTTPException(status_code=404, detail="Mission not found")
        return {"message": "Mission updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{mission_id}")
async def delete_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """Delete a mission"""
    try:
        mission_service = MissionService(db)
        success = await mission_service.delete_mission(mission_id, current_user.user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Mission not found")
        return {"message": "Mission deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Mission])
async def get_user_missions(
    db: Session = Depends(get_db),
    current_user = Depends(validate_token)
):
    """Get all missions for the current user"""
    try:
        mission_service = MissionService(db)
        missions = await mission_service.get_user_missions(current_user.user_id)
        return missions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 