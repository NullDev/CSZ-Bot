#!/usr/bin/env sh

TODAY=$(date +"%Y-%m-%d")

mkdir -p backups
TARGET_FILE=backups/$TODAY-backup.db

sqlite3 /home/csc/data/storage.db ".backup $TARGET_FILE"
zstd -19 --rm "$TARGET_FILE"
