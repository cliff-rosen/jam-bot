from datetime import datetime
import asyncio
from schemas.newsletter import Newsletter, TimePeriodType
from database import get_db

async def run_newsletter_summary_test():
    from services.newsletter_summary_service import NewsletterSummaryService
    from sqlalchemy.orm import Session

    start_date = datetime(2025, 5, 2)
    end_date = datetime(2025, 5, 3)

    # Initialize the service
    service = NewsletterSummaryService()

    # Get a database session
    db = next(get_db())
    try:
        # Generate summary
        summary = await service.generate_daily_summaries_for_range(
            db=db,
            start_date=start_date,
            end_date=end_date
        )

        print(summary)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_newsletter_summary_test())
