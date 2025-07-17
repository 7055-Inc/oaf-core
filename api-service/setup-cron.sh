#!/bin/bash

# Email Queue Processor Cron Job Setup Script
# This script helps set up the cron job to process the email queue every minute

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CRON_SCRIPT="$SCRIPT_DIR/cron/process-email-queue.js"
LOG_FILE="/var/www/main/api-service/logs/cron-email-queue.log"

# Ensure logs directory exists
mkdir -p /var/www/main/api-service/logs

# Create cron job entry
CRON_ENTRY="* * * * * /usr/bin/node $CRON_SCRIPT >> $LOG_FILE 2>&1"

echo "Email Queue Processor Cron Job Setup"
echo "====================================="
echo
echo "This will set up a cron job to process the email queue every minute."
echo
echo "Cron job entry:"
echo "$CRON_ENTRY"
echo
echo "Log file: $LOG_FILE"
echo

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "process-email-queue.js"; then
    echo "⚠️  Cron job already exists!"
    echo
    echo "Current cron jobs:"
    crontab -l | grep "process-email-queue.js"
    echo
    echo "To remove the existing cron job, run:"
    echo "crontab -l | grep -v 'process-email-queue.js' | crontab -"
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
        echo "The email queue will now be processed every minute."
        echo "Monitor the logs at: $LOG_FILE"
        echo
        echo "To verify the cron job is installed:"
        echo "crontab -l | grep process-email-queue"
        echo
        echo "To remove the cron job:"
        echo "crontab -l | grep -v 'process-email-queue.js' | crontab -"
    else
        echo "❌ Failed to install cron job!"
        exit 1
    fi
}

# Function to test the script
test_script() {
    echo "Testing the email queue processor..."
    
    if [ ! -f "$CRON_SCRIPT" ]; then
        echo "❌ Cron script not found: $CRON_SCRIPT"
        exit 1
    fi
    
    if [ ! -x "$CRON_SCRIPT" ]; then
        echo "❌ Cron script is not executable: $CRON_SCRIPT"
        echo "Run: chmod +x $CRON_SCRIPT"
        exit 1
    fi
    
    echo "Running test..."
    node "$CRON_SCRIPT"
    
    if [ $? -eq 0 ]; then
        echo "✅ Test completed successfully!"
        return 0
    else
        echo "❌ Test failed!"
        return 1
    fi
}

# Main menu
echo "Options:"
echo "1. Test the script"
echo "2. Install cron job"
echo "3. Show current cron jobs"
echo "4. Exit"
echo

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        test_script
        ;;
    2)
        if test_script; then
            echo
            read -p "Test passed! Install cron job? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                install_cron
            else
                echo "Installation cancelled."
            fi
        else
            echo "Please fix the test issues before installing the cron job."
        fi
        ;;
    3)
        echo "Current cron jobs:"
        crontab -l
        ;;
    4)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid option. Please choose 1-4."
        exit 1
        ;;
esac 