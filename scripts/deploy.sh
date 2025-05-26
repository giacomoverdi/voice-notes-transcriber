#!/bin/bash

# Voice Notes Transcriber Deployment Script

set -e

ENVIRONMENT=${1:-production}
DOMAIN=${2:-voicenotes.app}

echo "🚀 Deploying Voice Notes Transcriber"
echo "===================================="
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN"
echo ""

# Load environment variables
if [ -f .env.$ENVIRONMENT ]; then
    export $(cat .env.$ENVIRONMENT | xargs)
fi

# Build production images
echo "Building production images..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run database migrations
echo "Running database migrations..."
docker-compose exec backend npm run migrate

# Start services
echo "Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Setup SSL if in production
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Setting up SSL..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Get SSL certificate
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
    
    # Setup auto-renewal
    echo "0 0 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
fi

# Health check
echo "Performing health check..."
sleep 10
curl -f http://localhost:3000/health || exit 1

# Clear cache
echo "Clearing cache..."
docker-compose exec redis redis-cli FLUSHALL

# Restart services
echo "Restarting services..."
docker-compose restart

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Application URLs:"
echo "   Production: https://$DOMAIN"
echo "   API: https://$DOMAIN/api"
echo ""
echo "📊 Monitoring:"
echo "   Logs: docker-compose logs -f"
echo "   Status: docker-compose ps"
echo ""