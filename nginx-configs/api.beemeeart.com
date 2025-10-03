server {
    listen 443 ssl;
    server_name api.beemeeart.com;

    # SSL Configuration - managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api.beemeeart.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api.beemeeart.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
    
    # Block malicious scanners (but allow legitimate bots)
    if ($http_user_agent ~* (zgrab|masscan|nmap|nikto|dirb|gobuster|sqlmap|python-requests|scanner|scraper)) {
        return 403;
    }
    
    # Block malicious request paths (but allow legitimate admin API endpoints)
    if ($request_uri ~* (/cgi-bin/|/manager/|/wp-admin/|/wp-content/|/phpmyadmin/|/mysql/|\.php|\.asp|\.jsp)) {
        return 403;
    }
    
    # Block SQL injection attempts in API parameters
    if ($args ~* (union|select|insert|update|delete|drop|create|alter|exec|script|javascript|vbscript|onload|onerror)) {
        return 403;
    }
    
    # Enhanced security headers for API
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-API-Protected "BEE-Security-Enabled" always;
    
    # Logging configuration
    access_log /var/log/nginx/api_beemeeart_access.log;
    error_log  /var/log/nginx/api_beemeeart_error.log error;

    # Forward all requests to the API service
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}

server {
    listen 80;
    server_name api.beemeeart.com;
    
    location / {
        return 301 https://$host$request_uri;
    }
}
