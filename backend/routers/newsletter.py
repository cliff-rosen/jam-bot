from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import json
import logging
import uuid

from services.asset_service import AssetService
from services.auth_service import validate_token
from services.newsletter_extraction_service import NewsletterExtractionService
from services.newsletter_summary_service import NewsletterSummaryService
from services.newsletter_summary_report_service import NewsletterSummaryReportService
from schemas.newsletter import Newsletter, NewsletterExtractionRange, TimePeriodType
from schemas.email import EmailAgentResponse
from schemas.asset import Asset, AssetType, AssetStatus, AssetMetadata
from schemas.base import ValueType
from schemas.workflow import Mission, MissionStatus
from schemas.lite_models import AssetLite, create_asset_from_lite
from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/newsletter", tags=["newsletter"])
newsletter_extraction_service = NewsletterExtractionService()
newsletter_summary_service = NewsletterSummaryService()
newsletter_summary_report_service = NewsletterSummaryReportService()

@router.post("/extract", response_model=EmailAgentResponse)
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

@router.post("/extract/range", response_model=EmailAgentResponse)
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

@router.get("/list", response_model=EmailAgentResponse)
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
        query = text(str(query) + " ORDER BY id ASC LIMIT :limit OFFSET :offset")
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

@router.get("/summary", response_model=EmailAgentResponse)
async def get_newsletter_summary(
    period_type: TimePeriodType,
    start_date: date,
    end_date: date,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Get a summary of newsletters for a given period
    
    Args:
        period_type: Type of period to summarize (day, week, month)
        start_date: Start date of the period
        end_date: End date of the period
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with the summary
    """
    try:
        # Get the summary
        summary = await newsletter_summary_service.get_summary(
            db=db,
            period_type=period_type,
            start_date=start_date,
            end_date=end_date
        )
        
        return EmailAgentResponse(
            success=True,
            data=summary.dict() if summary else None,   
            message=f"Successfully retrieved summary for {period_type} from {start_date} to {end_date}"
        )
        
    except Exception as e:
        logger.error(f"Error getting newsletter summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/report", response_model=EmailAgentResponse)
async def get_newsletter_report_as_asset(
    period_type: TimePeriodType,
    start_date: date,
    end_date: date,
    source_name: Optional[str] = None,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Generate a markdown report from newsletter summaries for a given period
    
    Args:
        period_type: Type of period to summarize (day, week, month)
        start_date: Start date of the period
        end_date: End date of the period
        source_name: Optional source name to filter by
        user: Authenticated user
        db: Database session
        
    Returns:
        EmailAgentResponse with the markdown report
    """
    try:
        # Generate the report
        print(f"Generating report for {period_type} from {start_date} to {end_date}")
        report = await newsletter_summary_report_service.generate_report(
            db=db,
            start_date=start_date,
            end_date=end_date,
            period_type=period_type,
            source_name=source_name
        )
        
        # Create an asset
        print(f"Creating asset")
        asset_service = AssetService(db)  # Initialize with the actual session
        asset = asset_service.create_asset(
            user_id=user.user_id,  # Keep as integer to match Asset model
            name=f"{period_type} newsletter report",
            type=AssetType.MARKDOWN.value,  # Use enum value
            subtype="NEWSLETTER_SUMMARY",

            is_array=False,
            content=report,
            asset_metadata={  # Use asset_metadata instead of metadata
                "period_type": period_type,
                "start_date": str(start_date),
                "end_date": str(end_date),
                "source_name": source_name
            }
        )

        return EmailAgentResponse(
            success=True,
            data={"report": report},
            message=f"Successfully generated report for {period_type} from {start_date} to {end_date}"
        )
        
    except Exception as e:
        logger.error(f"Error generating newsletter report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

def create_asset(name: str, description: str, value: Any = None) -> Asset:
    """Create a new asset with the given name and description"""
    current_time = datetime.utcnow()
    
    # Create metadata
    asset_metadata = AssetMetadata(
        created_at=current_time,
        updated_at=current_time,
        creator='newsletter_service',
        custom_metadata={}
    )
    
    # Create the asset
    return Asset(
        id=str(uuid.uuid4()),
        name=name,
        description=description,
        schema_definition=SchemaType(
            type='markdown',  # Use string literal instead of enum
            description=description,
            is_array=False
        ),
        value=value,
        status=AssetStatus.PENDING,
        asset_metadata=asset_metadata
    ) 