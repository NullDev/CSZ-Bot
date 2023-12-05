#!/usr/bin/env sh

TODAY=$(date +"%Y-%m-%d")

sqlite3 storage.db ".backup $TODAY-backup.db"
