#!/bin/bash

# Event Reminder Cron Job Setup Script
# This script sets up the cron job to process event reminders every 6 hours

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CRON_SCRIPT="$SCRIPT_DIR/cron/process-event-reminders.js"
LOG_FILE="/var/www/main/api-service/logs/cron-event-reminders.log"

# Ensure logs directory exists
mkdir -p /var/www/main/api-service/logs

# Make the cron script executable
chmod +x "$CRON_SCRIPT"

# Create cron job entry (runs every 6 hours)
CRON_ENTRY="0 */6 * * * /usr/bin/node $CRON_SCRIPT >> $LOG_FILE 2>&1"

echo "Event Reminder Cron Job Setup"
echo "=============================="
echo
echo "This will set up a cron job to process event reminders every 6 hours."
echo
echo "Cron job entry:"
echo "$CRON_ENTRY"
echo
echo "Log file: $LOG_FILE"
echo

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "process-event-reminders.js"; then
    echo "⚠️  Cron job already exists!"
    echo
    echo "Current cron jobs:"
    crontab -l | grep "process-event-reminders.js"
    echo
    echo "To remove the existing cron job, run:"
    echo "crontab -l | grep -v 'process-event-reminders.js' | crontab -"
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
        echo "Event reminders will now be processed every 6 hours."
        echo "Monitor the logs at: $LOG_FILE"
        echo
        echo "To verify the cron job is installed:"
        echo "crontab -l | grep process-event-reminders"
        echo
        echo "To remove the cron job:"
        echo "crontab -l | grep -v 'process-event-reminders.js' | crontab -"
    else
        echo "❌ Failed to install cron job!"
        exit 1
    fi
}

# Function to test the script
test_script() {
    echo "Testing the event reminder script..."
    echo
    
    if [ ! -f "$CRON_SCRIPT" ]; then
        echo "❌ Script file not found: $CRON_SCRIPT"
        exit 1
    fi
    
    echo "Running test execution..."
    /usr/bin/node "$CRON_SCRIPT"
    
    if [ $? -eq 0 ]; then
        echo "✅ Test execution completed successfully!"
    else
        echo "❌ Test execution failed!"
        echo "Please check the script and try again."
        exit 1
    fi
}

# Main menu
while true; do
    read -p "Choose an option: [T]est script, [I]nstall cron job, [Q]uit: " choice
    case $choice in
        [Tt]* )
            test_script
            echo
            ;;
        [Ii]* )
            install_cron
            break
            ;;
        [Qq]* )
            echo "Exiting..."
            exit 0
            ;;
        * )
            echo "Please answer T, I, or Q."
            ;;
    esac
done 