# Session Management Implementation

## Overview

The session management system provides persistent user workspaces that maintain chat conversations, mission state, and user interactions across browser sessions. This implementation enables users to resume their work exactly where they left off, with full context preservation and automatic state recovery.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  AuthContext  →  SessionContext  →  JamBotContext              │
│      ↓              ↓                    ↓                      │
│  User Auth     Session State      Mission/Chat State           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                  │
├─────────────────────────────────────────────────────────────────┤
│  UserSession Router  →  UserSessionService  →  Database        │
│      ↓                      ↓                     ↓             │
│  API Endpoints      Business Logic         Data Persistence    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model Relationships

```
UserSession (1:1) Chat (1:*) ChatMessage
     ↓
UserSession (1:1) Mission (1:*) Hop (1:*) ToolStep
     ↓                    ↓
UserSession (1:*) Asset (mission-scoped)
                         ↓
                  Asset (hop-scoped)
```

## Backend Implementation

### Database Schema

The session management leverages the existing database models with the following key entities:

**UserSession Model:**
```python
class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    name = Column(String(255))
    status = Column(Enum(UserSessionStatus))
    
    # Relationships
    chat_id = Column(String(36), ForeignKey("chats.id"))
    mission_id = Column(String(36), ForeignKey("missions.id"))
    
    # Metadata and timestamps
    session_metadata = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    last_activity_at = Column(DateTime)
```

**Session Status Flow:**
```
ACTIVE → COMPLETED (mission finished)
      → ABANDONED (24+ hours inactive)
      → ARCHIVED (user action or 7+ days abandoned)
```

### Service Layer

**UserSessionService** (`backend/services/user_session_service.py`):

Key methods:
- `create_user_session()`: Creates new session with associated chat
- `get_active_session()`: Retrieves user's current active session
- `update_session_activity()`: Updates last_activity_at timestamp
- `link_mission_to_session()`: Associates mission with session
- `abandon_inactive_sessions()`: Cleanup job for stale sessions

**Session Recovery Logic:**
```python
def get_active_session(user_id: int) -> Optional[UserSession]:
    # 1. Find most recent active session
    # 2. Update last_activity_at
    # 3. Return full session with chat messages and mission
```

### API Endpoints

**Session Router** (`backend/routers/user_session.py`):

```
POST   /api/sessions/                    # Create new session
GET    /api/sessions/                    # List user sessions
GET    /api/sessions/active              # Get active session
GET    /api/sessions/{session_id}        # Get specific session
PUT    /api/sessions/{session_id}        # Update session
POST   /api/sessions/{session_id}/link-mission/{mission_id}  # Link mission
POST   /api/sessions/{session_id}/activity                   # Update activity
POST   /api/sessions/{session_id}/complete                   # Complete session
```

**Authentication Integration:**
- All endpoints use `validate_token` dependency
- User context automatically scoped via JWT token
- Session operations filtered by `user_id`

## Frontend Implementation

### Session API Client

**SessionAPI** (`frontend/src/lib/api/sessionApi.ts`):

```typescript
class SessionApiClient {
    // Core CRUD operations
    async createSession(request: CreateUserSessionRequest): Promise<CreateUserSessionResponse>
    async getActiveSession(): Promise<UserSession | null>
    async updateSession(sessionId: string, request: UpdateUserSessionRequest): Promise<UserSession>
    
    // Session lifecycle
    async initializeSession(name?: string): Promise<CreateUserSessionResponse>
    async completeSession(sessionId: string): Promise<UserSession>
    
    // Activity tracking
    async updateSessionActivity(sessionId: string): Promise<void>
    async autoSaveSession(sessionId: string, metadata?: Record<string, any>): Promise<void>
}
```

### Session Context

**SessionContext** (`frontend/src/context/SessionContext.tsx`):

Manages session state and provides hooks for:
- Session initialization and recovery
- Activity tracking and auto-save
- Mission integration
- Session metadata management

**Key Features:**
- **Auto-recovery**: Attempts to restore session from localStorage or backend
- **Activity tracking**: Updates backend on user interactions
- **Auto-save**: Saves session state every 30 seconds
- **Error handling**: Graceful fallbacks for session failures

```typescript
interface SessionContextType {
    // State
    currentSession: UserSession | null;
    isSessionLoading: boolean;
    sessionError: string | null;
    
    // Session management
    initializeSession: (name?: string) => Promise<UserSession>;
    loadSession: (sessionId: string) => Promise<UserSession | null>;
    linkMissionToSession: (missionId: string) => Promise<void>;
    
    // Persistence
    saveSessionState: (metadata?: Record<string, any>) => Promise<void>;
    recoverSession: () => Promise<UserSession | null>;
    
    // Activity
    updateActivity: () => void;
}
```

## Integration with Existing Systems

### AuthContext Integration

**Session Initialization on Login:**
```typescript
// In AuthContext after successful login
useEffect(() => {
    if (isAuthenticated && user) {
        // SessionContext will handle session recovery/creation
        sessionContext.recoverSession();
    }
}, [isAuthenticated, user]);
```

**Session Cleanup on Logout:**
```typescript
const logout = async () => {
    // Complete current session before logout
    if (currentSession) {
        await sessionContext.completeSession();
    }
    // Clear auth tokens
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
};
```

### JamBotContext Integration

**Session-based State Management:**
```typescript
// JamBotContext should use session for persistence
const { currentSession, linkMissionToSession, saveSessionState } = useSession();

// When mission is created/updated
const handleMissionUpdate = async (mission: Mission) => {
    // Link mission to session
    await linkMissionToSession(mission.id);
    
    // Save current state
    await saveSessionState({
        missionState: mission,
        lastUpdate: new Date().toISOString()
    });
};
```

