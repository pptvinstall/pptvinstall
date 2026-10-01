#!/bin/bash

# This script runs the production version of the application
# It assumes you've already built the app with build-and-run.sh

echo "Starting production server..."
  
# Check if port 5000 is already in use and try 3001 as an alternative
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
  echo "Port 5000 is already in use. Starting server on port 3001 instead..."
  export PORT=3001
  NODE_ENV=production node dist/index.js
else
  NODE_ENV=production node dist/index.js
fi