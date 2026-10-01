#!/bin/bash

echo "Running Drizzle migrations..."
npx drizzle-kit push

echo "Running database initialization script..."
npx tsx scripts/db-init.ts