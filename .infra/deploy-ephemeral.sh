#!/usr/bin/env bash
set -xeuo pipefail

if [[ -z "${BOT_HOME_PATH}" ]]; then
    echo "BOT_HOME_PATH needs to be set"
    exit 1
fi

if [[ -z "${EPHEMERAL_BOT_CONFIG}" ]]; then
    echo "EPHEMERAL_BOT_CONFIG needs to be set"
    exit 1
fi

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

rsync -av \
    --include='banners' \
    --include='sounds' \
    --include='compose.yaml' \
    --include='compose.ephemeral.yaml' \
    "$BOT_HOME_PATH" "$TEMP_DIR"

echo "$EPHEMERAL_BOT_CONFIG" >config.json

docker compose up \
    -f compose.ephemeral.yaml \
    --pull \
    -d \
    --remove-orphans
