#!/usr/bin/env sh

TODAY=$(date +"%Y-%m-%d")

mkdir -p backups
TARGET_FILE=backups/$TODAY-backup.db

sqlite3 storage.db ".backup $TARGET_FILE"
xz "$TARGET_FILE"
