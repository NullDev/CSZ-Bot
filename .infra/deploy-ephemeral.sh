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

if [[ -z "${EPHEMERAL_PROJECT}" ]]; then
    echo "EPHEMERAL_PROJECT needs to be set"
    exit 1
fi

# All ephemeral bots share the same Discord token, so only one PR bot may run at a time
for project in $(docker compose ls --all --quiet --filter "name=^csz-bot-pr-"); do
    if [[ "$project" != "$EPHEMERAL_PROJECT" ]]; then
        docker compose -p "$project" down
    fi
done

docker compose -p "$EPHEMERAL_PROJECT" -f "$BOT_HOME_PATH/.infra/compose.ephemeral.yaml" pull bot
docker compose -p "$EPHEMERAL_PROJECT" -f "$BOT_HOME_PATH/.infra/compose.ephemeral.yaml" up \
    -d \
    --remove-orphans
