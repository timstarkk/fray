#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./deploy.sh [-i keyfile] user@ec2-host"
  exit 1
fi

SSH_ARGS=()
while [[ "$1" == -* ]]; do
  SSH_ARGS+=("$1" "$2")
  shift 2
done

HOST="$1"
REMOTE_DIR="/opt/fray"

echo "Deploying to $HOST..."

ssh "${SSH_ARGS[@]}" "$HOST" bash -s "$REMOTE_DIR" << 'REMOTE'
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
