server {
    server_name brakebee.com;
    
    # Increase upload size limit to 200MB
    client_max_body_size 200M;
    
    # Block malicious scanners (but allow legitimate bots)
    if ($http_user_agent ~* (zgrab|masscan|nmap|nikto|dirb|gobuster|sqlmap|python-requests|scanner|scraper)) {
        return 403;
    }
    
    # Block malicious request paths
    if ($request_uri ~* (/cgi-bin/|/manager/|/admin/|/wp-admin/|/wp-content/|/phpmyadmin/|/mysql/|\.php|\.asp|\.jsp)) {
        return 403;
    }
    
    # Block SQL injection attempts
    if ($args ~* (union|select|insert|update|delete|drop|create|alter|exec|script|javascript|vbscript|onload|onerror)) {
        return 403;
    }
    

    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
    add_header Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://www.gstatic.com https://js.stripe.com https://www.googletagmanager.com https://diffuser-cdn.app-us1.com https://prism.app-us1.com; connect-src 'self' https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://accounts.google.com https://firestore.googleapis.com https://firebasestorage.googleapis.com https://firebase.googleapis.com https://apis.google.com https://www.google.com https://api.brakebee.com https://api.stripe.com https://www.googletagmanager.com https://diffuser-cdn.app-us1.com https://prism.app-us1.com; frame-src 'self' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://*.firebaseapp.com/ https://js.stripe.com; worker-src 'self' blob:;" always;
    
    access_log /var/log/nginx/brakebee_access.log;
    error_log /var/log/nginx/brakebee_error.log debug;
    
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
    
    # Auth routes
    location ~ ^/(auth|oauth)/ {
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

    # Serve Next.js static files
    location /_next/static/ {
        alias /var/www/main/.next/static/;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Default location
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
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/brakebee.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/brakebee.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = brakebee.com) {
        return 301 https://$host$request_uri;
    }
    server_name brakebee.com;
    listen 80;
    return 404;
}
