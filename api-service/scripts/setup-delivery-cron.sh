#!/bin/bash

# Setup Automated Delivery Status Checker Cron Job
# This script configures the automated delivery email system

PROJECT_DIR="/var/www/main"
SCRIPT_PATH="$PROJECT_DIR/api-service/scripts/check-delivery-status.js"

echo "🚀 Setting up Automated Delivery Status Checker..."

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Check if delivery checker script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Delivery checker script not found: $SCRIPT_PATH"
    exit 1
fi

# Make sure script is executable
chmod +x "$SCRIPT_PATH"

# Test the script first
echo "🧪 Testing delivery checker..."
cd "$PROJECT_DIR"
node api-service/scripts/test_delivery_checker.js

if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Please fix issues before setting up cron job."
    exit 1
fi

echo "✅ Tests passed!"

# Create cron job entry
CRON_JOB="0 */4 * * * cd $PROJECT_DIR && node $SCRIPT_PATH >> /var/log/delivery-checker.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "check-delivery-status.js"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove existing job and add new one
    (crontab -l 2>/dev/null | grep -v "check-delivery-status.js"; echo "$CRON_JOB") | crontab -
else
    echo "📅 Adding new cron job..."
    # Add new job to existing crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

# Create log file with proper permissions
sudo touch /var/log/delivery-checker.log
sudo chown $USER:$USER /var/log/delivery-checker.log

echo ""
echo "✅ Automated Delivery Checker Setup Complete!"
echo ""
echo "📅 Cron Schedule: Every 4 hours"
echo "📝 Log File: /var/log/delivery-checker.log"
echo "🔍 Test Command: cd $PROJECT_DIR && node $SCRIPT_PATH --dry-run"
echo ""
echo "📋 Current Cron Jobs:"
crontab -l | grep -E "(check-delivery|#)"

echo ""
echo "🎯 Next Steps:"
echo "   1. Monitor log file: tail -f /var/log/delivery-checker.log"
echo "   2. Test manually: cd $PROJECT_DIR && node $SCRIPT_PATH --dry-run"
echo "   3. Run live test: cd $PROJECT_DIR && node $SCRIPT_PATH"
echo ""
echo "⚙️  Cron Job Details:"
echo "   - Runs every 4 hours (0 */4 * * *)"
echo "   - Checks all shipped packages for delivery status"
echo "   - Sends 'order delivered' emails automatically"
echo "   - Updates order status to 'delivered' when all packages arrive"