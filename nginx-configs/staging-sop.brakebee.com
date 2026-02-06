# SOP Staging — proxy to main Next.js app, rewrite to /sop/* routes
# SOP is now a module in the main application
# Uses same wildcard SSL as staging (brakebee.com cert).

server {
    listen 443 ssl;
    server_name staging-sop.brakebee.com;

    # Use wildcard SSL certificate (same as staging / multi-site)
    ssl_certificate /etc/letsencrypt/live/brakebee.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/brakebee.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Robots-Tag "noindex, nofollow" always;

    access_log /var/log/nginx/sop_staging_brakebee_access.log;
    error_log  /var/log/nginx/sop_staging_brakebee_error.log error;

    client_max_body_size 50M;

    # Root path redirects to /sop
    location = / {
        return 301 /sop;
    }

    # Proxy to main Next.js app - it handles /sop/* pages natively
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host staging-sop.brakebee.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Next.js static files and hot reload
    location /_next/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host staging-sop.brakebee.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass 1;
        proxy_no_cache 1;
    }

    # API requests go to the API service
    location /api/ {
        proxy_pass http://127.0.0.1:3013;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name staging-sop.brakebee.com;
    return 301 https://$host$request_uri;
}
