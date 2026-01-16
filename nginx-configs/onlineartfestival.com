# Nginx config for onlineartfestival.com redirects to Brakebee
# Generated: 2026-01-06
# 
# INSTALLATION:
# 1. Copy to /etc/nginx/sites-available/onlineartfestival.com
# 2. Symlink: ln -s /etc/nginx/sites-available/onlineartfestival.com /etc/nginx/sites-enabled/
# 3. Get SSL: certbot --nginx -d onlineartfestival.com -d www.onlineartfestival.com
# 4. Test: nginx -t
# 5. Reload: systemctl reload nginx
# 6. Update DNS to point onlineartfestival.com to Brakebee server IP

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name onlineartfestival.com www.onlineartfestival.com;
    
    # SSL certificates - UPDATE PATHS after certbot runs
    ssl_certificate /etc/letsencrypt/live/onlineartfestival.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onlineartfestival.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Logging
    access_log /var/log/nginx/oaf_redirect_access.log;
    error_log /var/log/nginx/oaf_redirect_error.log;

    # ============================================
    # EVENT REDIRECTS (301 Permanent)
    # ============================================
    
    location = /events/15th-annual-coconut-point-art-festival { return 301 https://brakebee.com/events/427?from=oaf; }
    location = /events/15th-annual-coconut-point-art-festival/ { return 301 https://brakebee.com/events/427?from=oaf; }
    location = /events/15th-annual-lake-dillon-art-festival { return 301 https://brakebee.com/events/431?from=oaf; }
    location = /events/15th-annual-lake-dillon-art-festival/ { return 301 https://brakebee.com/events/431?from=oaf; }
    location = /events/18th-annual-alexandria-old-town-art-festival { return 301 https://brakebee.com/events/450?from=oaf; }
    location = /events/18th-annual-alexandria-old-town-art-festival/ { return 301 https://brakebee.com/events/450?from=oaf; }
    location = /events/2024-autumn-festival-an-arts-crafts-affair-ralston-ne { return 301 https://brakebee.com/events/588?from=oaf; }
    location = /events/2024-autumn-festival-an-arts-crafts-affair-ralston-ne/ { return 301 https://brakebee.com/events/588?from=oaf; }
    location = /events/2024-autumn-festival-an-arts-crafts-affair-shakopee-mn { return 301 https://brakebee.com/events/589?from=oaf; }
    location = /events/2024-autumn-festival-an-arts-crafts-affair-shakopee-mn/ { return 301 https://brakebee.com/events/589?from=oaf; }
    location = /events/2024-autumn-festival-an-arts-crafts-affair-sioux-falls-sd { return 301 https://brakebee.com/events/590?from=oaf; }
    location = /events/2024-autumn-festival-an-arts-crafts-affair-sioux-falls-sd/ { return 301 https://brakebee.com/events/590?from=oaf; }
    location = /events/2024-spring-festival-an-arts-crafts-affair { return 301 https://brakebee.com/events/559?from=oaf; }
    location = /events/2024-spring-festival-an-arts-crafts-affair/ { return 301 https://brakebee.com/events/559?from=oaf; }
    location = /events/2024-spring-festival-an-arts-crafts-affair-2 { return 301 https://brakebee.com/events/559?from=oaf; }
    location = /events/2024-spring-festival-an-arts-crafts-affair-2/ { return 301 https://brakebee.com/events/559?from=oaf; }
    location = /events/26th-annual-spring-carefree-fine-art-festival { return 301 https://brakebee.com/events/435?from=oaf; }
    location = /events/26th-annual-spring-carefree-fine-art-festival/ { return 301 https://brakebee.com/events/435?from=oaf; }
    location = /events/27th-annual-fall-carefree-fine-art-and-wine-festival { return 301 https://brakebee.com/events/448?from=oaf; }
    location = /events/27th-annual-fall-carefree-fine-art-and-wine-festival/ { return 301 https://brakebee.com/events/448?from=oaf; }
    location = /events/28th-annual-fall-carefee-fine-art-and-wine-festival { return 301 https://brakebee.com/events/434?from=oaf; }
    location = /events/28th-annual-fall-carefee-fine-art-and-wine-festival/ { return 301 https://brakebee.com/events/434?from=oaf; }
    location = /events/28th-annual-winter-carefree-fine-art-wine-festival { return 301 https://brakebee.com/events/444?from=oaf; }
    location = /events/28th-annual-winter-carefree-fine-art-wine-festival/ { return 301 https://brakebee.com/events/444?from=oaf; }
    location = /events/31st-annual-downtown-stuart-art-festival { return 301 https://brakebee.com/events/426?from=oaf; }
    location = /events/31st-annual-downtown-stuart-art-festival/ { return 301 https://brakebee.com/events/426?from=oaf; }
    location = /events/32nd-annual-winter-carefree-az-fine-art-wine-festival { return 301 https://brakebee.com/events/581?from=oaf; }
    location = /events/32nd-annual-winter-carefree-az-fine-art-wine-festival/ { return 301 https://brakebee.com/events/581?from=oaf; }
    location = /events/33rd-annual-las-olas-art-fair { return 301 https://brakebee.com/events/449?from=oaf; }
    location = /events/33rd-annual-las-olas-art-fair/ { return 301 https://brakebee.com/events/449?from=oaf; }
    location = /events/3rd-annual-downtown-chandler-fine-art-wine-festival { return 301 https://brakebee.com/events/523?from=oaf; }
    location = /events/3rd-annual-downtown-chandler-fine-art-wine-festival/ { return 301 https://brakebee.com/events/523?from=oaf; }
    location = /events/4th-annual-downtown-chandler-az-fine-art-and-wine { return 301 https://brakebee.com/events/598?from=oaf; }
    location = /events/4th-annual-downtown-chandler-az-fine-art-and-wine/ { return 301 https://brakebee.com/events/598?from=oaf; }
    location = /events/4th-annual-evergreen-mountain-art-celebration { return 301 https://brakebee.com/events/432?from=oaf; }
    location = /events/4th-annual-evergreen-mountain-art-celebration/ { return 301 https://brakebee.com/events/432?from=oaf; }
    location = /events/4th-ave-street-fair { return 301 https://brakebee.com/events/483?from=oaf; }
    location = /events/4th-ave-street-fair/ { return 301 https://brakebee.com/events/483?from=oaf; }
    location = /events/62nd-annual-tubac-festival-of-arts { return 301 https://brakebee.com/events/469?from=oaf; }
    location = /events/62nd-annual-tubac-festival-of-arts/ { return 301 https://brakebee.com/events/469?from=oaf; }
    location = /events/9th-annual-surprise-fine-arts-and-wine-festival { return 301 https://brakebee.com/events/447?from=oaf; }
    location = /events/9th-annual-surprise-fine-arts-and-wine-festival/ { return 301 https://brakebee.com/events/447?from=oaf; }
    location = /events/alexandria-mn-art-in-the-park { return 301 https://brakebee.com/events/500?from=oaf; }
    location = /events/alexandria-mn-art-in-the-park/ { return 301 https://brakebee.com/events/500?from=oaf; }
    location = /events/litchfield-park-art-wine-festival-next-to-the-wigwam-resort-in-litchfield-park-arizona { return 301 https://brakebee.com/events/503?from=oaf; }
    location = /events/litchfield-park-art-wine-festival-next-to-the-wigwam-resort-in-litchfield-park-arizona/ { return 301 https://brakebee.com/events/503?from=oaf; }
    location = /events/an-art-and-wine-festival-in-litchfield-park { return 301 https://brakebee.com/events/503?from=oaf; }
    location = /events/an-art-and-wine-festival-in-litchfield-park/ { return 301 https://brakebee.com/events/503?from=oaf; }
    location = /events/ann-harbor-holiday-art-fair { return 301 https://brakebee.com/events/437?from=oaf; }
    location = /events/ann-harbor-holiday-art-fair/ { return 301 https://brakebee.com/events/437?from=oaf; }
    location = /events/appleton-wi-art-at-the-park { return 301 https://brakebee.com/events/499?from=oaf; }
    location = /events/appleton-wi-art-at-the-park/ { return 301 https://brakebee.com/events/499?from=oaf; }
    location = /events/appleton-wi-art-in-the-park { return 301 https://brakebee.com/events/485?from=oaf; }
    location = /events/appleton-wi-art-in-the-park/ { return 301 https://brakebee.com/events/485?from=oaf; }
    location = /events/art-at-the-big-red-barn-at-heber-az { return 301 https://brakebee.com/events/568?from=oaf; }
    location = /events/art-at-the-big-red-barn-at-heber-az/ { return 301 https://brakebee.com/events/568?from=oaf; }
    location = /events/art-at-the-glen-town-center-at-glenview-illinois { return 301 https://brakebee.com/events/542?from=oaf; }
    location = /events/art-at-the-glen-town-center-at-glenview-illinois/ { return 301 https://brakebee.com/events/542?from=oaf; }
    location = /events/art-in-the-park-2 { return 301 https://brakebee.com/events/461?from=oaf; }
    location = /events/art-in-the-park-2/ { return 301 https://brakebee.com/events/461?from=oaf; }
    location = /events/art-in-the-park { return 301 https://brakebee.com/events/461?from=oaf; }
    location = /events/art-in-the-park/ { return 301 https://brakebee.com/events/461?from=oaf; }
    location = /events/art-in-the-park-pagosa-springs-colorado { return 301 https://brakebee.com/events/565?from=oaf; }
    location = /events/art-in-the-park-pagosa-springs-colorado/ { return 301 https://brakebee.com/events/565?from=oaf; }
    location = /events/art-in-the-park-at-boulder-city { return 301 https://brakebee.com/events/511?from=oaf; }
    location = /events/art-in-the-park-at-boulder-city/ { return 301 https://brakebee.com/events/511?from=oaf; }
    location = /events/art-in-the-park-at-boulder-city-2 { return 301 https://brakebee.com/events/511?from=oaf; }
    location = /events/art-in-the-park-at-boulder-city-2/ { return 301 https://brakebee.com/events/511?from=oaf; }
    location = /events/artstreet-road-show-2020 { return 301 https://brakebee.com/events/455?from=oaf; }
    location = /events/artstreet-road-show-2020/ { return 301 https://brakebee.com/events/455?from=oaf; }
    location = /events/art-at-the-big-red-barn-heber-arizona { return 301 https://brakebee.com/events/570?from=oaf; }
    location = /events/art-at-the-big-red-barn-heber-arizona/ { return 301 https://brakebee.com/events/570?from=oaf; }
    location = /events/autumn-festival-an-arts-crafts-affair-2 { return 301 https://brakebee.com/events/486?from=oaf; }
    location = /events/autumn-festival-an-arts-crafts-affair-2/ { return 301 https://brakebee.com/events/486?from=oaf; }
    location = /events/autumn-festival-an-arts-crafts-affair { return 301 https://brakebee.com/events/486?from=oaf; }
    location = /events/autumn-festival-an-arts-crafts-affair/ { return 301 https://brakebee.com/events/486?from=oaf; }
    location = /events/autumn-festival-an-arts-crafts-affair-3 { return 301 https://brakebee.com/events/486?from=oaf; }
    location = /events/autumn-festival-an-arts-crafts-affair-3/ { return 301 https://brakebee.com/events/486?from=oaf; }
    location = /events/avon-art-celebration { return 301 https://brakebee.com/events/430?from=oaf; }
    location = /events/avon-art-celebration/ { return 301 https://brakebee.com/events/430?from=oaf; }
    location = /events/avon-arts-celebration { return 301 https://brakebee.com/events/551?from=oaf; }
    location = /events/avon-arts-celebration/ { return 301 https://brakebee.com/events/551?from=oaf; }
    location = /events/barrington-art-festival-barrington-illinois-2 { return 301 https://brakebee.com/events/530?from=oaf; }
    location = /events/barrington-art-festival-barrington-illinois-2/ { return 301 https://brakebee.com/events/530?from=oaf; }
    location = /events/bayshore-makers-market-in-glendale-wisconsin { return 301 https://brakebee.com/events/536?from=oaf; }
    location = /events/bayshore-makers-market-in-glendale-wisconsin/ { return 301 https://brakebee.com/events/536?from=oaf; }
    location = /events/beaux-arts-fair { return 301 https://brakebee.com/events/446?from=oaf; }
    location = /events/beaux-arts-fair/ { return 301 https://brakebee.com/events/446?from=oaf; }
    location = /events/broadmoor-traditions-fine-art-festival { return 301 https://brakebee.com/events/549?from=oaf; }
    location = /events/broadmoor-traditions-fine-art-festival/ { return 301 https://brakebee.com/events/549?from=oaf; }
    location = /events/brookings-sd-brookings-summer-arts-festival { return 301 https://brakebee.com/events/497?from=oaf; }
    location = /events/brookings-sd-brookings-summer-arts-festival/ { return 301 https://brakebee.com/events/497?from=oaf; }
    location = /events/buffalo-roundup-arts-festival { return 301 https://brakebee.com/events/567?from=oaf; }
    location = /events/buffalo-roundup-arts-festival/ { return 301 https://brakebee.com/events/567?from=oaf; }
    location = /events/burr-ridge-art-fair { return 301 https://brakebee.com/events/534?from=oaf; }
    location = /events/burr-ridge-art-fair/ { return 301 https://brakebee.com/events/534?from=oaf; }
    location = /events/carefree-az-fine-art-and-wine-festival-november { return 301 https://brakebee.com/events/579?from=oaf; }
    location = /events/carefree-az-fine-art-and-wine-festival-november/ { return 301 https://brakebee.com/events/579?from=oaf; }
    location = /events/carefree-fine-art-and-wine-festival { return 301 https://brakebee.com/events/513?from=oaf; }
    location = /events/carefree-fine-art-and-wine-festival/ { return 301 https://brakebee.com/events/513?from=oaf; }
    location = /events/cave-creek-art-market { return 301 https://brakebee.com/events/465?from=oaf; }
    location = /events/cave-creek-art-market/ { return 301 https://brakebee.com/events/465?from=oaf; }
    location = /events/cave-creek-az-art-market { return 301 https://brakebee.com/events/474?from=oaf; }
    location = /events/cave-creek-az-art-market/ { return 301 https://brakebee.com/events/474?from=oaf; }
    location = /events/cave-creek-fine-art-and-chocolate-affaire { return 301 https://brakebee.com/events/436?from=oaf; }
    location = /events/cave-creek-fine-art-and-chocolate-affaire/ { return 301 https://brakebee.com/events/436?from=oaf; }
    location = /events/cave-creek-fine-art-and-wine-festival-2 { return 301 https://brakebee.com/events/516?from=oaf; }
    location = /events/cave-creek-fine-art-and-wine-festival-2/ { return 301 https://brakebee.com/events/516?from=oaf; }
    location = /events/cave-creek-fine-art-and-wine-festival-in-cave-creek-arizona { return 301 https://brakebee.com/events/573?from=oaf; }
    location = /events/cave-creek-fine-art-and-wine-festival-in-cave-creek-arizona/ { return 301 https://brakebee.com/events/573?from=oaf; }
    location = /events/cave-creek-fine-art-market { return 301 https://brakebee.com/events/463?from=oaf; }
    location = /events/cave-creek-fine-art-market/ { return 301 https://brakebee.com/events/463?from=oaf; }
    location = /events/cave-creek-indian-art-market { return 301 https://brakebee.com/events/468?from=oaf; }
    location = /events/cave-creek-indian-art-market/ { return 301 https://brakebee.com/events/468?from=oaf; }
    location = /events/cave-creek-indian-market { return 301 https://brakebee.com/events/441?from=oaf; }
    location = /events/cave-creek-indian-market/ { return 301 https://brakebee.com/events/441?from=oaf; }
    location = /events/cave-creek-sculpture-and-wine-festival { return 301 https://brakebee.com/events/531?from=oaf; }
    location = /events/cave-creek-sculpture-and-wine-festival/ { return 301 https://brakebee.com/events/531?from=oaf; }
    location = /events/christmas-in-the-park { return 301 https://brakebee.com/events/467?from=oaf; }
    location = /events/christmas-in-the-park/ { return 301 https://brakebee.com/events/467?from=oaf; }
    location = /events/colorado-springs-co-garden-of-the-gods-art-festival { return 301 https://brakebee.com/events/557?from=oaf; }
    location = /events/colorado-springs-co-garden-of-the-gods-art-festival/ { return 301 https://brakebee.com/events/557?from=oaf; }
    location = /events/davenport-ia-beaux-arts-spring-art-festival { return 301 https://brakebee.com/events/493?from=oaf; }
    location = /events/davenport-ia-beaux-arts-spring-art-festival/ { return 301 https://brakebee.com/events/493?from=oaf; }
    location = /events/deerfield-art-festival-in-deerfield-illinois { return 301 https://brakebee.com/events/532?from=oaf; }
    location = /events/deerfield-art-festival-in-deerfield-illinois/ { return 301 https://brakebee.com/events/532?from=oaf; }
    location = /events/dove-mountain-at-marana-az-kevins-art-attack { return 301 https://brakebee.com/events/595?from=oaf; }
    location = /events/dove-mountain-at-marana-az-kevins-art-attack/ { return 301 https://brakebee.com/events/595?from=oaf; }
    location = /events/edmond-arts-festival-edmond-ok { return 301 https://brakebee.com/events/489?from=oaf; }
    location = /events/edmond-arts-festival-edmond-ok/ { return 301 https://brakebee.com/events/489?from=oaf; }
    location = /events/evergreen-elk-arts-fest-a-fall-festival-in-colorado { return 301 https://brakebee.com/events/552?from=oaf; }
    location = /events/evergreen-elk-arts-fest-a-fall-festival-in-colorado/ { return 301 https://brakebee.com/events/552?from=oaf; }
    location = /events/evergreen-family-harvest-festival { return 301 https://brakebee.com/events/453?from=oaf; }
    location = /events/evergreen-family-harvest-festival/ { return 301 https://brakebee.com/events/453?from=oaf; }
    location = /events/evergreen-mountain-art-celebration { return 301 https://brakebee.com/events/548?from=oaf; }
    location = /events/evergreen-mountain-art-celebration/ { return 301 https://brakebee.com/events/548?from=oaf; }
    location = /events/excelsior-mn-excelsior-art-at-the-lake { return 301 https://brakebee.com/events/491?from=oaf; }
    location = /events/excelsior-mn-excelsior-art-at-the-lake/ { return 301 https://brakebee.com/events/491?from=oaf; }
    location = /events/fall-beaux-arts-fair { return 301 https://brakebee.com/events/445?from=oaf; }
    location = /events/fall-beaux-arts-fair/ { return 301 https://brakebee.com/events/445?from=oaf; }
    location = /events/fountain-hills-arts-and-crafts-festival { return 301 https://brakebee.com/events/509?from=oaf; }
    location = /events/fountain-hills-arts-and-crafts-festival/ { return 301 https://brakebee.com/events/509?from=oaf; }
    location = /events/fall-waterfront-fine-art-and-wine-festival-in-scottsdale-az { return 301 https://brakebee.com/events/580?from=oaf; }
    location = /events/fall-waterfront-fine-art-and-wine-festival-in-scottsdale-az/ { return 301 https://brakebee.com/events/580?from=oaf; }
    location = /events/festival-of-arts-at-summerlin { return 301 https://brakebee.com/events/512?from=oaf; }
    location = /events/festival-of-arts-at-summerlin/ { return 301 https://brakebee.com/events/512?from=oaf; }
    location = /events/historic-old-litchfield-road-is-the-setting-for-this-festival-of-arts-in-the-west-valley { return 301 https://brakebee.com/events/508?from=oaf; }
    location = /events/historic-old-litchfield-road-is-the-setting-for-this-festival-of-arts-in-the-west-valley/ { return 301 https://brakebee.com/events/508?from=oaf; }
    location = /events/fountain-festival-of-fine-arts-and-crafts { return 301 https://brakebee.com/events/438?from=oaf; }
    location = /events/fountain-festival-of-fine-arts-and-crafts/ { return 301 https://brakebee.com/events/438?from=oaf; }
    location = /events/glencoe-festival-of-arts { return 301 https://brakebee.com/events/541?from=oaf; }
    location = /events/glencoe-festival-of-arts/ { return 301 https://brakebee.com/events/541?from=oaf; }
    location = /events/gold-canyon-az-kevins-art-attack { return 301 https://brakebee.com/events/594?from=oaf; }
    location = /events/gold-canyon-az-kevins-art-attack/ { return 301 https://brakebee.com/events/594?from=oaf; }
    location = /events/gold-coast-art-fair { return 301 https://brakebee.com/events/535?from=oaf; }
    location = /events/gold-coast-art-fair/ { return 301 https://brakebee.com/events/535?from=oaf; }
    location = /events/highlands-art-festival-denver-colorado { return 301 https://brakebee.com/events/544?from=oaf; }
    location = /events/highlands-art-festival-denver-colorado/ { return 301 https://brakebee.com/events/544?from=oaf; }
    location = /events/highlands-art-festival-denver-colorado-2 { return 301 https://brakebee.com/events/544?from=oaf; }
    location = /events/highlands-art-festival-denver-colorado-2/ { return 301 https://brakebee.com/events/544?from=oaf; }
    location = /events/iowa-arts-festival-iowa-city-ia { return 301 https://brakebee.com/events/490?from=oaf; }
    location = /events/iowa-arts-festival-iowa-city-ia/ { return 301 https://brakebee.com/events/490?from=oaf; }
    location = /events/iowa-city-summer-of-the-arts { return 301 https://brakebee.com/events/495?from=oaf; }
    location = /events/iowa-city-summer-of-the-arts/ { return 301 https://brakebee.com/events/495?from=oaf; }
    location = /events/july-art-at-the-red-barn-in-heber-arizona { return 301 https://brakebee.com/events/569?from=oaf; }
    location = /events/july-art-at-the-red-barn-in-heber-arizona/ { return 301 https://brakebee.com/events/569?from=oaf; }
    location = /events/kensington-metropark-art-fair { return 301 https://brakebee.com/events/429?from=oaf; }
    location = /events/kensington-metropark-art-fair/ { return 301 https://brakebee.com/events/429?from=oaf; }
    location = /events/kevins-art-attack-arts-and-crafts-show-in-scottsdale-az { return 301 https://brakebee.com/events/538?from=oaf; }
    location = /events/kevins-art-attack-arts-and-crafts-show-in-scottsdale-az/ { return 301 https://brakebee.com/events/538?from=oaf; }
    location = /events/kevins-art-attack-arts-and-crafts-show-in-tucson { return 301 https://brakebee.com/events/524?from=oaf; }
    location = /events/kevins-art-attack-arts-and-crafts-show-in-tucson/ { return 301 https://brakebee.com/events/524?from=oaf; }
    location = /events/kevins-art-attack-scottsdale { return 301 https://brakebee.com/events/522?from=oaf; }
    location = /events/kevins-art-attack-scottsdale/ { return 301 https://brakebee.com/events/522?from=oaf; }
    location = /events/kevins-art-attack-dove-mountain-art-and-craft-show-in-marana-arizona { return 301 https://brakebee.com/events/525?from=oaf; }
    location = /events/kevins-art-attack-dove-mountain-art-and-craft-show-in-marana-arizona/ { return 301 https://brakebee.com/events/525?from=oaf; }
    location = /events/kevins-art-attack-art-and-crafts-show-at-cave-creek-az { return 301 https://brakebee.com/events/543?from=oaf; }
    location = /events/kevins-art-attack-art-and-crafts-show-at-cave-creek-az/ { return 301 https://brakebee.com/events/543?from=oaf; }
    location = /events/kevins-art-attack-arts-and-craft-show-in-scottsdale-az { return 301 https://brakebee.com/events/529?from=oaf; }
    location = /events/kevins-art-attack-arts-and-craft-show-in-scottsdale-az/ { return 301 https://brakebee.com/events/529?from=oaf; }
    location = /events/kevins-art-attack-cave-creek-az { return 301 https://brakebee.com/events/591?from=oaf; }
    location = /events/kevins-art-attack-cave-creek-az/ { return 301 https://brakebee.com/events/591?from=oaf; }
    location = /events/kevins-art-attack-in-gold-canyon-az { return 301 https://brakebee.com/events/547?from=oaf; }
    location = /events/kevins-art-attack-in-gold-canyon-az/ { return 301 https://brakebee.com/events/547?from=oaf; }
    location = /events/kevins-art-attack-in-oro-valley-az { return 301 https://brakebee.com/events/593?from=oaf; }
    location = /events/kevins-art-attack-in-oro-valley-az/ { return 301 https://brakebee.com/events/593?from=oaf; }
    location = /events/kevins-art-attack-an-arts-and-craft-show-in-gold-canyon-az { return 301 https://brakebee.com/events/526?from=oaf; }
    location = /events/kevins-art-attack-an-arts-and-craft-show-in-gold-canyon-az/ { return 301 https://brakebee.com/events/526?from=oaf; }
    location = /events/scottsdales-number-one-art-festival-destination-kierland-commons-fine-art-and-wine-classic { return 301 https://brakebee.com/events/507?from=oaf; }
    location = /events/scottsdales-number-one-art-festival-destination-kierland-commons-fine-art-and-wine-classic/ { return 301 https://brakebee.com/events/507?from=oaf; }
    location = /events/kierland-commons-fine-art-and-wine-festival-in-scottsdale { return 301 https://brakebee.com/events/507?from=oaf; }
    location = /events/kierland-commons-fine-art-and-wine-festival-in-scottsdale/ { return 301 https://brakebee.com/events/507?from=oaf; }
    location = /events/kierland-fine-art-wine-festival-at-scottsdale { return 301 https://brakebee.com/events/502?from=oaf; }
    location = /events/kierland-fine-art-wine-festival-at-scottsdale/ { return 301 https://brakebee.com/events/502?from=oaf; }
    location = /events/kierland-fine-art-and-wine-festival-at-scottsdale { return 301 https://brakebee.com/events/502?from=oaf; }
    location = /events/kierland-fine-art-and-wine-festival-at-scottsdale/ { return 301 https://brakebee.com/events/502?from=oaf; }
    location = /events/lake-dillon-arts-festival { return 301 https://brakebee.com/events/550?from=oaf; }
    location = /events/lake-dillon-arts-festival/ { return 301 https://brakebee.com/events/550?from=oaf; }
    location = /events/lenexa-ks { return 301 https://brakebee.com/events/558?from=oaf; }
    location = /events/lenexa-ks/ { return 301 https://brakebee.com/events/558?from=oaf; }
    location = /events/lincolnshire-art-festival { return 301 https://brakebee.com/events/537?from=oaf; }
    location = /events/lincolnshire-art-festival/ { return 301 https://brakebee.com/events/537?from=oaf; }
    location = /events/litchfield-park-art-wine-festival { return 301 https://brakebee.com/events/471?from=oaf; }
    location = /events/litchfield-park-art-wine-festival/ { return 301 https://brakebee.com/events/471?from=oaf; }
    location = /events/litchfield-park-art-wine-festival-23rd-annual { return 301 https://brakebee.com/events/456?from=oaf; }
    location = /events/litchfield-park-art-wine-festival-23rd-annual/ { return 301 https://brakebee.com/events/456?from=oaf; }
    location = /events/litchfield-park-az-art-wine-festival { return 301 https://brakebee.com/events/479?from=oaf; }
    location = /events/litchfield-park-az-art-wine-festival/ { return 301 https://brakebee.com/events/479?from=oaf; }
    location = /events/litchfield-park-az-wigwam-festival-of-fine-art-2 { return 301 https://brakebee.com/events/478?from=oaf; }
    location = /events/litchfield-park-az-wigwam-festival-of-fine-art-2/ { return 301 https://brakebee.com/events/478?from=oaf; }
    location = /events/litchfield-park-festival-of-arts { return 301 https://brakebee.com/events/515?from=oaf; }
    location = /events/litchfield-park-festival-of-arts/ { return 301 https://brakebee.com/events/515?from=oaf; }
    location = /events/litchfield-park-festival-of-arts-50th-annual-2 { return 301 https://brakebee.com/events/459?from=oaf; }
    location = /events/litchfield-park-festival-of-arts-50th-annual-2/ { return 301 https://brakebee.com/events/459?from=oaf; }
    location = /events/litchfield-park-festival-of-arts-50th-annual { return 301 https://brakebee.com/events/439?from=oaf; }
    location = /events/litchfield-park-festival-of-arts-50th-annual/ { return 301 https://brakebee.com/events/439?from=oaf; }
    location = /events/litchfield-park-festival-of-the-arts { return 301 https://brakebee.com/events/464?from=oaf; }
    location = /events/litchfield-park-festival-of-the-arts/ { return 301 https://brakebee.com/events/464?from=oaf; }
    location = /events/loveland-fine-art-sculpture-invitational { return 301 https://brakebee.com/events/472?from=oaf; }
    location = /events/loveland-fine-art-sculpture-invitational/ { return 301 https://brakebee.com/events/472?from=oaf; }
    location = /events/loveland-fine-art-invitational { return 301 https://brakebee.com/events/443?from=oaf; }
    location = /events/loveland-fine-art-invitational/ { return 301 https://brakebee.com/events/443?from=oaf; }
    location = /events/madison-wi-art-fair-on-the-square { return 301 https://brakebee.com/events/563?from=oaf; }
    location = /events/madison-wi-art-fair-on-the-square/ { return 301 https://brakebee.com/events/563?from=oaf; }
    location = /events/millennium-art-festival-chicago { return 301 https://brakebee.com/events/533?from=oaf; }
    location = /events/millennium-art-festival-chicago/ { return 301 https://brakebee.com/events/533?from=oaf; }
    location = /events/mothers-day-fine-art-festival-in-prescott-az { return 301 https://brakebee.com/events/564?from=oaf; }
    location = /events/mothers-day-fine-art-festival-in-prescott-az/ { return 301 https://brakebee.com/events/564?from=oaf; }
    location = /events/mt-horeb-art-fair { return 301 https://brakebee.com/events/498?from=oaf; }
    location = /events/mt-horeb-art-fair/ { return 301 https://brakebee.com/events/498?from=oaf; }
    location = /events/northbrook-art-in-the-park-in-northbrook-illinois { return 301 https://brakebee.com/events/527?from=oaf; }
    location = /events/northbrook-art-in-the-park-in-northbrook-illinois/ { return 301 https://brakebee.com/events/527?from=oaf; }
    location = /events/oconomowoc-festival-of-the-arts { return 301 https://brakebee.com/events/582?from=oaf; }
    location = /events/oconomowoc-festival-of-the-arts/ { return 301 https://brakebee.com/events/582?from=oaf; }
    location = /events/oconomowoc-wi-festival-of-the-arts { return 301 https://brakebee.com/events/501?from=oaf; }
    location = /events/oconomowoc-wi-festival-of-the-arts/ { return 301 https://brakebee.com/events/501?from=oaf; }
    location = /events/omaha-ne-summer-arts-festival { return 301 https://brakebee.com/events/556?from=oaf; }
    location = /events/omaha-ne-summer-arts-festival/ { return 301 https://brakebee.com/events/556?from=oaf; }
    location = /events/orange-city-ia-artburst { return 301 https://brakebee.com/events/492?from=oaf; }
    location = /events/orange-city-ia-artburst/ { return 301 https://brakebee.com/events/492?from=oaf; }
    location = /events/oro-valley-festival-of-the-arts { return 301 https://brakebee.com/events/517?from=oaf; }
    location = /events/oro-valley-festival-of-the-arts/ { return 301 https://brakebee.com/events/517?from=oaf; }
    location = /events/oro-valley-az-spring-festival-of-the-arts { return 301 https://brakebee.com/events/554?from=oaf; }
    location = /events/oro-valley-az-spring-festival-of-the-arts/ { return 301 https://brakebee.com/events/554?from=oaf; }
    location = /events/palmer-park-art-festival { return 301 https://brakebee.com/events/428?from=oaf; }
    location = /events/palmer-park-art-festival/ { return 301 https://brakebee.com/events/428?from=oaf; }
    location = /events/park-hill-art-fest-in-denver-colorado { return 301 https://brakebee.com/events/539?from=oaf; }
    location = /events/park-hill-art-fest-in-denver-colorado/ { return 301 https://brakebee.com/events/539?from=oaf; }
    location = /events/park-hill-art-fest-in-denver-colorado-2 { return 301 https://brakebee.com/events/539?from=oaf; }
    location = /events/park-hill-art-fest-in-denver-colorado-2/ { return 301 https://brakebee.com/events/539?from=oaf; }
    location = /events/pearl-street-arts-fest { return 301 https://brakebee.com/events/566?from=oaf; }
    location = /events/pearl-street-arts-fest/ { return 301 https://brakebee.com/events/566?from=oaf; }
    location = /events/safford-spring-festival { return 301 https://brakebee.com/events/484?from=oaf; }
    location = /events/safford-spring-festival/ { return 301 https://brakebee.com/events/484?from=oaf; }
    location = /events/salina-ks-smoky-hill-river-festival { return 301 https://brakebee.com/events/562?from=oaf; }
    location = /events/salina-ks-smoky-hill-river-festival/ { return 301 https://brakebee.com/events/562?from=oaf; }
    location = /events/san-tan-art-and-wine-festival-in-gilbert-az { return 301 https://brakebee.com/events/545?from=oaf; }
    location = /events/san-tan-art-and-wine-festival-in-gilbert-az/ { return 301 https://brakebee.com/events/545?from=oaf; }
    location = /events/san-tan-art-and-wine-festival-in-gilbert-az-2 { return 301 https://brakebee.com/events/545?from=oaf; }
    location = /events/san-tan-art-and-wine-festival-in-gilbert-az-2/ { return 301 https://brakebee.com/events/545?from=oaf; }
    location = /events/scottsdale-az-kierland-fine-art-and-wine-classic { return 301 https://brakebee.com/events/473?from=oaf; }
    location = /events/scottsdale-az-kierland-fine-art-and-wine-classic/ { return 301 https://brakebee.com/events/473?from=oaf; }
    location = /events/scottsdale-az-14th-annual-waterfront-fine-art-and-wine-festival { return 301 https://brakebee.com/events/597?from=oaf; }
    location = /events/scottsdale-az-14th-annual-waterfront-fine-art-and-wine-festival/ { return 301 https://brakebee.com/events/597?from=oaf; }
    location = /events/scottsdale-az-kevins-art-attack { return 301 https://brakebee.com/events/592?from=oaf; }
    location = /events/scottsdale-az-kevins-art-attack/ { return 301 https://brakebee.com/events/592?from=oaf; }
    location = /events/scottsdale-az-kierland-fine-art-wine-classic-2 { return 301 https://brakebee.com/events/476?from=oaf; }
    location = /events/scottsdale-az-kierland-fine-art-wine-classic-2/ { return 301 https://brakebee.com/events/476?from=oaf; }
    location = /events/sonoran-art-festival { return 301 https://brakebee.com/events/475?from=oaf; }
    location = /events/sonoran-art-festival/ { return 301 https://brakebee.com/events/475?from=oaf; }
    location = /events/sonoran-fine-art-and-wine-festival-returns-to-stage-coach-village { return 301 https://brakebee.com/events/505?from=oaf; }
    location = /events/sonoran-fine-art-and-wine-festival-returns-to-stage-coach-village/ { return 301 https://brakebee.com/events/505?from=oaf; }
    location = /events/sonoran-fine-art-and-wine-festival-in-cave-creek-arizona { return 301 https://brakebee.com/events/505?from=oaf; }
    location = /events/sonoran-fine-art-and-wine-festival-in-cave-creek-arizona/ { return 301 https://brakebee.com/events/505?from=oaf; }
    location = /events/spring-carefree-fine-art-wine-festival { return 301 https://brakebee.com/events/514?from=oaf; }
    location = /events/spring-carefree-fine-art-wine-festival/ { return 301 https://brakebee.com/events/514?from=oaf; }
    location = /events/spring-fountain-festival-of-fine-arts-crafts { return 301 https://brakebee.com/events/510?from=oaf; }
    location = /events/spring-fountain-festival-of-fine-arts-crafts/ { return 301 https://brakebee.com/events/510?from=oaf; }
    location = /events/spring-green-art-fair { return 301 https://brakebee.com/events/496?from=oaf; }
    location = /events/spring-green-art-fair/ { return 301 https://brakebee.com/events/496?from=oaf; }
    location = /events/spring-green-wi-art-fair { return 301 https://brakebee.com/events/561?from=oaf; }
    location = /events/spring-green-wi-art-fair/ { return 301 https://brakebee.com/events/561?from=oaf; }
    location = /events/spring-green-wi-art-fair-2 { return 301 https://brakebee.com/events/561?from=oaf; }
    location = /events/spring-green-wi-art-fair-2/ { return 301 https://brakebee.com/events/561?from=oaf; }
    location = /events/spring-green-wi-arts-and-crafts-fair { return 301 https://brakebee.com/events/480?from=oaf; }
    location = /events/spring-green-wi-arts-and-crafts-fair/ { return 301 https://brakebee.com/events/480?from=oaf; }
    location = /events/spring-lincoln-roscoe-arts-and-crafts-fair-chicago { return 301 https://brakebee.com/events/528?from=oaf; }
    location = /events/spring-lincoln-roscoe-arts-and-crafts-fair-chicago/ { return 301 https://brakebee.com/events/528?from=oaf; }
    location = /events/st-charles-il-fine-art-show { return 301 https://brakebee.com/events/494?from=oaf; }
    location = /events/st-charles-il-fine-art-show/ { return 301 https://brakebee.com/events/494?from=oaf; }
    location = /events/st-george-utah-art-festival { return 301 https://brakebee.com/events/555?from=oaf; }
    location = /events/st-george-utah-art-festival/ { return 301 https://brakebee.com/events/555?from=oaf; }
    location = /events/stage-coach-village-fine-art-and-wine-festival { return 301 https://brakebee.com/events/596?from=oaf; }
    location = /events/stage-coach-village-fine-art-and-wine-festival/ { return 301 https://brakebee.com/events/596?from=oaf; }
    location = /events/stagecoach-village-art-festival { return 301 https://brakebee.com/events/442?from=oaf; }
    location = /events/stagecoach-village-art-festival/ { return 301 https://brakebee.com/events/442?from=oaf; }
    location = /events/stagecoach-village-art-on-the-plaza { return 301 https://brakebee.com/events/440?from=oaf; }
    location = /events/stagecoach-village-art-on-the-plaza/ { return 301 https://brakebee.com/events/440?from=oaf; }
    location = /events/stagecoach-village-fine-art-festival-11th-annual { return 301 https://brakebee.com/events/460?from=oaf; }
    location = /events/stagecoach-village-fine-art-festival-11th-annual/ { return 301 https://brakebee.com/events/460?from=oaf; }
    location = /events/suite-art-columbus-oh { return 301 https://brakebee.com/events/452?from=oaf; }
    location = /events/suite-art-columbus-oh/ { return 301 https://brakebee.com/events/452?from=oaf; }
    location = /events/suite-art-troy-mi { return 301 https://brakebee.com/events/451?from=oaf; }
    location = /events/suite-art-troy-mi/ { return 301 https://brakebee.com/events/451?from=oaf; }
    location = /events/summerlin-nv-festival-of-arts { return 301 https://brakebee.com/events/584?from=oaf; }
    location = /events/summerlin-nv-festival-of-arts/ { return 301 https://brakebee.com/events/584?from=oaf; }
    location = /events/the-avon-arts-celebration { return 301 https://brakebee.com/events/454?from=oaf; }
    location = /events/the-avon-arts-celebration/ { return 301 https://brakebee.com/events/454?from=oaf; }
    location = /events/the-park-hill-art-festival { return 301 https://brakebee.com/events/433?from=oaf; }
    location = /events/the-park-hill-art-festival/ { return 301 https://brakebee.com/events/433?from=oaf; }
    location = /events/tubac-az-festival-of-the-arts-2 { return 301 https://brakebee.com/events/477?from=oaf; }
    location = /events/tubac-az-festival-of-the-arts-2/ { return 301 https://brakebee.com/events/477?from=oaf; }
    location = /events/tubac-az-festival-of-the-arts { return 301 https://brakebee.com/events/520?from=oaf; }
    location = /events/tubac-az-festival-of-the-arts/ { return 301 https://brakebee.com/events/520?from=oaf; }
    location = /events/tubac-az-festival-of-the-arts-tubac-az { return 301 https://brakebee.com/events/520?from=oaf; }
    location = /events/tubac-az-festival-of-the-arts-tubac-az/ { return 301 https://brakebee.com/events/520?from=oaf; }
    location = /events/tubac-festival-of-arts-62nd-annual-cancelled { return 301 https://brakebee.com/events/458?from=oaf; }
    location = /events/tubac-festival-of-arts-62nd-annual-cancelled/ { return 301 https://brakebee.com/events/458?from=oaf; }
    location = /events/tubac-fine-art-wine-fiesta { return 301 https://brakebee.com/events/466?from=oaf; }
    location = /events/tubac-fine-art-wine-fiesta/ { return 301 https://brakebee.com/events/466?from=oaf; }
    location = /events/tucson-made-in-tucson-market { return 301 https://brakebee.com/events/482?from=oaf; }
    location = /events/tucson-made-in-tucson-market/ { return 301 https://brakebee.com/events/482?from=oaf; }
    location = /events/tucson-museum-of-art-spring-artisan-market { return 301 https://brakebee.com/events/481?from=oaf; }
    location = /events/tucson-museum-of-art-spring-artisan-market/ { return 301 https://brakebee.com/events/481?from=oaf; }
    location = /events/cave-creek-fine-art-and-wine-festival { return 301 https://brakebee.com/events/506?from=oaf; }
    location = /events/cave-creek-fine-art-and-wine-festival/ { return 301 https://brakebee.com/events/506?from=oaf; }
    location = /events/waterfront-fine-art-and-wine-festival { return 301 https://brakebee.com/events/521?from=oaf; }
    location = /events/waterfront-fine-art-and-wine-festival/ { return 301 https://brakebee.com/events/521?from=oaf; }
    location = /events/white-fish-bay-art-fest-in-white-fish-bay-wisconsin { return 301 https://brakebee.com/events/540?from=oaf; }
    location = /events/white-fish-bay-art-fest-in-white-fish-bay-wisconsin/ { return 301 https://brakebee.com/events/540?from=oaf; }
    location = /events/wichita-ks-art-autumn-festival { return 301 https://brakebee.com/events/587?from=oaf; }
    location = /events/wichita-ks-art-autumn-festival/ { return 301 https://brakebee.com/events/587?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-3 { return 301 https://brakebee.com/events/470?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-3/ { return 301 https://brakebee.com/events/470?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-2 { return 301 https://brakebee.com/events/470?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-2/ { return 301 https://brakebee.com/events/470?from=oaf; }
    location = /events/wigwam-festival-of-fine-art { return 301 https://brakebee.com/events/470?from=oaf; }
    location = /events/wigwam-festival-of-fine-art/ { return 301 https://brakebee.com/events/470?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-11th-annual { return 301 https://brakebee.com/events/457?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-11th-annual/ { return 301 https://brakebee.com/events/457?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-litchfield-park-az { return 301 https://brakebee.com/events/576?from=oaf; }
    location = /events/wigwam-festival-of-fine-art-litchfield-park-az/ { return 301 https://brakebee.com/events/576?from=oaf; }
    location = /events/a-celebration-of-artistic-excellence-at-the-wigwam-resort-in-litchfield-park-arizona { return 301 https://brakebee.com/events/504?from=oaf; }
    location = /events/a-celebration-of-artistic-excellence-at-the-wigwam-resort-in-litchfield-park-arizona/ { return 301 https://brakebee.com/events/504?from=oaf; }
    location = /events/wigwam-holiday-festival-of-arts-litchfield-park-az { return 301 https://brakebee.com/events/578?from=oaf; }
    location = /events/wigwam-holiday-festival-of-arts-litchfield-park-az/ { return 301 https://brakebee.com/events/578?from=oaf; }

    # ============================================
    # PROFILE REDIRECTS (301 Permanent)
    # ============================================

    location = /artists/meyerdirk-art { return 301 https://brakebee.com/profile/1234568006?from=oaf; }
    location = /artists/meyerdirk-art/ { return 301 https://brakebee.com/profile/1234568006?from=oaf; }
    location = /artists/7055-direct { return 301 https://brakebee.com/profile/1234568020?from=oaf; }
    location = /artists/7055-direct/ { return 301 https://brakebee.com/profile/1234568020?from=oaf; }
    location = /artists/completelynuts { return 301 https://brakebee.com/profile/1234568022?from=oaf; }
    location = /artists/completelynuts/ { return 301 https://brakebee.com/profile/1234568022?from=oaf; }
    location = /artists/vintagehonorflags { return 301 https://brakebee.com/profile/1234568039?from=oaf; }
    location = /artists/vintagehonorflags/ { return 301 https://brakebee.com/profile/1234568039?from=oaf; }
    location = /artists/ronnaturegallery-net { return 301 https://brakebee.com/profile/1234568042?from=oaf; }
    location = /artists/ronnaturegallery-net/ { return 301 https://brakebee.com/profile/1234568042?from=oaf; }
    location = /artists/charlescsantora-com { return 301 https://brakebee.com/profile/1234568043?from=oaf; }
    location = /artists/charlescsantora-com/ { return 301 https://brakebee.com/profile/1234568043?from=oaf; }
    location = /artists/nplant9gmail-com { return 301 https://brakebee.com/profile/1234568061?from=oaf; }
    location = /artists/nplant9gmail-com/ { return 301 https://brakebee.com/profile/1234568061?from=oaf; }
    location = /artists/ichacanterogmail-com { return 301 https://brakebee.com/profile/1234568066?from=oaf; }
    location = /artists/ichacanterogmail-com/ { return 301 https://brakebee.com/profile/1234568066?from=oaf; }
    location = /artists/kellyanneoneillcharter-net { return 301 https://brakebee.com/profile/1234568071?from=oaf; }
    location = /artists/kellyanneoneillcharter-net/ { return 301 https://brakebee.com/profile/1234568071?from=oaf; }
    location = /artists/laurie-albreaproducts { return 301 https://brakebee.com/profile/1234568073?from=oaf; }
    location = /artists/laurie-albreaproducts/ { return 301 https://brakebee.com/profile/1234568073?from=oaf; }
    location = /artists/janicestubbs { return 301 https://brakebee.com/profile/1234568121?from=oaf; }
    location = /artists/janicestubbs/ { return 301 https://brakebee.com/profile/1234568121?from=oaf; }
    location = /artists/mrbetts47 { return 301 https://brakebee.com/profile/1234568165?from=oaf; }
    location = /artists/mrbetts47/ { return 301 https://brakebee.com/profile/1234568165?from=oaf; }
    location = /artists/byron_neslen { return 301 https://brakebee.com/profile/1234568244?from=oaf; }
    location = /artists/byron_neslen/ { return 301 https://brakebee.com/profile/1234568244?from=oaf; }
    location = /artists/mikegreenfieldsfineart { return 301 https://brakebee.com/profile/1234568245?from=oaf; }
    location = /artists/mikegreenfieldsfineart/ { return 301 https://brakebee.com/profile/1234568245?from=oaf; }
    location = /artists/metalmemories { return 301 https://brakebee.com/profile/1234568247?from=oaf; }
    location = /artists/metalmemories/ { return 301 https://brakebee.com/profile/1234568247?from=oaf; }
    location = /artists/bitterrootblades { return 301 https://brakebee.com/profile/1234568249?from=oaf; }
    location = /artists/bitterrootblades/ { return 301 https://brakebee.com/profile/1234568249?from=oaf; }
    location = /artists/faughnphotography { return 301 https://brakebee.com/profile/1234568250?from=oaf; }
    location = /artists/faughnphotography/ { return 301 https://brakebee.com/profile/1234568250?from=oaf; }
    location = /artists/kimobrzut { return 301 https://brakebee.com/profile/1234568252?from=oaf; }
    location = /artists/kimobrzut/ { return 301 https://brakebee.com/profile/1234568252?from=oaf; }
    location = /artists/conniebaker { return 301 https://brakebee.com/profile/1234568254?from=oaf; }
    location = /artists/conniebaker/ { return 301 https://brakebee.com/profile/1234568254?from=oaf; }
    location = /artists/davidhardingart { return 301 https://brakebee.com/profile/1234568255?from=oaf; }
    location = /artists/davidhardingart/ { return 301 https://brakebee.com/profile/1234568255?from=oaf; }
    location = /artists/allcraftsplus { return 301 https://brakebee.com/profile/1234568256?from=oaf; }
    location = /artists/allcraftsplus/ { return 301 https://brakebee.com/profile/1234568256?from=oaf; }
    location = /artists/thomasphotoarts { return 301 https://brakebee.com/profile/1234568257?from=oaf; }
    location = /artists/thomasphotoarts/ { return 301 https://brakebee.com/profile/1234568257?from=oaf; }
    location = /artists/desertbarreldesigns { return 301 https://brakebee.com/profile/1234568259?from=oaf; }
    location = /artists/desertbarreldesigns/ { return 301 https://brakebee.com/profile/1234568259?from=oaf; }
    location = /artists/glasscliffstudio { return 301 https://brakebee.com/profile/1234568260?from=oaf; }
    location = /artists/glasscliffstudio/ { return 301 https://brakebee.com/profile/1234568260?from=oaf; }
    location = /artists/fabphotography { return 301 https://brakebee.com/profile/1234568261?from=oaf; }
    location = /artists/fabphotography/ { return 301 https://brakebee.com/profile/1234568261?from=oaf; }
    location = /artists/paul-hopman { return 301 https://brakebee.com/profile/1234568276?from=oaf; }
    location = /artists/paul-hopman/ { return 301 https://brakebee.com/profile/1234568276?from=oaf; }
    location = /artists/cheyenne_rouse { return 301 https://brakebee.com/profile/1234568296?from=oaf; }
    location = /artists/cheyenne_rouse/ { return 301 https://brakebee.com/profile/1234568296?from=oaf; }
    location = /artists/maris-dsp { return 301 https://brakebee.com/profile/1234568309?from=oaf; }
    location = /artists/maris-dsp/ { return 301 https://brakebee.com/profile/1234568309?from=oaf; }
    location = /artists/gesturedesigns { return 301 https://brakebee.com/profile/1234568329?from=oaf; }
    location = /artists/gesturedesigns/ { return 301 https://brakebee.com/profile/1234568329?from=oaf; }
    location = /artists/jewelrydesignsbyzoegmail-com { return 301 https://brakebee.com/profile/1234568392?from=oaf; }
    location = /artists/jewelrydesignsbyzoegmail-com/ { return 301 https://brakebee.com/profile/1234568392?from=oaf; }
    location = /artists/poppopsworkshop { return 301 https://brakebee.com/profile/1234568453?from=oaf; }
    location = /artists/poppopsworkshop/ { return 301 https://brakebee.com/profile/1234568453?from=oaf; }
    location = /artists/cvermillion12 { return 301 https://brakebee.com/profile/1234568007?from=oaf; }
    location = /artists/cvermillion12/ { return 301 https://brakebee.com/profile/1234568007?from=oaf; }
    location = /artists/silvijamosaicartsinc-org { return 301 https://brakebee.com/profile/1234568034?from=oaf; }
    location = /artists/silvijamosaicartsinc-org/ { return 301 https://brakebee.com/profile/1234568034?from=oaf; }
    location = /artists/denisethunderbirdartists-com { return 301 https://brakebee.com/profile/1234568035?from=oaf; }
    location = /artists/denisethunderbirdartists-com/ { return 301 https://brakebee.com/profile/1234568035?from=oaf; }
    location = /artists/markintegrityshows { return 301 https://brakebee.com/profile/1234568036?from=oaf; }
    location = /artists/markintegrityshows/ { return 301 https://brakebee.com/profile/1234568036?from=oaf; }
    location = /artists/viglassillusions { return 301 https://brakebee.com/profile/1234568038?from=oaf; }
    location = /artists/viglassillusions/ { return 301 https://brakebee.com/profile/1234568038?from=oaf; }
    location = /artists/plac { return 301 https://brakebee.com/profile/1234568089?from=oaf; }
    location = /artists/plac/ { return 301 https://brakebee.com/profile/1234568089?from=oaf; }
    location = /artists/koizencellars { return 301 https://brakebee.com/profile/1234568117?from=oaf; }
    location = /artists/koizencellars/ { return 301 https://brakebee.com/profile/1234568117?from=oaf; }
    location = /artists/hpifestivals { return 301 https://brakebee.com/profile/1234568279?from=oaf; }
    location = /artists/hpifestivals/ { return 301 https://brakebee.com/profile/1234568279?from=oaf; }
    location = /artists/artburst { return 301 https://brakebee.com/profile/1234568282?from=oaf; }
    location = /artists/artburst/ { return 301 https://brakebee.com/profile/1234568282?from=oaf; }
    location = /artists/kevins-art-attack { return 301 https://brakebee.com/profile/1234568283?from=oaf; }
    location = /artists/kevins-art-attack/ { return 301 https://brakebee.com/profile/1234568283?from=oaf; }
    location = /artists/fountainfestival { return 301 https://brakebee.com/profile/1234568291?from=oaf; }
    location = /artists/fountainfestival/ { return 301 https://brakebee.com/profile/1234568291?from=oaf; }
    location = /artists/art-in-the-park { return 301 https://brakebee.com/profile/1234568292?from=oaf; }
    location = /artists/art-in-the-park/ { return 301 https://brakebee.com/profile/1234568292?from=oaf; }
    location = /artists/summerlinfoa { return 301 https://brakebee.com/profile/1234568294?from=oaf; }
    location = /artists/summerlinfoa/ { return 301 https://brakebee.com/profile/1234568294?from=oaf; }
    location = /artists/amdur-productions { return 301 https://brakebee.com/profile/1234568300?from=oaf; }
    location = /artists/amdur-productions/ { return 301 https://brakebee.com/profile/1234568300?from=oaf; }
    location = /artists/colorado-art-shows { return 301 https://brakebee.com/profile/1234568301?from=oaf; }
    location = /artists/colorado-art-shows/ { return 301 https://brakebee.com/profile/1234568301?from=oaf; }
    location = /artists/omahasummerarts { return 301 https://brakebee.com/profile/1234568344?from=oaf; }
    location = /artists/omahasummerarts/ { return 301 https://brakebee.com/profile/1234568344?from=oaf; }
    location = /artists/springgreenartfair { return 301 https://brakebee.com/profile/1234568363?from=oaf; }
    location = /artists/springgreenartfair/ { return 301 https://brakebee.com/profile/1234568363?from=oaf; }

    # ============================================
    # CATCH-ALL: Redirect everything else to Brakebee homepage
    # ============================================
    location / {
        return 301 https://brakebee.com?from=oaf;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name onlineartfestival.com www.onlineartfestival.com;
    return 301 https://$host$request_uri;
}

