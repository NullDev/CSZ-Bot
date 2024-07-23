#!/usr/bin/env bash
set -xeuo pipefail

cd /home/csc

docker compose up --pull -d --remove-orphans
docker image prune -a -f
