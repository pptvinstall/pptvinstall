#!/bin/bash

echo "Building the application..."
npm run build

if [ $? -eq 0 ]; then
  echo "Build successful! Starting production server..."
  NODE_ENV=production node dist/index.js
else
  echo "Build failed. Please check the errors above."
  exit 1
fi