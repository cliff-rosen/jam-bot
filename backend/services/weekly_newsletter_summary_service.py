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

class WeeklyNewsletterSummaryService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.prompt = NewsletterSummaryPrompt()

    async def generate_weekly_newsletter_summary_recaps_for_range(
        self,
        db: Session,
        start_date: date,
        end_date: date,
        source_name: Optional[str] = None
    ) -> List[NewsletterSummary]:
        """
        Generate weekly summaries for a given date range
        
        Args:
            db: Database session
            start_date: Start date of the range
            end_date: End date of the range
            source_name: Optional source name to filter by
            
        Returns:
            List of NewsletterSummary objects containing the generated summaries
        """
        try:
            # Generate summaries for each week in the range
            summaries = []
            current_date = start_date
            
            while current_date <= end_date:
                # Calculate the end of the current week
                week_end = min(current_date + timedelta(days=6), end_date)
                
                print(f"Generating summary for period {current_date} to {week_end}")
                summary = await self.generate_newsletter_summary_recap_for_range(
                    db, current_date, week_end, source_name
                )
                summaries.append(summary)
                
                # Move to next week
                current_date = week_end + timedelta(days=1)
                
            return summaries
            
        except Exception as e:
            logger.error(f"Error generating weekly summaries for range: {str(e)}")
            raise

    async def generate_newsletter_summary_recap_for_range(
        self,
        db: Session,
        start_date: date,
        end_date: date,
        source_name: Optional[str] = None
    ) -> NewsletterSummary:
        """
        Generate a summary from daily summaries for a given date range
        
        Args:
            db: Database session
            start_date: Start date of the range
            end_date: End date of the range
            source_name: Optional source name to filter by
            
        Returns:
            NewsletterSummary object containing the generated summary
        """
        try:
            # Get daily summaries for the range
            query = text("""
                SELECT * FROM newsletter_summaries 
                WHERE period_type = :period_type
                AND start_date >= :start_date
                AND end_date <= :end_date
            """)
            params = {
                'period_type': TimePeriodType.DAY.value,
                'start_date': start_date,
                'end_date': end_date
            }
            
            if source_name:
                query = text(str(query) + " AND metadata->>'source_name' = :source_name")
                params['source_name'] = source_name
                
            result = db.execute(query, params)
            
            # Convert rows to dictionaries
            daily_summaries = []
            source_ids = []
            total_source_count = 0
            
            for row in result:
                try:
                    summary_data = json.loads(row.summary) if isinstance(row.summary, str) else row.summary
                    daily_summaries.append({
                        'id': row.id,
                        'start_date': row.start_date,
                        'end_date': row.end_date,
                        'summary': summary_data
                    })
                    source_ids.extend(json.loads(row.source_ids) if isinstance(row.source_ids, str) else row.source_ids)
                    total_source_count += row.source_count
                except Exception as e:
                    logger.warning(f"Error processing daily summary {row.id}: {str(e)}")
                    continue
            
            if not daily_summaries:
                raise ValueError(f"No daily summaries found for period {start_date} to {end_date}")
            
            # Generate summary using LLM
            summary = await self._generate_summary_content(daily_summaries)
            
            # Create summary record
            summary_obj = NewsletterSummary(
                period_type=TimePeriodType.WEEK,  # Still using WEEK as the period type
                start_date=start_date,
                end_date=end_date,
                summary=summary,
                source_count=total_source_count,
                source_ids=source_ids,
                created_at=date.today(),
                updated_at=date.today(),
                metadata={
                    'source_name': source_name,
                    'period_type': TimePeriodType.WEEK.value,
                    'daily_summary_ids': [s['id'] for s in daily_summaries]
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
            summary_dict['period_type'] = TimePeriodType.WEEK.value
            
            db.execute(query, summary_dict)
            db.commit()
            
            return summary_obj
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            raise

    async def _generate_summary_content(self, daily_summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate summary content using LLM
        
        Args:
            daily_summaries: List of daily summary dictionaries
            
        Returns:
            Dictionary containing the summary
        """
        try:
            # Format daily summaries for the prompt
            summaries_text = ""
            for summary in daily_summaries:
                summaries_text += f"\nDate: {summary['start_date']}\n"
                summaries_text += f"Summary: {json.dumps(summary['summary'], indent=2)}\n"
            
            # Create and format the prompt
            formatted_prompt = self.prompt.get_formatted_prompt(
                count=len(daily_summaries),
                extractions=summaries_text
            )
            
            # Get summary from LLM
            print(f"Generating summary from {len(daily_summaries)} daily summaries")
            response = await self.llm.ainvoke(formatted_prompt)
            
            # Parse the response
            print(f"Parsing response: {response.content}")
            summary = self.prompt.parse_response(response.content)
            
            return summary.dict()
            
        except Exception as e:
            logger.error(f"Error generating summary content: {str(e)}")
            raise 