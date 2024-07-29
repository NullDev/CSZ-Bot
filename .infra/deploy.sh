#!/usr/bin/env bash
set -xeuo pipefail

docker compose pull bot
docker compose up -d --remove-orphans
docker image prune -a -f
