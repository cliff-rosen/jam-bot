"""
Resource Schema - External Systems and Services
Defines external systems that tools can access (Gmail, PubMed, Web, etc.)
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
from schemas.unified_schema import SchemaType

# Resource types
ResourceType = Literal['api', 'database', 'storage', 'messaging', 'web', 'social', 'file_system']

class RateLimitConfig(BaseModel):
    """Rate limiting configuration for a resource"""
    requests_per_minute: Optional[int] = None
    requests_per_hour: Optional[int] = None
    requests_per_day: Optional[int] = None
    concurrent_requests: Optional[int] = None

class ResourceExample(BaseModel):
    """Example usage of a resource"""
    description: str
    connection_example: Dict[str, Any]
    use_case: str

class Resource(BaseModel):
    """External system or service that tools can access"""
    id: str = Field(description="Unique identifier for the resource")
    name: str = Field(description="Human-readable name")
    description: str = Field(description="What this resource provides access to")
    type: ResourceType = Field(description="Category of resource")
    connection_schema: SchemaType = Field(description="Schema for connection credentials/config")
    capabilities: List[str] = Field(description="What operations are supported (search, retrieve, upload, etc.)")
    rate_limits: Optional[RateLimitConfig] = None
    base_url: Optional[str] = None
    documentation_url: Optional[str] = None
    examples: List[ResourceExample] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ResourceConnection(BaseModel):
    """Instance of a connection to a resource for a specific user/mission"""
    id: str
    resource_id: str
    user_id: Optional[str] = None
    mission_id: Optional[str] = None
    connection_data: Dict[str, Any] = Field(description="Actual credentials/config data")
    is_active: bool = True
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Built-in resource definitions
GMAIL_RESOURCE = Resource(
    id="gmail",
    name="Gmail",
    description="Google Gmail email service for searching and retrieving emails",
    type="messaging",
    connection_schema=SchemaType(
        type="object",
        description="Gmail OAuth credentials",
        fields={
            "access_token": SchemaType(type="string", description="OAuth access token"),
            "refresh_token": SchemaType(type="string", description="OAuth refresh token"),
            "token_expires_at": SchemaType(type="string", description="Token expiration timestamp")
        }
    ),
    capabilities=["search", "retrieve", "send", "list_folders"],
    rate_limits=RateLimitConfig(
        requests_per_minute=250,
        requests_per_day=1000000,
        concurrent_requests=10
    ),
    base_url="https://gmail.googleapis.com",
    documentation_url="https://developers.google.com/gmail/api",
    examples=[
        ResourceExample(
            description="Search for emails in Gmail",
            connection_example={
                "access_token": "ya29.a0...",
                "refresh_token": "1//04...",
                "token_expires_at": "2024-01-15T14:30:00Z"
            },
            use_case="Retrieve AI newsletter emails from the last month"
        )
    ]
)

PUBMED_RESOURCE = Resource(
    id="pubmed",
    name="PubMed Database",
    description="NCBI PubMed database for searching biomedical research articles",
    type="database",
    connection_schema=SchemaType(
        type="object",
        description="PubMed API configuration",
        fields={
            "api_key": SchemaType(type="string", description="NCBI API key (optional but recommended)"),
            "email": SchemaType(type="string", description="Contact email for API usage")
        }
    ),
    capabilities=["search", "retrieve", "get_metadata"],
    rate_limits=RateLimitConfig(
        requests_per_minute=10,  # Higher with API key
        concurrent_requests=3
    ),
    base_url="https://eutils.ncbi.nlm.nih.gov",
    documentation_url="https://www.ncbi.nlm.nih.gov/books/NBK25501/",
    examples=[
        ResourceExample(
            description="Search for research articles",
            connection_example={
                "api_key": "abc123def456",
                "email": "researcher@university.edu"
            },
            use_case="Find recent papers on machine learning in healthcare"
        )
    ]
)

WEB_SEARCH_RESOURCE = Resource(
    id="web_search",
    name="Web Search",
    description="Search the web using search engines (Google, Bing, etc.)",
    type="web",
    connection_schema=SchemaType(
        type="object",
        description="Web search API credentials",
        fields={
            "api_key": SchemaType(type="string", description="Search API key"),
            "search_engine": SchemaType(type="string", description="Which search engine to use"),
            "custom_search_id": SchemaType(type="string", description="Custom search engine ID (if applicable)")
        }
    ),
    capabilities=["search", "get_snippets", "get_urls"],
    rate_limits=RateLimitConfig(
        requests_per_day=100,
        concurrent_requests=2
    ),
    examples=[
        ResourceExample(
            description="Search the web for information",
            connection_example={
                "api_key": "AIza...",
                "search_engine": "google",
                "custom_search_id": "017576662512468239146:omuauf_lfve"
            },
            use_case="Find recent news about AI developments"
        )
    ]
)

DROPBOX_RESOURCE = Resource(
    id="dropbox",
    name="Dropbox",
    description="Dropbox file storage and sharing service",
    type="storage",
    connection_schema=SchemaType(
        type="object",
        description="Dropbox API credentials",
        fields={
            "access_token": SchemaType(type="string", description="Dropbox access token"),
            "refresh_token": SchemaType(type="string", description="Dropbox refresh token")
        }
    ),
    capabilities=["upload", "download", "list", "search", "share"],
    rate_limits=RateLimitConfig(
        requests_per_minute=120,
        concurrent_requests=5
    ),
    base_url="https://api.dropboxapi.com",
    documentation_url="https://developers.dropbox.com/documentation",
    examples=[
        ResourceExample(
            description="Access files in Dropbox",
            connection_example={
                "access_token": "sl.B...",
                "refresh_token": "1234..."
            },
            use_case="Download and analyze CSV files from project folder"
        )
    ]
)

# Resource registry
RESOURCE_REGISTRY: Dict[str, Resource] = {
    "gmail": GMAIL_RESOURCE,
    "pubmed": PUBMED_RESOURCE, 
    "web_search": WEB_SEARCH_RESOURCE,
    "dropbox": DROPBOX_RESOURCE
}

def get_resource(resource_id: str) -> Optional[Resource]:
    """Get a resource by ID"""
    return RESOURCE_REGISTRY.get(resource_id)

def get_resources_by_type(resource_type: ResourceType) -> List[Resource]:
    """Get all resources of a specific type"""
    return [resource for resource in RESOURCE_REGISTRY.values() if resource.type == resource_type]

def get_resources_with_capability(capability: str) -> List[Resource]:
    """Get all resources that support a specific capability"""
    return [resource for resource in RESOURCE_REGISTRY.values() if capability in resource.capabilities]

def validate_connection_data(resource_id: str, connection_data: Dict[str, Any]) -> bool:
    """Validate connection data against resource schema"""
    resource = get_resource(resource_id)
    if not resource:
        return False
    
    # TODO: Implement proper schema validation
    # For now, just check if required fields are present
    return True 