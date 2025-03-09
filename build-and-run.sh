#!/bin/bash

echo "Ensuring all dependencies are installed..."
npm install

echo "Building the application..."
npm run build

if [ $? -eq 0 ]; then
  echo "Build successful! Starting production server..."
  
  # Check if port 5000 is already in use and try 3001 as an alternative
  if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 5000 is already in use. Starting server on port 3001 instead..."
    export PORT=3001
    NODE_ENV=production node dist/index.js
  else
    NODE_ENV=production node dist/index.js
  fi
else
  echo "Build failed. Please check the errors above."
  exit 1
fi