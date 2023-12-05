#!/usr/bin/env sh

TODAY=$(date +"%Y-%m-%d")

mkdir -p backups
sqlite3 storage.db ".backup backups/$TODAY-backup.db"
