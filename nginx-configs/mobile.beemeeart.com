server {
    listen 443 ssl;
    server_name mobile.beemeeart.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/mobile.beemeeart.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mobile.beemeeart.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Block malicious scanners
    if ($http_user_agent ~* (zgrab|masscan|nmap|nikto|dirb|gobuster|sqlmap|python-requests|scanner|scraper)) {
        return 403;
    }
    
    # Block malicious request paths
    if ($request_uri ~* (/cgi-bin/|/manager/|/admin/|/wp-admin/|/wp-content/|/phpmyadmin/|/mysql/|\.php|\.asp|\.jsp)) {
        return 403;
    }
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Logging configuration
    access_log /var/log/nginx/mobile_beemeeart_access.log;
    error_log  /var/log/nginx/mobile_beemeeart_error.log error;
    
    # Forward all requests to the mobile app development server
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}

server {
    listen 80;
    server_name mobile.beemeeart.com;
    return 301 https://$host$request_uri;
}
