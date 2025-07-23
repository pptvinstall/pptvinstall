#!/bin/bash

# Staging deployment script for Picture Perfect TV Install
# This creates a staging environment for safe testing

echo "🚀 Starting staging deployment..."

# Set staging environment variables
export VITE_ENVIRONMENT=staging
export NODE_ENV=production

# Build the application with staging config
echo "📦 Building application for staging..."
npm run build

# Copy staging-specific files if they exist
if [ -f "public/staging-robots.txt" ]; then
    cp public/staging-robots.txt dist/robots.txt
    echo "📄 Applied staging robots.txt"
fi

# Create staging indicator file
echo "STAGING_BUILD=$(date)" > dist/.staging

# Add staging meta tags to index.html
sed -i 's/<title>/<meta name="robots" content="noindex, nofollow"><title>STAGING - /' dist/index.html

echo "✅ Staging build complete!"
echo ""
echo "📋 Staging Environment Info:"
echo "   • Environment: staging"
echo "   • Build Date: $(date)"
echo "   • Robots: Blocked from indexing"
echo "   • Visual Indicator: Enabled"
echo ""
echo "🔗 To deploy:"
echo "   1. Upload 'dist' folder to staging server"
echo "   2. Add ?preview=true to URL for staging indicator"
echo "   3. Test all functionality before promoting to production"