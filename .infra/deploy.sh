#!/usr/bin/env bash
set -xeuo pipefail

if [[ -z "${WORKING_DIRECTORY}" ]]; then
    cd "${WORKING_DIRECTORY}"
fi

docker compose pull bot
docker compose up -d --remove-orphans
docker image prune -a -f
