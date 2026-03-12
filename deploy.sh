#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./deploy.sh user@ec2-host"
  exit 1
fi

HOST="$1"
REMOTE_DIR="/opt/fray"

echo "Deploying to $HOST..."

ssh "$HOST" bash -s "$REMOTE_DIR" << 'REMOTE'
set -euo pipefail
DIR="$1"
cd "$DIR"

echo "Pulling latest code..."
git pull --ff-only

echo "Building containers..."
podman-compose -f podman-compose.prod.yml build

echo "Running migrations..."
podman-compose -f podman-compose.prod.yml run --rm app npx prisma migrate deploy

echo "Restarting services..."
podman-compose -f podman-compose.prod.yml down
podman-compose -f podman-compose.prod.yml up -d

echo "Deploy complete."
REMOTE
