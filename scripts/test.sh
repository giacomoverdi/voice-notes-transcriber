#!/bin/bash

# Voice Notes Transcriber Test Script

set -e

echo "🧪 Running Tests"
echo "================"

# Backend tests
echo "Running backend tests..."
docker-compose exec backend npm test

# Frontend tests
echo "Running frontend tests..."
docker-compose exec frontend npm test

# API integration tests
echo "Running API tests..."

# Test health endpoint
echo "Testing health endpoint..."
curl -f http://localhost:3000/health || exit 1

# Test webhook endpoint
echo "Testing webhook endpoint..."
curl -X POST http://localhost:3000/api/webhook/health \
  -H "Content-Type: application/json" \
  -f || exit 1

# Test authentication
echo "Testing authentication..."
RESPONSE=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -s)

if [[ $RESPONSE == *"error"* ]]; then
  echo "✅ Auth endpoint working (expected error for test credentials)"
else
  echo "❌ Auth endpoint not responding correctly"
  exit 1
fi

echo ""
echo "✅ All tests passed!"