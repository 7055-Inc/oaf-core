server {
    listen 443 ssl;
    server_name signup.brakebee.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/signup.brakebee.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/signup.brakebee.com/privkey.pem;
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
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Logging configuration
    access_log /var/log/nginx/signup_brakebee_access.log;
    error_log  /var/log/nginx/signup_brakebee_error.log error;
    
    # Serve static media files directly
    location /static_media/ {
        alias /var/www/main/public/static_media/;
        add_header Cache-Control "public, max-age=31536000";
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Range";
        
        # Handle video files
        location ~* \.(mp4|webm|ogg)$ {
            add_header Accept-Ranges bytes;
            add_header Content-Type video/mp4;
        }
    }
    
    # Serve Next.js static files
    location /_next/static/ {
        alias /var/www/main/.next/static/;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Forward all requests to the main app (middleware will handle subdomain routing)
    location / {
        proxy_pass http://localhost:3000;
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
    server_name signup.brakebee.com;
    return 301 https://$host$request_uri;
}
