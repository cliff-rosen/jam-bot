from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from langchain_openai import ChatOpenAI
import os
import json
from schemas.newsletter import NewsletterSummary, TimePeriodType
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

class NewsletterSummaryReportService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.system_message = """You are an expert at analyzing and synthesizing information from multiple newsletter summaries about generative AI developments. Your task is to create a comprehensive, well-structured markdown report that identifies patterns, trends, and significant developments across multiple newsletters, with special attention to practical implications for companies building and deploying generative AI applications.

Your report should be organized into clear sections with proper markdown formatting, including headers, lists, and emphasis where appropriate. Focus on actionable insights and practical implications.

Key sections to include:
1. Executive Summary
2. Major Developments
3. Industry Trends
4. Technical Insights
5. Company Highlights
6. Recommendations and Next Steps

For each section:
- Use clear, concise language
- Include specific examples and data points
- Highlight practical implications
- Prioritize information by impact and relevance
- Use bullet points for clarity
- Include relevant context and background

The report should be comprehensive yet concise, focusing on the most significant developments and their practical implications."""

        self.user_message_template = """Please analyze and synthesize the following newsletter summaries from {count} summaries covering the period from {start_date} to {end_date}. Create a comprehensive markdown report that identifies patterns, trends, and significant developments.

Newsletter Summaries:
{summaries}

Focus on practical implications for companies building and deploying AI applications. The report should be well-structured with clear sections and proper markdown formatting."""

    async def generate_report(
        self,
        db: Session,
        start_date: date,
        end_date: date,
        period_type: TimePeriodType,
        source_name: Optional[str] = None
    ) -> str:
        """
        Generate a markdown report from newsletter summaries for a given date range
        
        Args:
            db: Database session
            start_date: Start date of the range
            end_date: End date of the range
            period_type: Type of period to summarize (day, week, month)
            source_name: Optional source name to filter by
            
        Returns:
            Markdown formatted report string
        """
        try:
            # Get summaries for the period
            query = text("""
                SELECT * FROM newsletter_summaries 
                WHERE period_type = :period_type
                AND start_date >= :start_date
                AND end_date <= :end_date
            """)
            params = {
                'period_type': period_type.value,
                'start_date': start_date,
                'end_date': end_date
            }
            
            if source_name:
                query = text(str(query) + " AND metadata->>'source_name' = :source_name")
                params['source_name'] = source_name
                
            result = db.execute(query, params)
            
            # Convert rows to dictionaries
            summaries = []
            for row in result:
                try:
                    summary_data = json.loads(row.summary) if isinstance(row.summary, str) else row.summary
                    summaries.append({
                        'id': row.id,
                        'start_date': row.start_date,
                        'end_date': row.end_date,
                        'summary': summary_data
                    })
                except Exception as e:
                    logger.warning(f"Error processing summary {row.id}: {str(e)}")
                    continue
            
            if not summaries:
                raise ValueError(f"No summaries found for period {start_date} to {end_date}")
            
            # Generate report using LLM
            report = await self._generate_report_content(summaries, start_date, end_date)
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            raise
            
    async def _generate_report_content(
        self,
        summaries: List[Dict[str, Any]],
        start_date: date,
        end_date: date
    ) -> str:
        """
        Generate report content using LLM
        
        Args:
            summaries: List of summary dictionaries
            start_date: Start date of the period
            end_date: End date of the period
            
        Returns:
            Markdown formatted report string
        """
        try:
            # Format summaries for the prompt
            summaries_text = ""
            for summary in summaries:
                summaries_text += f"\nPeriod: {summary['start_date']} to {summary['end_date']}\n"
                summaries_text += f"Summary: {json.dumps(summary['summary'], indent=2)}\n"
            
            # Create prompt template
            prompt = ChatPromptTemplate.from_messages([
                ("system", self.system_message),
                ("human", self.user_message_template)
            ])
            
            # Format the prompt
            formatted_prompt = prompt.format_messages(
                count=len(summaries),
                start_date=start_date,
                end_date=end_date,
                summaries=summaries_text
            )
            
            # Get report from LLM
            print(f"Generating report from {len(summaries)} summaries")
            response = await self.llm.ainvoke(formatted_prompt)
            
            return response.content
            
        except Exception as e:
            logger.error(f"Error generating report content: {str(e)}")
            raise 