#!/bin/bash

# SSL Automation Setup Script
# Sets up automatic domain validation and certificate generation

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="/opt/oaf-ssl-automation"
LOG_DIR="/var/log/oaf-ssl-automation"

echo "🚀 Setting up OAF SSL Automation Framework..."

# Create directories
sudo mkdir -p $INSTALL_DIR
sudo mkdir -p $LOG_DIR

# Copy files
sudo cp $SCRIPT_DIR/domain-manager.js $INSTALL_DIR/
sudo cp $SCRIPT_DIR/package.json $INSTALL_DIR/

# Set permissions
sudo chown -R root:root $INSTALL_DIR
sudo chmod +x $INSTALL_DIR/domain-manager.js

# Install dependencies
echo "📦 Installing Node.js dependencies..."
cd $INSTALL_DIR
sudo npm install

# Create log files
sudo touch $LOG_DIR/domain-manager.log
sudo touch $LOG_DIR/cron.log
sudo chown www-data:www-data $LOG_DIR/*.log

# Create systemd service file
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/oaf-domain-manager.service > /dev/null <<EOF
[Unit]
Description=OAF Domain Manager SSL Automation
After=network.target mysql.service

[Service]
Type=oneshot
ExecStart=/usr/bin/node $INSTALL_DIR/domain-manager.js process-pending
User=root
Group=root
StandardOutput=append:$LOG_DIR/domain-manager.log
StandardError=append:$LOG_DIR/domain-manager.log

[Install]
WantedBy=multi-user.target
EOF

# Create cleanup service
sudo tee /etc/systemd/system/oaf-domain-cleanup.service > /dev/null <<EOF
[Unit]
Description=OAF Domain Validation Cleanup
After=network.target mysql.service

[Service]
Type=oneshot
ExecStart=/usr/bin/node $INSTALL_DIR/domain-manager.js cleanup-expired
User=root
Group=root
StandardOutput=append:$LOG_DIR/domain-manager.log
StandardError=append:$LOG_DIR/domain-manager.log

[Install]
WantedBy=multi-user.target
EOF

# Create timer files for automation
sudo tee /etc/systemd/system/oaf-domain-manager.timer > /dev/null <<EOF
[Unit]
Description=Run OAF Domain Manager every 5 minutes
Requires=oaf-domain-manager.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

sudo tee /etc/systemd/system/oaf-domain-cleanup.timer > /dev/null <<EOF
[Unit]
Description=Run OAF Domain Cleanup daily
Requires=oaf-domain-cleanup.service

[Timer]
OnBootSec=1h
OnUnitActiveSec=24h

[Install]
WantedBy=timers.target
EOF

# Enable and start systemd services
echo "⏰ Enabling systemd timers..."
sudo systemctl daemon-reload
sudo systemctl enable oaf-domain-manager.timer
sudo systemctl enable oaf-domain-cleanup.timer
sudo systemctl start oaf-domain-manager.timer
sudo systemctl start oaf-domain-cleanup.timer

# Create manual command aliases
echo "🔗 Creating command aliases..."
sudo tee /usr/local/bin/oaf-domain > /dev/null <<EOF
#!/bin/bash
/usr/bin/node $INSTALL_DIR/domain-manager.js "\$@"
EOF

sudo chmod +x /usr/local/bin/oaf-domain

# Test the installation
echo "🧪 Testing installation..."
oaf-domain --help > /dev/null 2>&1 || echo "Warning: Command test failed"

echo "✅ SSL Automation Framework setup complete!"
echo ""
echo "🎯 Usage Examples:"
echo "  # Start domain validation for a site"
echo "  oaf-domain start-validation 1 example.com"
echo ""
echo "  # Process all pending validations manually"
echo "  oaf-domain process-pending"
echo ""
echo "  # Clean up expired validations"
echo "  oaf-domain cleanup-expired"
echo ""
echo "  # Check specific domain"
echo "  oaf-domain process-domain 1"
echo ""
echo "📊 Monitor logs:"
echo "  tail -f $LOG_DIR/domain-manager.log"
echo ""
echo "⏰ Automation Schedule:"
echo "  • Domain validation: Every 5 minutes"
echo "  • Cleanup expired: Daily"
echo ""
echo "🔍 Check systemd status:"
echo "  systemctl status oaf-domain-manager.timer"
echo "  systemctl status oaf-domain-cleanup.timer" 