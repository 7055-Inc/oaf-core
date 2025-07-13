#!/bin/bash

# OAF Security Hardening Script
# This script implements immediate security measures to protect against bot attacks

set -e

echo "🔒 Starting OAF Security Hardening..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

# Install fail2ban if not present
if ! command -v fail2ban-client &> /dev/null; then
    echo "📦 Installing fail2ban..."
    apt-get update
    apt-get install -y fail2ban
fi

# Block the most aggressive IPs from today's logs
echo "🚫 Blocking aggressive IPs from today's logs..."
AGGRESSIVE_IPS=(
    "196.251.72.247"
    "78.153.140.151"
    "185.218.84.29"
    "204.76.203.212"
    "185.148.1.243"
    "185.218.84.46"
    "204.76.203.206"
    "148.113.208.45"
    "104.236.87.64"
    "45.194.66.7"
    "87.121.84.34"
    "20.127.202.110"
)

for ip in "${AGGRESSIVE_IPS[@]}"; do
    echo "Blocking IP: $ip"
    iptables -A INPUT -s $ip -j DROP
    iptables -A FORWARD -s $ip -j DROP
done

# Save iptables rules
echo "💾 Saving iptables rules..."
iptables-save > /etc/iptables/rules.v4

# Create fail2ban configuration for nginx
echo "⚙️ Configuring fail2ban for nginx..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/oaf_access.log
maxretry = 3
bantime = 3600

[nginx-noscript]
enabled = true
filter = nginx-noscript
logpath = /var/log/nginx/oaf_access.log
maxretry = 3
bantime = 3600

[nginx-badbots]
enabled = true
filter = nginx-badbots
logpath = /var/log/nginx/oaf_access.log
maxretry = 1
bantime = 86400

[nginx-noproxy]
enabled = true
filter = nginx-noproxy
logpath = /var/log/nginx/oaf_access.log
maxretry = 2
bantime = 3600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/oaf_access.log
maxretry = 1
bantime = 86400

# Custom filter for OAF-specific attacks
[oaf-attacks]
enabled = true
filter = oaf-attacks
logpath = /var/log/nginx/oaf_access.log
maxretry = 1
bantime = 86400
EOF

# Create custom fail2ban filter for OAF attacks
echo "🔍 Creating custom fail2ban filter for OAF attacks..."
cat > /etc/fail2ban/filter.d/oaf-attacks.conf << 'EOF'
[Definition]
failregex = ^<HOST> .* "(GET|POST|HEAD) .*(cgi-bin|manager|admin|wp-admin|wp-content|phpmyadmin|mysql|\.php|\.asp|\.jsp).*" (403|404|400) .*$
            ^<HOST> .* "(GET|POST|HEAD) .*(\?|&)(union|select|insert|update|delete|drop|create|alter|exec|script).*" .*$
            ^<HOST> .* ".*zgrab.*" .*$
            ^<HOST> .* ".*masscan.*" .*$
            ^<HOST> .* ".*nmap.*" .*$
            ^<HOST> .* ".*nikto.*" .*$
            ^<HOST> .* ".*dirb.*" .*$
            ^<HOST> .* ".*gobuster.*" .*$
            ^<HOST> .* ".*sqlmap.*" .*$
            ^<HOST> .* ".*python-requests.*" .*$

ignoreregex =
EOF

# Create IP whitelist for legitimate access
echo "✅ Creating IP whitelist for legitimate access..."
cat > /etc/fail2ban/jail.d/whitelist.conf << 'EOF'
[DEFAULT]
# Add your office/home IP addresses here
ignoreip = 127.0.0.1/8 ::1
           10.0.0.0/8
           172.16.0.0/12
           192.168.0.0/16
           # Add your trusted IP addresses here
           # Example: 203.0.113.0/24
EOF

# Restart fail2ban
echo "🔄 Restarting fail2ban..."
systemctl restart fail2ban
systemctl enable fail2ban

# Update nginx configuration
echo "📝 Updating nginx configuration..."
cp /var/www/main/oaf.nginx.temp /etc/nginx/sites-available/main.onlineartfestival.com

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
    echo "🔄 Nginx reloaded successfully"
else
    echo "❌ Nginx configuration has errors - not reloading"
    exit 1
fi

# Create monitoring script
echo "📊 Creating security monitoring script..."
cat > /usr/local/bin/oaf-security-monitor.sh << 'EOF'
#!/bin/bash

# OAF Security Monitor
# Run this periodically to check for security issues

LOG_FILE="/var/log/nginx/oaf_access.log"
SECURITY_LOG="/var/log/oaf-security.log"
ALERT_THRESHOLD=50

echo "$(date): Running OAF Security Monitor" >> $SECURITY_LOG

# Check for new attacking IPs
echo "Top attacking IPs in last hour:" >> $SECURITY_LOG
tail -n 1000 $LOG_FILE | grep "$(date '+%d/%b/%Y:%H')" | \
    awk '{print $1}' | sort | uniq -c | sort -nr | head -10 >> $SECURITY_LOG

# Check for blocked requests
BLOCKED_COUNT=$(tail -n 1000 $LOG_FILE | grep -c "403")
if [ $BLOCKED_COUNT -gt $ALERT_THRESHOLD ]; then
    echo "$(date): HIGH ALERT - $BLOCKED_COUNT blocked requests in last 1000 entries" >> $SECURITY_LOG
fi

# Check fail2ban status
echo "Fail2ban status:" >> $SECURITY_LOG
fail2ban-client status >> $SECURITY_LOG

echo "$(date): Security monitor completed" >> $SECURITY_LOG
echo "---" >> $SECURITY_LOG
EOF

chmod +x /usr/local/bin/oaf-security-monitor.sh

# Create cron job for security monitoring
echo "⏰ Setting up security monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/oaf-security-monitor.sh") | crontab -

# Create firewall rules backup
echo "💾 Creating firewall rules backup..."
mkdir -p /etc/iptables
iptables-save > /etc/iptables/rules.v4

# Set up iptables persistence
echo "⚙️ Setting up iptables persistence..."
if ! dpkg -l | grep -q iptables-persistent; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
else
    systemctl restart netfilter-persistent
fi

# Final security check
echo "🔍 Running final security checks..."
echo "Active fail2ban jails:"
fail2ban-client status

echo "Currently blocked IPs:"
iptables -L INPUT -n | grep DROP | wc -l

echo "Recent nginx security blocks:"
tail -n 100 /var/log/nginx/oaf_access.log | grep -c "403"

echo ""
echo "🎉 Security hardening completed successfully!"
echo ""
echo "📊 Security Status:"
echo "- ✅ Aggressive IPs blocked via iptables"
echo "- ✅ Fail2ban configured and active"
echo "- ✅ Nginx hardened with bot detection"
echo "- ✅ Rate limiting implemented"
echo "- ✅ Security monitoring enabled"
echo ""
echo "📋 Next steps:"
echo "1. Monitor /var/log/oaf-security.log for security alerts"
echo "2. Check fail2ban status: sudo fail2ban-client status"
echo "3. View blocked IPs: sudo iptables -L INPUT -n | grep DROP"
echo "4. Add your trusted IPs to /etc/fail2ban/jail.d/whitelist.conf"
echo ""
echo "🚨 Emergency unblock command:"
echo "sudo iptables -D INPUT -s YOUR_IP -j DROP"
echo "sudo fail2ban-client unban YOUR_IP"
EOF

chmod +x security-hardening.sh 