#!/usr/bin/env bash
set -xeuo pipefail

cd /home/csc

export DOCKER_BUILDKIT=1
docker build --pull . -t csz-bot:latest
docker compose up -d --remove-orphans
docker image prune -a -f
