#!/bin/bash

# URL Replacement Cron Job Setup Script
# This script sets up the cron job to replace temp URLs with permanent URLs

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CRON_SCRIPT="$SCRIPT_DIR/scripts/replace-temp-urls.js"
LOG_FILE="/var/www/main/api-service/logs/cron-url-replacement.log"

# Ensure logs directory exists
mkdir -p /var/www/main/api-service/logs

# Make the script executable
chmod +x "$CRON_SCRIPT"

# Create cron job entry (runs every 2 minutes)
CRON_ENTRY="*/2 * * * * /usr/bin/node $CRON_SCRIPT >> $LOG_FILE 2>&1"

echo "URL Replacement Cron Job Setup"
echo "==============================="
echo
echo "This will set up a cron job to replace temp URLs with permanent URLs every 2 minutes."
echo
echo "Cron job entry:"
echo "$CRON_ENTRY"
echo
echo "Log file: $LOG_FILE"
echo

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "replace-temp-urls.js"; then
    echo "⚠️  Cron job already exists!"
    echo
    echo "Current cron jobs:"
    crontab -l | grep "replace-temp-urls.js"
    echo
    echo "To remove the existing cron job, run:"
    echo "crontab -l | grep -v 'replace-temp-urls.js' | crontab -"
    echo
    echo "Then run this script again to install the new one."
    exit 1
fi

# Function to install cron job
install_cron() {
    echo "Installing cron job..."
    
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ Cron job installed successfully!"
        echo
        echo "Temp URLs will now be replaced with permanent URLs every 2 minutes."
        echo "Monitor the logs at: $LOG_FILE"
        echo
        echo "To verify the cron job is installed:"
        echo "crontab -l | grep replace-temp-urls"
        echo
        echo "To remove the cron job:"
        echo "crontab -l | grep -v 'replace-temp-urls.js' | crontab -"
        echo
        echo "To test the script manually:"
        echo "node $CRON_SCRIPT"
    else
        echo "❌ Failed to install cron job!"
        exit 1
    fi
}

# Function to test the script
test_script() {
    echo "Testing the URL replacement script..."
    echo "====================================="
    echo
    
    if [ ! -f "$CRON_SCRIPT" ]; then
        echo "❌ Script file not found: $CRON_SCRIPT"
        exit 1
    fi
    
    echo "Running test execution..."
    node "$CRON_SCRIPT"
    
    if [ $? -eq 0 ]; then
        echo
        echo "✅ Script test completed successfully!"
        echo "Check the output above for any issues."
    else
        echo
        echo "❌ Script test failed!"
        echo "Please fix any errors before setting up the cron job."
        exit 1
    fi
}

# Main menu
echo "Choose an option:"
echo "1) Test the script first"
echo "2) Install cron job immediately"
echo "3) Exit"
echo
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        test_script
        echo
        echo "If the test was successful, run this script again to install the cron job."
        ;;
    2)
        install_cron
        ;;
    3)
        echo "Exiting without changes."
        exit 0
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac 