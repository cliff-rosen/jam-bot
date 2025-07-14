# Type Safety Best Practices

## Overview

This document establishes best practices for type safety across the full stack, ensuring consistency, maintainability, and developer experience. We use Pydantic for Python backend schemas and TypeScript for frontend type definitions.

## Core Principles

### 1. Type Contract Consistency
- **Backend responses must have explicit Pydantic schemas**
- **Frontend must have corresponding TypeScript types**
- **API contracts should be clearly defined and documented**
- **Type mismatches should be caught at compile/build time**

### 2. Separation of Concerns
- **Database Models**: SQLAlchemy models for data persistence
- **Python Schemas**: Pydantic models for business logic and API contracts
- **TypeScript Types**: Frontend representations that match API contracts
- **Each layer serves a specific purpose and should not be conflated**

### 3. Progressive Type Safety
- **Start with basic types and add complexity incrementally**
- **Use union types and optionals appropriately**
- **Leverage type inference where possible, explicit typing where necessary**

## Backend Type Safety (Python + Pydantic)

### API Endpoint Patterns

#### ✅ CORRECT: Explicit Response Schemas
```python
from pydantic import BaseModel, Field
from fastapi import APIRouter

class UserSessionLightweightResponse(BaseModel):
    """Lightweight response containing just session pointers/IDs"""
    id: str = Field(description="Session ID")
    user_id: int = Field(description="User ID")
    name: Optional[str] = Field(description="Session name")
    chat_id: str = Field(description="Associated chat ID")
    mission_id: Optional[str] = Field(default=None, description="Associated mission ID if exists")
    session_metadata: Dict[str, Any] = Field(default_factory=dict, description="Session metadata")

@router.post("/initialize", response_model=UserSessionLightweightResponse)
async def initialize_session(
    request: CreateUserSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
) -> UserSessionLightweightResponse:
    """Create new session with fresh chat when none exists"""
    service = UserSessionService(db)
    response = service.create_user_session(current_user.user_id, request)
    
    return UserSessionLightweightResponse(
        id=response.user_session.id,
        user_id=response.user_session.user_id,
        name=response.user_session.name,
        chat_id=response.chat.id,
        mission_id=response.user_session.mission.id if response.user_session.mission else None,
        session_metadata=response.user_session.session_metadata
    )
```

#### ❌ INCORRECT: Raw Dictionary Returns
```python
# DON'T DO THIS - No type safety, poor API docs
@router.post("/initialize")
async def initialize_session(request: CreateUserSessionRequest):
    service = UserSessionService(db)
    response = service.create_user_session(current_user.user_id, request)
    
    # Raw dictionary - no validation, no type checking
    return {
        "id": response.user_session.id,
        "user_id": response.user_session.user_id,
        "name": response.user_session.name,
        # ... more fields
    }
```

### Schema Design Patterns

#### Multiple Response Models for Different Use Cases
```python
class UserSession(BaseModel):
    """Full user session model with all relationships"""
    id: str
    name: Optional[str]
    status: UserSessionStatus
    chat: Optional[Chat] = None
    mission: Optional[Mission] = None
    # ... all fields

class UserSessionLightweightResponse(BaseModel):
    """Lightweight response for list/summary endpoints"""
    id: str
    user_id: int
    name: Optional[str]
    chat_id: str
    mission_id: Optional[str]
    session_metadata: Dict[str, Any]

class UserSessionSummary(BaseModel):
    """Summary model for analytics/reporting"""
    id: str
    name: Optional[str]
    status: UserSessionStatus
    message_count: int
    has_mission: bool
    created_at: datetime
```

#### Request/Response Pair Patterns
```python
class CreateUserSessionRequest(BaseModel):
    """Request schema with validation"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    session_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class CreateUserSessionResponse(BaseModel):
    """Response schema matching what frontend expects"""
    user_session: UserSession
    chat: Chat
```

### Type Annotations Best Practices

#### Function Signatures
```python
# ✅ Always include return type annotations
async def get_user_session(user_id: int, session_id: str) -> UserSession:
    ...

# ✅ Use proper generic types
async def list_user_sessions(user_id: int) -> List[UserSessionSummary]:
    ...

# ✅ Use Union for multiple possible return types
async def find_session(identifier: str) -> Union[UserSession, None]:
    ...
```

#### Variable Annotations
```python
# ✅ Annotate variables when type isn't obvious
user_sessions: List[UserSession] = []
session_data: Dict[str, Any] = response.json()
created_at: datetime = datetime.utcnow()

# ✅ Use type hints for complex data structures
session_mapping: Dict[str, UserSession] = {
    session.id: session for session in user_sessions
}
```

### Pydantic Configuration Best Practices

#### Field Definitions
```python
class UserSession(BaseModel):
    # ✅ Use Field() for validation and documentation
    id: str = Field(description="Unique identifier for the session")
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: UserSessionStatus = Field(default=UserSessionStatus.ACTIVE)
    session_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # ✅ Use proper datetime handling
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

#### Model Configuration
```python
class UserSession(BaseModel):
    # ✅ Enable ORM mode for SQLAlchemy integration
    model_config = ConfigDict(from_attributes=True)
    
    # ✅ Use proper JSON encoders for complex types
    @field_serializer('created_at')
    def serialize_datetime(self, value: datetime) -> str:
        return value.isoformat()
```

## Frontend Type Safety (TypeScript)

### API Client Patterns

#### Type-Safe API Calls
```typescript
// ✅ Define backend response type
interface CreateUserSessionBackendResponse {
    id: string;
    user_id: number;
    name?: string;
    chat_id: string;
    mission_id?: string;
    session_metadata: Record<string, any>;
}

// ✅ Define frontend expected type
interface CreateUserSessionResponse {
    user_session: UserSession;
    chat: Chat;
}

class SessionApiClient {
    async initializeSession(request: CreateUserSessionRequest): Promise<CreateUserSessionResponse> {
        const response = await api.post('/api/sessions/initialize', request);
        
        // ✅ Type the response data
        const data: CreateUserSessionBackendResponse = response.data;
        
        // ✅ Transform to frontend format with proper typing
        return {
            user_session: {
                id: data.id,
                user_id: data.user_id,
                name: data.name || request.name || 'Session',
                status: UserSessionStatus.ACTIVE,
                session_metadata: data.session_metadata || {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString()
            },
            chat: {
                id: data.chat_id,
                user_session_id: data.id,
                title: data.name || request.name || 'Session',
                chat_metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                messages: []
            }
        };
    }
}
```

#### Generic API Patterns
```typescript
// ✅ Create reusable generic types
interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
}

// ✅ Use generics for type safety
async function fetchPaginated<T>(
    endpoint: string,
    params: Record<string, any> = {}
): Promise<PaginatedResponse<T>> {
    const response = await api.get(endpoint, { params });
    return response.data;
}
```

### Type Definition Patterns

#### Enum Usage
```typescript
// ✅ Use const enums for better performance
export const enum UserSessionStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    ABANDONED = 'abandoned',
    ARCHIVED = 'archived'
}

// ✅ Create type unions for validation
export type UserSessionStatusType = keyof typeof UserSessionStatus;
```

#### Interface Design
```typescript
// ✅ Use clear, descriptive interfaces
export interface UserSession {
    // Core fields
    id: string;
    name?: string;
    status: UserSessionStatus;
    
    // Relationships
    chat_id: string;
    mission_id?: string;
    
    // Metadata
    session_metadata: Record<string, any>;
    
    // Timestamps
    created_at: string;
    updated_at: string;
    last_activity_at: string;
    
    // Optional relationships (populated by services)
    chat?: Chat;
    mission?: Mission;
}

// ✅ Create specialized variants
export interface UserSessionSummary {
    id: string;
    name?: string;
    status: UserSessionStatus;
    created_at: string;
    updated_at: string;
    last_activity_at: string;
    
    // Summary fields
    message_count: number;
    has_mission: boolean;
}
```

### Component Props Typing

```typescript
// ✅ Define clear prop interfaces
interface UserSessionCardProps {
    session: UserSessionSummary;
    onSelect?: (session: UserSessionSummary) => void;
    onDelete?: (sessionId: string) => void;
    className?: string;
}

// ✅ Use proper event typing
interface ChatInputProps {
    onSubmit: (message: string) => void;
    onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
}
```

## Type Synchronization Patterns

### Backend-to-Frontend Type Mapping

#### 1. Direct Mapping (Simple Cases)
```python
# Backend
class UserSessionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
```

```typescript
// Frontend - Keep in sync manually
export enum UserSessionStatus {
    ACTIVE = "active",
    COMPLETED = "completed"
}
```

#### 2. Transformation Mapping (Complex Cases)
```python
# Backend returns lightweight response
class UserSessionLightweightResponse(BaseModel):
    id: str
    user_id: int
    chat_id: str
    mission_id: Optional[str]
```

```typescript
// Frontend expects full object
interface CreateUserSessionResponse {
    user_session: UserSession;  // Constructed from backend response
    chat: Chat;                 // Constructed from backend response
}
```

### Validation Patterns

#### Backend Validation
```python
class CreateUserSessionRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    session_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip() == '':
            raise ValueError('Name cannot be empty string')
        return v
```

#### Frontend Validation
```typescript
interface CreateUserSessionRequest {
    name?: string;
    session_metadata?: Record<string, any>;
}

function validateCreateSessionRequest(request: CreateUserSessionRequest): string[] {
    const errors: string[] = [];
    
    if (request.name !== undefined) {
        if (typeof request.name !== 'string') {
            errors.push('Name must be a string');
        } else if (request.name.trim() === '') {
            errors.push('Name cannot be empty');
        } else if (request.name.length > 255) {
            errors.push('Name must be less than 255 characters');
        }
    }
    
    return errors;
}
```

## Documentation and Maintenance

### Schema Documentation
```python
class UserSession(BaseModel):
    """
    User session representing a workspace/conversation container.
    
    A user session is created when a user starts a new conversation
    and persists until the session is completed, abandoned, or archived.
    Each session contains exactly one chat and optionally one mission.
    """
    id: str = Field(description="Unique identifier for the session")
    name: Optional[str] = Field(
        default=None, 
        description="User-provided name for the session (auto-generated if not provided)"
    )
    status: UserSessionStatus = Field(
        default=UserSessionStatus.ACTIVE,
        description="Current lifecycle status of the session"
    )
```

### Type Change Management
1. **Version API endpoints** when making breaking changes
2. **Maintain backward compatibility** during transitions
3. **Document type changes** in migration guides
4. **Use deprecation warnings** before removing old types

### Testing Type Safety
```python
# Backend: Test response schemas
def test_initialize_session_response_schema():
    response = initialize_session(request, db, current_user)
    assert isinstance(response, UserSessionLightweightResponse)
    assert response.id is not None
    assert response.user_id == current_user.user_id
```

```typescript
// Frontend: Test API client types
describe('SessionApiClient', () => {
    it('should return properly typed response', async () => {
        const response = await sessionApi.initializeSession({
            name: 'Test Session'
        });
        
        expect(response.user_session.id).toBeDefined();
        expect(response.user_session.status).toBe(UserSessionStatus.ACTIVE);
        expect(response.chat.id).toBeDefined();
    });
});
```

## Common Anti-Patterns to Avoid

### ❌ Backend Anti-Patterns

1. **Returning raw dictionaries**
```python
# DON'T DO THIS
return {"id": session.id, "name": session.name}  # No type safety
```

2. **Missing response models**
```python
# DON'T DO THIS
@router.get("/sessions")  # No response_model specified
async def get_sessions():
    return sessions
```

3. **Inconsistent field naming**
```python
# DON'T DO THIS - Mixed naming conventions
class UserSession(BaseModel):
    id: str
    userName: str      # camelCase
    created_at: str    # snake_case
    chatId: str        # camelCase
```

### ❌ Frontend Anti-Patterns

1. **Using `any` type**
```typescript
// DON'T DO THIS
const data: any = response.data;  // Loses all type safety
```

2. **Missing type annotations**
```typescript
// DON'T DO THIS
const sessionApi = {
    initializeSession: (request) => {  // No types
        return api.post('/api/sessions/initialize', request);
    }
};
```

3. **Inconsistent interfaces**
```typescript
// DON'T DO THIS - Inconsistent field names
interface UserSession {
    id: string;
    user_id: number;    // snake_case
    chatId: string;     // camelCase
    mission_id?: string; // snake_case
}
```

## Tools and Automation

### Recommended Tools
- **Backend**: mypy for static type checking
- **Frontend**: TypeScript strict mode
- **API Documentation**: FastAPI automatic OpenAPI generation
- **Testing**: pytest with type checking, Jest with TypeScript

### CI/CD Integration
```yaml
# .github/workflows/type-check.yml
name: Type Check
on: [push, pull_request]

jobs:
  backend-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run mypy
        run: mypy backend/

  frontend-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run TypeScript compiler
        run: npx tsc --noEmit
```

## Conclusion

Proper type safety across the full stack requires:
1. **Explicit schemas** for all API endpoints
2. **Consistent naming** conventions
3. **Clear documentation** of type contracts
4. **Proper validation** at boundaries
5. **Testing** of type safety
6. **Tooling** to catch type errors early

Following these patterns will result in:
- Better developer experience
- Fewer runtime errors
- Improved API documentation
- Easier refactoring and maintenance
- More reliable code

Remember: **Type safety is not just about catching errors—it's about making code more maintainable, self-documenting, and easier to understand.** 