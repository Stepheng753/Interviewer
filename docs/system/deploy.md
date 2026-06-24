# Deployment Guide: AIU.stepheng753.com

This guide provides step-by-step instructions to configure DNS, acquire SSL certificates, configure Nginx, bootstrap Node/PM2, and set up automated deployments for the Interviewer project under the domain **AIU.stepheng753.com** on `flash-server`.

---

## 1. Configure Subdomain DNS in Hostinger

To point `AIU.stepheng753.com` to your server:
1. Log into your **Hostinger** control panel and navigate to **DNS Zone Editor**.
2. Add a new **CNAME Record**:
   - **Type**: `CNAME`
   - **Name**: `AIU`
   - **Content (Target)**: `flash-server.ddns.net`
   - **TTL**: `14400`
3. Click **Add Record**.

---

## 2. Obtain SSL Certificate (DNS Manual Challenge)

Because the subdomain points via DDNS, you must generate the Let's Encrypt SSL certificate manually using a DNS text challenge:

1. Run the manual Certbot command on your server:
   ```bash
   sudo certbot certonly --manual --preferred-challenges dns -d AIU.stepheng753.com
   ```
2. Certbot will print instructions prompting you to add a **TXT Record** in Hostinger DNS:
   - **Type**: `TXT`
   - **Name**: `_acme-challenge.AIU`
   - **TXT Value (Content)**: *(Copy the verification string provided in the terminal)*
   - **TTL**: `300` *(low TTL for faster verification)*
3. Add the TXT record in Hostinger.
4. Before pressing **Enter** in the Certbot terminal, verify the TXT record has propagated globally (you can run `nslookup -type=TXT _acme-challenge.AIU.stepheng753.com` or check via [whatsmydns.net](https://www.whatsmydns.net/#TXT/_acme-challenge.AIU.stepheng753.com)).
5. Press **Enter** in the terminal to complete validation. Certbot will save your PEM keys to:
   - Certificate: `/etc/letsencrypt/live/AIU.stepheng753.com/fullchain.pem`
   - Private Key: `/etc/letsencrypt/live/AIU.stepheng753.com/privkey.pem`

---

## 3. Configure and Activate Nginx

1. Create a new server block configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/AIU.stepheng753.com
   ```
2. Paste the following configuration, which handles HTTPS, static serving, and reverse-proxying:
   ```nginx
   # HTTP to HTTPS Redirect
   server {
       listen 80;
       listen [::]:80;
       server_name AIU.stepheng753.com;

       location / {
           return 301 https://$host$request_uri;
       }
   }

   # HTTPS Server Block
   server {
       listen 443 ssl;
       listen [::]:443 ssl;
       server_name AIU.stepheng753.com;

       # SSL Certificates
       ssl_certificate /etc/letsencrypt/live/AIU.stepheng753.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/AIU.stepheng753.com/privkey.pem;

       # SSL Settings
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
       ssl_prefer_server_ciphers on;

       client_max_body_size 10M;
       proxy_connect_timeout 300s;
       proxy_send_timeout 300s;
       proxy_read_timeout 300s;
       send_timeout 300s;

       # --- 1. FRONTEND: Serve Built Static Files ---
       location / {
           root /home/flash-server/Development/Interviewer/interviewer-web/dist;
           index index.html;
           try_files $uri $uri/ /index.html;

           add_header X-Frame-Options "SAMEORIGIN";
           add_header X-XSS-Protection "1; mode=block";
           add_header X-Content-Type-Options "nosniff";
       }

       # --- 2. BACKEND: REST API Reverse Proxy ---
       location /api {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # --- 3. BACKEND: WebSockets Proxy for Voice Chat ---
       location /ws {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           
           proxy_read_timeout 3600s;
           proxy_send_timeout 3600s;
       }
   }
   ```
3. **Symlink and Activate the Configuration**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/AIU.stepheng753.com /etc/nginx/sites-enabled/
   ```
4. **Verify and Reload Nginx State**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 4. Run the Backend BFF with PM2

Start the Express backend daemon so it listens continuously in the background on port `3000`:
```bash
cd /home/flash-server/Development/Interviewer/interviewer-backend
npm install

# Start process using PM2
PORT=3000 GEMINI_API_KEY="your-gemini-api-key" pm2 start src/index.js --name "interviewer-backend"

# Persist daemon startup state
pm2 save
```

---

## 5. Build the Frontend Web Build

Configure client environment variables and compile production assets:
```bash
cd /home/flash-server/Development/Interviewer/interviewer-web
npm install

# Create environment override variables
echo "VITE_API_URL=https://AIU.stepheng753.com/api" > .env.production
echo "VITE_WS_URL=wss://AIU.stepheng753.com/ws" >> .env.production

# Compile static assets
npm run build
```

---

## 6. Automate Deployment via GitHub Actions (Optional)

Once your initial deployment is working, you can automate updates on every push to the `main` branch. 

Add the following YAML definition to `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy to Flash-Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Connect to Tailscale
        uses: tailscale/github-action@v2
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:github-deployer

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_IP }}
          username: flash-server
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # Source profile to ensure NVM node and PM2 are in the PATH
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

            echo "🚀 Deploying Interviewer Project..."

            cd ~/Development/Interviewer
            git pull origin main

            # 1. Update Backend
            echo "--- Processing Backend ---"
            cd interviewer-backend
            npm install
            pm2 restart interviewer-backend || PORT=3000 GEMINI_API_KEY="${{ secrets.GEMINI_API_KEY }}" pm2 start src/index.js --name "interviewer-backend"
            pm2 save

            # 2. Compile Frontend
            echo "--- Processing Frontend ---"
            cd ../interviewer-web
            npm install
            echo "VITE_API_URL=https://AIU.stepheng753.com/api" > .env.production
            echo "VITE_WS_URL=wss://AIU.stepheng753.com/ws" >> .env.production
            npm run build

            # 3. Reload Nginx
            echo "--- Reloading Nginx ---"
            sudo nginx -t
            sudo systemctl reload nginx

            echo "✅ All Systems Deployed!"
```

*Note: Ensure `SERVER_IP`, `SSH_PRIVATE_KEY`, `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`, and `GEMINI_API_KEY` are saved in your GitHub Actions secrets.*
