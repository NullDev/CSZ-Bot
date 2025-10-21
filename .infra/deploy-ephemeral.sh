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

cp -r "$BOT_HOME_PATH/banners" "$TEMP_DIR"
cp -r "$BOT_HOME_PATH/sounds" "$TEMP_DIR"
cp -r "$BOT_HOME_PATH/.infra" "$TEMP_DIR"

echo "$EPHEMERAL_BOT_CONFIG" > config.json
echo "" >.env # Dummy env

docker stop csz-bot-ephemeral || true
docker rm csz-bot-ephemeral || true
docker compose -p e2e -f .infra/compose.ephemeral.yaml pull bot
docker compose -p e2e -f .infra/compose.ephemeral.yaml up \
    -d \
    --remove-orphans

rm -rvf -- "$TEMP_DIR"
