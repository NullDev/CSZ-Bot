#!/usr/bin/env bash
set -xeuo pipefail

if [[ -z "${WORKING_DIRECTORY}" ]]; then
    cd "${WORKING_DIRECTORY}"
fi

export DOCKER_BUILDKIT=1
docker build --pull . -t csz-bot:latest
docker compose up -d --remove-orphans
docker image prune -a -f
