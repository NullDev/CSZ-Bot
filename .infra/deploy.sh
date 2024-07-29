#!/usr/bin/env bash
set -xeuo pipefail

docker compose -f "$BOT_HOME_DIR/.infra/compose.yaml" pull bot
docker compose -f "$BOT_HOME_DIR/.infra/compose.yaml" up -d --remove-orphans
docker image prune -a -f
