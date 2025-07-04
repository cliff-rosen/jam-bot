"""
Test file for SearchService

This file contains tests for the web search functionality.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from services.search_service import SearchService
from models import ResourceCredentials


class TestSearchService:
    """Test cases for SearchService"""

    def setup_method(self):
        """Set up test fixtures"""
        self.search_service = SearchService()

    @pytest.fixture
    def mock_credentials(self):
        """Mock credentials for testing"""
        return {
            "api_key": "test_api_key",
            "search_engine": "google",
            "custom_search_id": "test_search_id"
        }

    @pytest.fixture
    def mock_google_response(self):
        """Mock Google API response"""
        return {
            "items": [
                {
                    "title": "Test Result 1",
                    "link": "https://example.com/test1",
                    "snippet": "This is a test search result about AI and machine learning published on 2024-01-15."
                },
                {
                    "title": "Test Result 2", 
                    "link": "https://example.com/test2",
                    "snippet": "Another test result about artificial intelligence."
                }
            ],
            "searchInformation": {
                "totalResults": "2"
            }
        }

    @pytest.fixture
    def mock_duckduckgo_response(self):
        """Mock DuckDuckGo API response"""
        return {
            "AbstractText": "Test abstract about AI research",
            "AbstractURL": "https://example.com/abstract",
            "AbstractSource": "Test Source",
            "RelatedTopics": [
                {
                    "Text": "Related topic about machine learning",
                    "FirstURL": "https://example.com/ml"
                }
            ]
        }

    @patch('services.search_service.ResourceCredentials')
    def test_authenticate_success(self, mock_resource_creds, mock_credentials):
        """Test successful authentication"""
        # Mock database response
        mock_db = Mock()
        mock_creds_obj = Mock()
        mock_creds_obj.credentials = mock_credentials
        mock_resource_creds.return_value = mock_creds_obj
        mock_db.query.return_value.filter.return_value.first.return_value = mock_creds_obj

        # Test authentication
        result = asyncio.run(self.search_service.authenticate(1, mock_db))
        
        assert result is True
        assert self.search_service.api_key == "test_api_key"
        assert self.search_service.search_engine == "google"
        assert self.search_service.custom_search_id == "test_search_id"

    @patch('services.search_service.ResourceCredentials')
    def test_authenticate_no_credentials(self, mock_resource_creds):
        """Test authentication failure when no credentials found"""
        # Mock database response with no credentials
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        # Test authentication
        result = asyncio.run(self.search_service.authenticate(1, mock_db))
        
        assert result is False

    @patch('aiohttp.ClientSession.get')
    async def test_search_google_success(self, mock_get, mock_google_response):
        """Test successful Google search"""
        # Setup authenticated service
        self.search_service.api_key = "test_api_key"
        self.search_service.custom_search_id = "test_search_id"
        self.search_service.search_engine = "google"
        self.search_service.credentials = {"api_key": "test_api_key"}

        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = mock_google_response
        mock_get.return_value.__aenter__.return_value = mock_response

        # Perform search
        result = await self.search_service.search_google("test query", 2)

        # Verify results
        assert "search_results" in result
        assert "search_metadata" in result
        assert len(result["search_results"]) == 2
        assert result["search_results"][0]["title"] == "Test Result 1"
        assert result["search_results"][0]["url"] == "https://example.com/test1"
        assert result["search_results"][0]["rank"] == 1
        assert result["search_metadata"]["query"] == "test query"
        assert result["search_metadata"]["total_results"] == 2

    @patch('aiohttp.ClientSession.get')
    async def test_search_duckduckgo_success(self, mock_get, mock_duckduckgo_response):
        """Test successful DuckDuckGo search"""
        # Setup service
        self.search_service.credentials = {"search_engine": "duckduckgo"}

        # Mock HTTP response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = mock_duckduckgo_response
        mock_get.return_value.__aenter__.return_value = mock_response

        # Perform search
        result = await self.search_service.search_duckduckgo("test query", 2)

        # Verify results
        assert "search_results" in result
        assert "search_metadata" in result
        assert len(result["search_results"]) >= 1
        assert result["search_results"][0]["title"] == "Test Source"
        assert result["search_results"][0]["url"] == "https://example.com/abstract"
        assert result["search_metadata"]["query"] == "test query"

    def test_extract_domain(self):
        """Test domain extraction from URLs"""
        assert self.search_service._extract_domain("https://example.com/path") == "example.com"
        assert self.search_service._extract_domain("http://test.org") == "test.org"
        assert self.search_service._extract_domain("invalid-url") == "invalid-url"

    def test_extract_date_from_snippet(self):
        """Test date extraction from snippets"""
        # Test with ISO date
        snippet1 = "This article was published on 2024-01-15 and discusses AI."
        date1 = self.search_service._extract_date_from_snippet(snippet1)
        assert "2024-01-15" in date1

        # Test with US date format
        snippet2 = "Published 01/15/2024 - Latest AI developments"
        date2 = self.search_service._extract_date_from_snippet(snippet2)
        assert "01-15-2024" in date2

        # Test with no date (should return current date)
        snippet3 = "No date information in this snippet"
        date3 = self.search_service._extract_date_from_snippet(snippet3)
        assert date3 is not None  # Should return current date

    async def test_search_without_authentication(self):
        """Test search without authentication"""
        with pytest.raises(ValueError, match="Search service not authenticated"):
            await self.search_service.search("test query")

    @patch('aiohttp.ClientSession.get')
    async def test_search_api_error(self, mock_get):
        """Test handling of API errors"""
        # Setup authenticated service
        self.search_service.api_key = "test_api_key"
        self.search_service.custom_search_id = "test_search_id"
        self.search_service.search_engine = "google"
        self.search_service.credentials = {"api_key": "test_api_key"}

        # Mock HTTP error response
        mock_response = AsyncMock()
        mock_response.status = 403
        mock_response.text.return_value = "Forbidden: Invalid API key"
        mock_get.return_value.__aenter__.return_value = mock_response

        # Test error handling
        with pytest.raises(Exception, match="Search API error"):
            await self.search_service.search_google("test query")


if __name__ == "__main__":
    import asyncio
    
    # Simple test runner
    service = SearchService()
    
    # Test domain extraction
    print("Testing domain extraction...")
    assert service._extract_domain("https://example.com/path") == "example.com"
    print("✓ Domain extraction works")
    
    # Test date extraction
    print("Testing date extraction...")
    date_result = service._extract_date_from_snippet("Published on 2024-01-15")
    assert "2024-01-15" in date_result
    print("✓ Date extraction works")
    
    print("All basic tests passed!") 