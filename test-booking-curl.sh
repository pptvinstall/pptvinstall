#!/bin/bash

# Test booking creation with curl
echo "🧪 Testing booking creation via curl..."

# Test booking data
BOOKING_DATA='{
  "name": "Test Customer",
  "email": "test@example.com",
  "phone": "(555) 123-4567",
  "streetAddress": "123 Test Street",
  "city": "Atlanta", 
  "state": "GA",
  "zipCode": "30309",
  "preferredDate": "2025-06-20",
  "appointmentTime": "10:00 AM",
  "serviceType": "TV Installation",
  "pricingTotal": 149.99,
  "notes": "Test booking via curl",
  "consentToContact": true,
  "isTestMode": true,
  "tvInstallations": [
    {
      "id": "tv-1",
      "size": "55\"",
      "location": "Living Room",
      "mountType": "fixed",
      "masonryWall": false,
      "highRise": false,
      "outletNeeded": true
    }
  ],
  "smartHomeInstallations": []
}'

echo "📤 Sending booking request..."

# Create booking
RESPONSE=$(curl -s -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d "$BOOKING_DATA")

echo "📥 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Test health endpoint
echo -e "\n🏥 Testing health endpoint..."
curl -s http://localhost:5000/api/health | jq '.' 2>/dev/null

# Test email config
echo -e "\n📧 Testing email configuration..."
curl -s http://localhost:5000/api/email/check-config | jq '.' 2>/dev/null

echo -e "\n✅ Tests complete!"