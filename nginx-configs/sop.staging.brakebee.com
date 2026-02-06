# SOP Staging — proxy to Node on port 3015
# Uses same wildcard SSL as staging / multi-site (brakebee.com cert).

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

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3015;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}

server {
    listen 80;
    server_name staging-sop.brakebee.com;
    return 301 https://$host$request_uri;
}
