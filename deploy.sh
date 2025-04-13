#!/bin/bash

# Exit on error
set -e

echo "Starting deployment..."

# Update code from repository
git pull origin main

# Create/activate virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# Install dependencies
pip install -r requirements-prod.txt

# Apply database migrations
flask db upgrade

# Collect static files (if needed)
# python manage.py collectstatic --noinput

# Restart services
sudo systemctl restart campus-navigator.service

echo "Deployment completed successfully!"