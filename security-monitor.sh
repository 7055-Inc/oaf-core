#!/bin/bash

# OAF Security Monitor - Quick Status Check
echo "🔒 OAF Security Status - $(date)"
echo "======================================="

# Check blocked IPs
echo "📊 Currently blocked IPs:"
sudo iptables -L INPUT -n | grep DROP | wc -l
echo ""

# Check recent attack attempts
echo "🚨 Recent attack attempts (last 100 entries):"
sudo tail -100 /var/log/nginx/oaf_access.log | grep -c "403\|404\|400"
echo ""

# Check fail2ban status
echo "🛡️ Fail2ban jails:"
sudo fail2ban-client status
echo ""

# Check top IPs from last hour
echo "📈 Top IPs in last hour:"
sudo tail -1000 /var/log/nginx/oaf_access.log | grep "$(date '+%d/%b/%Y:%H')" | \
    awk '{print $1}' | sort | uniq -c | sort -nr | head -5
echo ""

# Check for new bot patterns
echo "🤖 Recent bot activity:"
sudo tail -100 /var/log/nginx/oaf_access.log | grep -i "bot\|crawl\|spider\|scan" | wc -l
echo ""

echo "✅ Security monitoring complete!" 