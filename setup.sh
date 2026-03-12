#!/usr/bin/env bash
set -euo pipefail

# One-time EC2 provisioning for Fray (Amazon Linux 2023)

echo "Installing dependencies..."
sudo dnf install -y podman git

echo "Installing podman-compose..."
sudo dnf install -y python3-pip
pip3 install --user podman-compose
export PATH="$HOME/.local/bin:$PATH"

echo "Cloning repo..."
sudo mkdir -p /opt/fray
sudo chown "$(whoami)" /opt/fray
git clone https://github.com/timstarkk/fray.git /opt/fray
cd /opt/fray

echo "Generating ENCRYPTION_KEY..."
ENCRYPTION_KEY=$(openssl rand -hex 32)

cat << EOF

============================================
  Setup complete. Create your .env file:
============================================

  cd /opt/fray
  cp .env.example .env

  Fill in these values:
    DOMAIN=your-domain.com
    POSTGRES_USER=fray
    POSTGRES_PASSWORD=$(openssl rand -hex 24)
    ENCRYPTION_KEY=$ENCRYPTION_KEY
    NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
    NEXT_PUBLIC_COGNITO_CLIENT_ID=...

  Then run:
    podman-compose -f podman-compose.prod.yml build
    podman-compose -f podman-compose.prod.yml run --rm app npx prisma migrate deploy
    podman-compose -f podman-compose.prod.yml run --rm app npx prisma db seed
    podman-compose -f podman-compose.prod.yml up -d

EOF
