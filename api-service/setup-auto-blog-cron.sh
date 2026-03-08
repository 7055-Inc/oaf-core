#!/bin/bash

# Setup cron job for auto-blog article generation
# Runs every 4 hours (6 times per day)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CRON_CMD="0 */4 * * * cd $PROJECT_DIR && /usr/bin/node api-service/cron/auto-blog.js >> /var/log/auto-blog.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "auto-blog.js"; then
  echo "Auto-blog cron job already exists"
else
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo "Auto-blog cron job added: $CRON_CMD"
fi
