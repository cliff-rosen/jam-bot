from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from langchain_openai import ChatOpenAI
import os
import json
from schemas.newsletter import NewsletterSummary, TimePeriodType
from agents.prompts.newsletter_summary import NewsletterSummaryPrompt

logger = logging.getLogger(__name__)

class NewsletterSummaryService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY")
            )
        self.prompt = NewsletterSummaryPrompt()


    async def generate_daily_newsletter_recaps_for_range(
        self,
        db: Session,
        start_date: date,
        end_date: date
    ) -> List[NewsletterSummary]:
        """
        Generate daily summaries for a given date range
        
        Args:
            db: Database session
            start_date: Start date of the range
        

        Returns:
            List of NewsletterSummary objects containing the generated summaries
        """
        try:
               
            # Generate summaries for each day in the range
            summaries = []
            for day in range((end_date - start_date).days + 1):
                print("--------------------------------")
                print(f"Generating summary for day {day + 1} from {start_date} to {end_date}")
                current_date = start_date + timedelta(days=day)
                summary = await self.generate_newsletter_recap_for_range(db, TimePeriodType.DAY, current_date, current_date)
                summaries.append(summary)
                
            return summaries
            
        except Exception as e:
            logger.error(f"Error generating daily summaries for range: {str(e)}")
            raise
   
            
    async def generate_newsletter_recap_for_range(
        self,
        db: Session,
        period_type: TimePeriodType,
        start_date: date,
        end_date: date,
        source_name: Optional[str] = None
    ) -> NewsletterSummary:
        """
        Generate a summary of newsletters for a given time period
        
        Args:
            db: Database session
            period_type: Type of time period (day, week, month)
            start_date: Start date of the period
            end_date: End date of the period
            source_name: Optional source name to filter by
            
        Returns:
            NewsletterSummary object containing the generated summary
        """
        try:
            # Get newsletters for the period
            query = text("""
                SELECT * FROM newsletters 
                WHERE email_date BETWEEN :start_date AND :end_date
                AND processed_status = 'extracted'
            """)
            params = {
                'start_date': start_date,
                'end_date': end_date
            }
            
            if source_name:
                query = text(str(query) + " AND source_name = :source_name")
                params['source_name'] = source_name
                
            result = db.execute(query, params)

            print(f"Retrieved newsletter count of {result.rowcount}")

            # Convert rows to dictionaries
            newsletters = []
            source_ids = []
            for row in result:
                print(f"Processing newsletter {row.id}")
                try:
                    extraction = row.extraction
                    if isinstance(extraction, str):
                        extraction = json.loads(extraction)
                    newsletters.append({
                        'id': row.id,
                        'source_name': row.source_name,
                        'email_date': row.email_date,
                        'extraction': extraction
                    })
                    source_ids.append(row.id)
                except Exception as e:
                    logger.warning(f"Error processing newsletter {row.id}: {str(e)}")
                    continue
            
            if not newsletters:
                raise ValueError(f"No processed newsletters found for period {start_date} to {end_date}")
                
            # Generate summary using LLM
            summary = await self._generate_summary_content(newsletters)
            
            # Create summary record
            summary_obj = NewsletterSummary(
                period_type=period_type,
                start_date=start_date,
                end_date=end_date,
                summary=summary,
                source_count=len(newsletters),
                source_ids=source_ids,
                created_at=date.today(),
                updated_at=date.today(),
                metadata={
                    'source_name': source_name,
                    'period_type': period_type
                }
            )
            
            # Store in database
            query = text("""
                INSERT INTO newsletter_summaries 
                (period_type, start_date, end_date, summary, source_count, 
                 source_ids, created_at, updated_at, metadata)
                VALUES 
                (:period_type, :start_date, :end_date, :summary, :source_count,
                 :source_ids, :created_at, :updated_at, :metadata)
            """)
            
            # Convert all JSON fields to strings for MariaDB
            summary_dict = summary_obj.dict()
            summary_dict['summary'] = json.dumps(summary_dict['summary'])
            summary_dict['metadata'] = json.dumps(summary_dict['metadata'])
            summary_dict['source_ids'] = json.dumps(summary_dict['source_ids'])
            summary_dict['period_type'] = period_type.value  # Use the enum value instead of the full enum string
            
            db.execute(query, summary_dict)
            db.commit()
            
            return summary_obj
            
        except Exception as e:
            logger.error(f"Error generating newsletter summary: {str(e)}")
            raise
            
    async def _generate_summary_content(self, newsletters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate summary content using LLM
        
        Args:
            newsletters: List of newsletter dictionaries with extractions
            
        Returns:
            Dictionary containing the summary
        """
        try:
            # Format extractions for the prompt
            extractions_text = ""
            for newsletter in newsletters:
                extractions_text += f"\nSource: {newsletter['source_name']}\nDate: {newsletter['email_date']}\n"
                extractions_text += f"Extraction: {json.dumps(newsletter['extraction'], indent=2)}\n"
            
            # Create and format the prompt
            formatted_prompt = self.prompt.get_formatted_prompt(
                count=len(newsletters),
                extractions=extractions_text
            )
            
            # Get summary from LLM
            print(f"Generating summary for {len(newsletters)} newsletters")
            response = await self.llm.ainvoke(formatted_prompt)
            
            # Parse the response
            print(f"Parsing response: {response.content}")
            summary = self.prompt.parse_response(response.content)
            
            return summary.dict()
            
        except Exception as e:
            logger.error(f"Error generating summary content: {str(e)}")
            raise
            
    async def get_summary(
        self,
        db: Session,
        period_type: TimePeriodType,
        start_date: date,
        end_date: date,
        source_name: Optional[str] = None
    ) -> Optional[NewsletterSummary]:
        """
        Get an existing summary for a time period
        
        Args:
            db: Database session
            period_type: Type of time period
            start_date: Start date
            end_date: End date
            source_name: Optional source name filter
            
        Returns:
            NewsletterSummary if found, None otherwise
        """
        try:
            query = text("""
                SELECT * FROM newsletter_summaries 
                WHERE period_type = :period_type
                AND start_date = :start_date
                AND end_date = :end_date
            """)
            params = {
                'period_type': period_type,
                'start_date': start_date,
                'end_date': end_date
            }
            
            if source_name:
                query = text(str(query) + " AND metadata->>'source_name' = :source_name")
                params['source_name'] = source_name
                
            result = db.execute(query, params).first()
            
            if not result:
                return None
                
            # Parse JSON strings from database into Python objects
            summary_data = json.loads(result.summary) if isinstance(result.summary, str) else result.summary
            source_ids = json.loads(result.source_ids) if isinstance(result.source_ids, str) else result.source_ids
            metadata = json.loads(result.metadata) if isinstance(result.metadata, str) else result.metadata
                
            return NewsletterSummary(
                id=result.id,
                period_type=result.period_type,
                start_date=result.start_date,
                end_date=result.end_date,
                summary=summary_data,
                source_count=result.source_count,
                source_ids=source_ids,
                created_at=result.created_at,
                updated_at=result.updated_at,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Error getting newsletter summary: {str(e)}")
            raise 