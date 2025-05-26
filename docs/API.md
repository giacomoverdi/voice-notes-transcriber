# Voice Notes Transcriber API Documentation

## Base URL
```
Development: http://localhost:3000
Production: https://api.yourdomain.com
```

## Authentication
All API endpoints (except auth and webhook) require authentication via JWT token.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "settings": {
    "autoTranscribe": true,
    "emailNotifications": true,
    "notionSync": false
  }
}
```

### Notes

#### Get All Notes
```http
GET /api/notes?page=1&limit=20&archived=false&favorite=true
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `archived` (boolean): Filter archived notes
- `favorite` (boolean): Filter favorite notes
- `sortBy` (string): Sort field (default: createdAt)
- `order` (string): Sort order ASC/DESC (default: DESC)

**Response:**
```json
{
  "notes": [
    {
      "id": "uuid",
      "title": "Meeting Notes",
      "transcription": "...",
      "summary": "...",
      "categories": ["meeting", "work"],
      "duration": 180,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

#### Search Notes
```http
GET /api/notes/search?q=meeting&categories=work,meeting
```

**Query Parameters:**
- `q` (string): Search query
- `categories` (string): Comma-separated categories
- `tags` (string): Comma-separated tags
- `startDate` (date): Start date filter
- `endDate` (date): End date filter

#### Get Note by ID
```http
GET /api/notes/:id
```

#### Update Note
```http
PUT /api/notes/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "tags": ["important", "followup"],
  "categories": ["meeting", "work"]
}
```

#### Delete Note
```http
DELETE /api/notes/:id
```

#### Toggle Favorite
```http
POST /api/notes/:id/favorite
```

#### Toggle Archive
```http
POST /api/notes/:id/archive
```

#### Sync to Notion
```http
POST /api/notes/:id/sync-notion
```

### Audio

#### Stream Audio
```http
GET /api/audio/stream/:noteId
```

Returns audio stream with appropriate headers for playback.

#### Download Audio
```http
GET /api/audio/download/:noteId
```

Returns audio file with download headers.

### Webhook

#### Postmark Inbound
```http
POST /api/webhook/inbound
```

**Headers:**
```
Content-Type: application/json
X-Postmark-Signature: <signature>
```

**Request Body (from Postmark):**
```json
{
  "From": "sender@example.com",
  "Subject": "Voice Note Title",
  "TextBody": "Optional context",
  "Attachments": [
    {
      "Name": "recording.mp3",
      "Content": "base64-encoded-content",
      "ContentType": "audio/mpeg",
      "ContentLength": 1234567
    }
  ]
}
```

### Settings

#### Update Settings
```http
PUT /api/auth/settings
```

**Request Body:**
```json
{
  "settings": {
    "autoTranscribe": true,
    "emailNotifications": false,
    "dailySummary": true,
    "language": "es"
  }
}
```

#### Configure Notion
```http
POST /api/auth/notion
```

**Request Body:**
```json
{
  "apiKey": "secret_...",
  "databaseId": "32-character-id"
}
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- Webhook: 30 requests per minute

## Pagination

Paginated responses include:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

## Webhooks

### Postmark Inbound Email
Configure in Postmark dashboard:
- URL: `https://yourdomain.com/api/webhook/inbound`
- Include raw email content: No
- Include attachments: Yes

## WebSocket Events (Future)

```javascript
// Connect
ws://localhost:3000/socket

// Events
- 'transcription:started'
- 'transcription:progress'
- 'transcription:completed'
- 'transcription:failed'
```