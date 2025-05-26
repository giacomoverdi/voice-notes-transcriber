#!/bin/bash

# Voice Notes Transcriber Setup Script

set -e

echo "🎙️ Voice Notes Transcriber Setup"
echo "================================"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create necessary directories
echo "Creating directories..."
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p docker/ssl

# Copy environment files
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys"
fi

if [ ! -f backend/.env ]; then
    echo "Creating backend/.env file..."
    cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend/.env file..."
    cp frontend/.env.example frontend/.env
fi

# Build Docker images
echo "Building Docker images..."
docker-compose build

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec backend npm run migrate

# Seed default categories
echo "Seeding default data..."
docker-compose exec backend npm run seed

# Check service health
echo "Checking services..."
docker-compose ps

# Display success message
echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:3000"
echo "   Health Check: http://localhost:3000/health"
echo ""
echo "📧 Send voice notes to:"
echo "   $(grep POSTMARK_INBOUND_ADDRESS .env | cut -d '=' -f2)"
echo ""
echo "📚 Next steps:"
echo "   1. Edit .env file with your API keys"
echo "   2. Restart services: docker-compose restart"
echo "   3. Check logs: docker-compose logs -f"
echo ""
echo "Happy transcribing! 🎉"