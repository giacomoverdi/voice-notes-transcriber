# 🎙️ Voice Notes Transcriber & Organizer

Un sistema intelligente che trascrive automaticamente le note vocali inviate via email utilizzando il parsing delle email in entrata di Postmark, l'API Google Speech-to-Text, e le organizza con categorizzazione basata su AI.

## ✨ Caratteristiche

### Funzionalità Core
- **📧 Email-to-Transcription**: Invia note vocali come allegati email per ottenere trascrizioni istantanee
- **🎯 Elaborazione AI**: Trascrizione automatica usando Google Speech-to-Text
- **📝 Riassunti Intelligenti**: Generazione di riassunti e estrazione di action items
- **🏷️ Auto-Categorizzazione**: Categorizzazione intelligente basata sul contenuto
- **🔍 Ricerca Full-Text**: Cerca attraverso trascrizioni, riassunti e metadati
- **📱 Dashboard Responsive**: Interfaccia web elegante per gestire le note

### Funzionalità Avanzate
- **🔄 Integrazione Notion**: Sincronizza le note trascritte con il tuo workspace Notion
- **🎵 Riproduzione Audio**: Player audio integrato con visualizzazione dell'onda
- **🌐 Supporto Multilingua**: Trascrivi audio in più lingue
- **📊 Dashboard Analitica**: Monitora pattern di utilizzo e insights
- **🔐 Autenticazione Sicura**: Sistema di autenticazione basato su JWT
- **☁️ Cloud Storage**: Integrazione con Google Cloud Storage per i file audio

## 🚀 Quick Start

### Prerequisiti
- Docker & Docker Compose
- Account Postmark con webhook in entrata configurato
- Credenziali Google Cloud per Speech-to-Text
- (Opzionale) API key Notion per la sincronizzazione
- (Opzionale) Bucket Google Cloud Storage

### 1. Clona il Repository
```bash
git clone https://github.com/giacomoverdi/voice-notes-transcriber.git
cd voice-notes-transcriber
```

### 2. Configurazione Ambiente
```bash
cp .env.example .env
# Modifica .env con le tue API key e configurazione
```

### 3. Esegui con Docker
```bash
# Avvia tutti i servizi
docker-compose up -d

# Visualizza i log
docker-compose logs -f

# Ferma i servizi
docker-compose down
```

L'applicazione sarà disponibile su:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Database: localhost:5432

## 📮 Come Usare

### 1. Configura Postmark Inbound
1. Vai al tuo account Postmark
2. Crea un inbound stream
3. Imposta l'URL del webhook a: `https://tuodominio.com/api/webhook/inbound`
4. Prendi nota del tuo indirizzo email in entrata (es. `abc123@inbound.postmarkapp.com`)

### 2. Invia Note Vocali
Invia le tue note vocali all'indirizzo Postmark in entrata:
- **Oggetto**: Diventa il titolo della nota
- **Corpo**: Contesto aggiuntivo (opzionale)
- **Allegati**: File audio (MP3, WAV, M4A, ecc.)

### 3. Accedi alle Tue Note
1. Visita la dashboard
2. Visualizza trascrizioni, riassunti e action items
3. Cerca, filtra e organizza le tue note
4. Sincronizza con Notion (se configurato)

## 🏗️ Architettura

### Tech Stack
- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Frontend**: React, Vite, TailwindCSS
- **AI/ML**: Google Speech-to-Text
- **Infrastruttura**: Docker, Nginx, Google Cloud Storage
- **APIs**: Postmark, Notion, Google Cloud

### Design del Sistema
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Email     │────▶│   Postmark   │────▶│   Webhook   │
│   Client    │     │   Inbound    │     │   Handler   │
└─────────────┘     └──────────────┘     └─────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │    Queue     │
                                         │   (Redis)    │
                                         └──────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  Google Cloud │
                                        │ Speech-to-Text│
                                        └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │   PostgreSQL  │
                                        │   Database    │
                                        └───────┬───────┘
                                                │
                    ┌──────────────────────┴────────────────────────┐
                    │                                               │
                    ▼                                               ▼
            ┌───────────────┐                               ┌───────────────┐
            │    React      │                               │    Notion     │
            │   Dashboard   │                               │  Integration  │
            └───────────────┘                               └───────────────┘
```

## 🔧 Configurazione

### Variabili d'Ambiente Richieste
```env
# Database
DB_USER=voicenotes
DB_PASSWORD=voicenotes123
DB_NAME=voicenotes

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
GCS_BUCKET_NAME=voice-notes-audio

# Postmark
POSTMARK_SERVER_TOKEN=your-server-token
POSTMARK_INBOUND_ADDRESS=your-inbound@inbound.postmarkapp.com

# JWT
JWT_SECRET=your-secret-key

# Opzionale: Notion
NOTION_API_KEY=your-notion-api-key
NOTION_DATABASE_ID=your-database-id
```

## 📝 Documentazione API

### Endpoint Webhook
```http
POST /api/webhook/inbound
Content-Type: application/json

{
  "From": "user@example.com",
  "Subject": "Meeting Notes",
  "TextBody": "Additional context...",
  "Attachments": [
    {
      "Name": "recording.mp3",
      "Content": "base64-encoded-audio",
      "ContentType": "audio/mpeg"
    }
  ]
}
```

### API Notes
```http
# Get all notes
GET /api/notes
Authorization: Bearer <token>

# Search notes
GET /api/notes/search?q=meeting&category=work

# Get single note
GET /api/notes/:id

# Update note
PUT /api/notes/:id

# Delete note
DELETE /api/notes/:id
```

## 🧪 Testing

### Test Locali
```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### Credenziali Demo
Per scopi dimostrativi:
- Email: `demo@voicenotes.app`
- Password: `demo123`

## 🚢 Deployment

### Produzione con Docker
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# SSL with Let's Encrypt
./scripts/setup-ssl.sh yourdomain.com
```

### Cloud Deployment
- **Google Cloud**: Deploy su Cloud Run o GKE
- **Heroku**: Usa il deployment container
- **DigitalOcean**: Deploy su App Platform

## 🤝 Contribuire

Accogliamo i contributi! Vedi [CONTRIBUTING.md](CONTRIBUTING.md) per le linee guida.

### Setup Sviluppo
```bash
# Installa dipendenze
npm install

# Esegui ambiente di sviluppo
npm run dev

# Esegui con hot reload
npm run dev:watch
```

## 📄 Licenza

Questo progetto è distribuito con licenza MIT - vedi [LICENSE](LICENSE) per i dettagli.

## 🙏 Ringraziamenti

- [Postmark](https://postmarkapp.com) per l'infrastruttura email
- [Google Cloud](https://cloud.google.com) per Speech-to-Text
- [DEV Community](https://dev.to) per aver ospitato la challenge
- Tutti i contributor e tester

## 📧 Contatti

- **Email**: g.verdi@jugaad.digital
- **GitHub**: [@giacomoverdi](https://github.com/giacomoverdi)