**Chat Message Persistence:**
```typescript
// Chat messages are automatically persisted via session.chat relationship
const addMessage = async (message: ChatMessage) => {
    // Add to local state
    setMessages(prev => [...prev, message]);
    
    // Backend automatically saves to session.chat.messages
    // Auto-save will sync session metadata
};
```

## Session Lifecycle Management

### Session Creation Flow

```
1. User logs in → AuthContext sets isAuthenticated=true
2. SessionContext.recoverSession() called
3. Check localStorage for currentSessionId
4. If found: Load session from backend
5. If not found: Check for active session
6. If no active session: Create new session
7. Store session ID in localStorage
8. Set up auto-save timer and activity listeners
```

### Session Recovery Flow

```
1. User opens app → AuthContext checks stored token
2. If valid token: User authenticated
3. SessionContext tries to recover session:
   a. Get sessionId from localStorage
   b. Call GET /api/sessions/{sessionId}
   c. If successful: Load full session context
   d. If failed: Fall back to active session
   e. If no active: Create new session
4. Session loaded with full chat history and mission state
```

### Session Persistence

**Auto-save Strategy:**
- **Activity tracking**: Updates `last_activity_at` on user interactions
- **Periodic saves**: Session metadata saved every 30 seconds
- **State snapshots**: Important state changes saved immediately
- **Error handling**: Auto-save failures don't break user experience

**What Gets Saved:**
- Chat messages (via Chat model)
- Mission state (via Mission model)
- Session metadata (JSON field)
- User activity timestamps
- Session lifecycle status

## Data Flow Examples

### Mission Creation and Linking

```
1. User creates mission in JamBotContext
2. Mission saved to database via MissionService
3. JamBotContext calls linkMissionToSession(mission.id)
4. SessionContext updates session.mission_id
5. Backend creates relationship: UserSession → Mission
6. Auto-save persists the linkage
```

### Chat Message Flow

```
1. User sends message in Chat component
2. Message added to JamBotContext.currentMessages
3. Message sent to backend via ChatAPI
4. Backend saves to session.chat.messages
5. Auto-save ensures session metadata is current
```

### Session Recovery

```
1. User opens app after browser restart
2. AuthContext validates stored JWT token
3. SessionContext.recoverSession() called
4. Backend returns full session:
   - Chat with all messages
   - Mission with current state
   - Session metadata
5. JamBotContext populated with recovered state
6. User continues exactly where they left off
```

## Error Handling and Fallbacks

### Session Recovery Failures

```typescript
async recoverSession(): Promise<UserSession | null> {
    try {
        // Try localStorage first
        const storedId = localStorage.getItem('currentSessionId');
        if (storedId) {
            const session = await loadSession(storedId);
            if (session) return session;
        }
        
        // Try active session
        const activeSession = await getActiveSession();
        if (activeSession) return activeSession;
        
        // Create new session as fallback
        return await initializeSession();
    } catch (error) {
        // Graceful degradation
        console.error('Session recovery failed:', error);
        return await initializeSession(); // Always try to create new session
    }
}
```

### Auto-save Failures

```typescript
async saveSessionState(metadata?: Record<string, any>): Promise<void> {
    try {
        await sessionApi.autoSaveSession(currentSession.id, metadata);
    } catch (error) {
        console.warn('Auto-save failed:', error);
        // Don't throw - failures shouldn't break user experience
        // Could implement retry logic or offline queue here
    }
}
```

## Performance Considerations

### Efficient Data Loading

- **Lazy loading**: Only load full session context when needed
- **Pagination**: Chat messages can be paginated for large conversations
- **Selective updates**: Only update changed fields in session updates

### Auto-save Optimization

- **Debouncing**: Activity updates are debounced to prevent spam
- **Batch operations**: Multiple metadata updates batched together
- **Background processing**: Auto-save runs in background without blocking UI

## Security Considerations

### Authentication

- All session endpoints require valid JWT token
- Sessions are automatically scoped to authenticated user
- No cross-user session access possible

### Data Protection

- Session metadata encrypted in database
- Sensitive data not stored in session metadata
- Auto-cleanup of abandoned sessions

## Future Enhancements

### Potential Improvements

1. **Offline Support**: Queue session updates when offline
2. **Session Sharing**: Allow users to share sessions with collaborators
3. **Session Analytics**: Track session patterns and user behavior
4. **Advanced Recovery**: Recover from partial session corruption
5. **Real-time Sync**: WebSocket-based real-time session updates

### Migration Path

The current implementation provides a solid foundation that can be extended without breaking changes:

- Add new session metadata fields
- Implement session sharing via permissions
- Add real-time updates via WebSocket layer
- Extend cleanup policies for enterprise use

## Usage Examples

### Basic Session Management

```typescript
// In a React component
const { currentSession, updateActivity, saveSessionState } = useSession();

// Save important application state
await saveSessionState({
    currentView: 'mission-details',
    selectedHop: hopId,
    lastAction: 'hop-created'
});

// Get saved state
const currentView = getSessionMetadata('currentView');
```

### Mission Integration

```typescript
// When user accepts mission proposal
const handleAcceptMission = async (mission: Mission) => {
    // Save mission via mission service
    const savedMission = await missionApi.createMission(mission);
    
    // Link to current session
    await linkMissionToSession(savedMission.id);
    
    // Update JamBot context
    setMission(savedMission);
};
```

### Session History

```typescript
// List user's previous sessions
const sessions = await listSessions();

// Switch to a previous session
await switchToSession(sessionId);
// This will load the full session state and update contexts
```

This session management system provides a robust, scalable foundation for maintaining user context across browser sessions while integrating seamlessly with the existing authentication and application architecture. 