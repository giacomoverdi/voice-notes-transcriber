# Voice Notes Transcriber Architecture

## Overview

Voice Notes Transcriber is a full-stack application that processes voice notes sent via email, transcribes them using AI, and provides a web interface for management.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Interface                              │
├─────────────────────────────────────────────────────────────────────┤
│                        React Frontend (Vite)                          │
│                    - Dashboard - Audio Player                         │
│                    - Search    - Settings                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────┴─────────────────────────────────────────┐
│                         Nginx Reverse Proxy                           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                      Express.js Backend API                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Webhook    │  │   REST API   │  │ WebSocket    │               │
│  │  Handler    │  │  Endpoints   │  │ (Future)     │               │
│  └─────────────┘  └──────────────┘  └──────────────┘               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                         Service Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Transcription│  │   Storage    │  │   Notion     │              │
│  │   Service    │  │   Service    │  │   Service    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                      External Services                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   OpenAI     │  │   Postmark   │  │   AWS S3     │              │
│  │   Whisper    │  │   Email      │  │   Storage    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                        Data Layer                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  PostgreSQL  │  │    Redis     │  │ File Storage │              │
│  │   Database   │  │    Cache     │  │   (Local/S3) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend (React + Vite)
- **Technology**: React 18, Vite, TailwindCSS
- **State Management**: React Query, Zustand
- **Routing**: React Router v6
- **Components**:
  - Dashboard: Main interface for viewing notes
  - AudioPlayer: WaveSurfer.js integration
  - Search: Real-time search with debouncing
  - Settings: User preferences and integrations

### Backend (Node.js + Express)
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Caching**: Redis
- **Authentication**: JWT
- **File Storage**: Local/AWS S3
- **Key Modules**:
  - Webhook Handler: Processes Postmark inbound emails
  - Transcription Service: OpenAI Whisper integration
  - Category Service: AI-powered categorization
  - Storage Service: Abstract storage layer

### Database Schema

#### Users Table
```sql
- id (UUID, PK)
- email (String, Unique)
- password (String, Hashed)
- name (String)
- settings (JSONB)
- notionCredentials (JSONB)
- createdAt, updatedAt
```

#### Notes Table
```sql
- id (UUID, PK)
- userId (UUID, FK)
- title (String)
- audioUrl (String)
- transcription (Text)
- summary (Text)
- actionItems (JSONB)
- categories (Array)
- duration (Integer)
- metadata (JSONB)
- createdAt, updatedAt
```

## Data Flow

### Email to Transcription Flow
1. User sends email with audio attachment to Postmark address
2. Postmark webhook delivers to `/api/webhook/inbound`
3. Webhook handler validates and extracts audio
4. Audio stored in S3/local storage
5. Transcription job queued
6. Whisper API transcribes audio
7. GPT-4 generates summary and extracts action items
8. AI categorizes the note
9. Data saved to PostgreSQL
10. Optional: Sync to Notion
11. Email confirmation sent to user

### API Request Flow
1. Client makes authenticated request
2. JWT middleware validates token
3. Rate limiter checks request limits
4. Controller processes request
5. Service layer handles business logic
6. Database operations via Sequelize
7. Response sent to client

## Security Architecture

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Bcrypt password hashing
- Role-based access control (future)

### API Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting per endpoint
- Input validation with Joi
- SQL injection prevention via Sequelize

### Data Security
- HTTPS enforcement
- Environment variable management
- Webhook signature validation
- File upload restrictions

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Redis for session management
- S3 for distributed file storage
- Database connection pooling

### Performance Optimizations
- Redis caching for frequent queries
- Database indexing on search fields
- Lazy loading of audio files
- Pagination for large datasets
- Audio chunk processing for large files

### Queue System (Future)
- Bull queue for async jobs
- Separate worker processes
- Job retry mechanisms
- Progress tracking

## Deployment Architecture

### Docker Containers
1. **PostgreSQL**: Database
2. **Redis**: Cache and queues
3. **Backend**: Node.js API
4. **Frontend**: Nginx serving React
5. **Nginx**: Reverse proxy

### Production Considerations
- Health checks for all services
- Graceful shutdown handling
- Log aggregation
- Monitoring integration
- Automated backups

## Technology Choices Rationale

### Why PostgreSQL?
- JSONB support for flexible metadata
- Full-text search capabilities
- Strong consistency guarantees
- Array support for categories/tags

### Why Redis?
- Fast caching layer
- Queue management (Bull)
- Session storage
- Real-time features (future)

### Why React + Vite?
- Fast development experience
- Modern tooling
- Large ecosystem
- Excellent performance

### Why Express.js?
- Mature and stable
- Extensive middleware
- Simple and flexible
- Great TypeScript support (future)

## Future Architecture Enhancements

1. **Microservices Migration**
   - Separate transcription service
   - Independent notification service
   - API Gateway

2. **Real-time Features**
   - WebSocket for live updates
   - Progress tracking
   - Collaborative features

3. **Machine Learning Pipeline**
   - Custom model training
   - Improved categorization
   - Speaker diarization

4. **Multi-tenancy**
   - Organization support
   - Team collaboration
   - Shared workspaces