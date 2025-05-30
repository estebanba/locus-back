# Locus Backend Deployment Guide

This document provides a step-by-step guide for setting up a Virtual Private Server (VPS) and deploying the `locus-back` Node.js application. It also covers setting up a CI/CD pipeline using GitHub Actions.

## Table of Contents

- [Locus Backend Deployment Guide](#locus-backend-deployment-guide)
  - [Table of Contents](#table-of-contents)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Phase 1: Initial VPS Setup \& Manual Deployment](#2-phase-1-initial-vps-setup--manual-deployment)
    - [2.1. Connect to VPS \& Create Deploy User](#21-connect-to-vps--create-deploy-user)
    - [2.2. Install NVM, Node.js, and PM2](#22-install-nvm-nodejs-and-pm2)
    - [2.3. Install Nginx](#23-install-nginx)
    - [2.4. Configure Firewall](#24-configure-firewall)
    - [2.5. Create Project Directories](#25-create-project-directories)
    - [2.6. Initial Manual Code Deployment](#26-initial-manual-code-deployment)
    - [2.7. Create Shared `.env` File](#27-create-shared-env-file)
    - [2.8. Create `ecosystem.config.js` for PM2](#28-create-ecosystemconfigjs-for-pm2)
    - [2.9. Create `current` Symlink and Link `.env`](#29-create-current-symlink-and-link-env)
    - [2.10. Start Application with PM2](#210-start-application-with-pm2)
    - [2.11. Configure Nginx as a Reverse Proxy](#211-configure-nginx-as-a-reverse-proxy)
    - [2.12. Setup HTTPS with Certbot](#212-setup-https-with-certbot)
  - [3. Phase 2: CI/CD with GitHub Actions](#3-phase-2-cicd-with-github-actions)
    - [3.1. `app.ts` Modifications for Environment Loading](#31-appts-modifications-for-environment-loading)
    - [3.2. Cloudinary Configuration (`cloudinary.config.ts`)](#32-cloudinary-configuration-cloudinaryconfigts)
    - [3.3. Generate SSH Key for GitHub Actions](#33-generate-ssh-key-for-github-actions)
    - [3.4. Configure GitHub Secrets](#34-configure-github-secrets)
    - [3.5. Create GitHub Actions Workflow (`deploy.yml`)](#35-create-github-actions-workflow-deployyml)
  - [4. Troubleshooting Tips](#4-troubleshooting-tips)
  - [5. Local Development Notes](#5-local-development-notes)

## 1. Prerequisites

*   **VPS:** A server (e.g., Hetzner VPS) with root or sudo SSH access.
*   **Local Machine:** Node.js, npm, Git, and an SSH client installed.
*   **On VPS:**
    *   Sudo access for a non-root user (recommended: `deploy`).
    *   NVM (Node Version Manager).
    *   Node.js (e.g., v22.11.0 or your project's version).
    *   npm (comes with Node.js).
    *   PM2 (Process Manager for Node.js).
    *   Nginx.
*   **GitHub Repository:** For the `locus-back` project.
*   **Domain Name:** Pointing to your VPS's public IP address (e.g., `api.yourdomain.com`).
*   **Cloudinary Account:** If your application uses Cloudinary for image management.

## 2. Phase 1: Initial VPS Setup & Manual Deployment

This phase covers setting up the server environment and deploying the application manually for the first time.

### 2.1. Connect to VPS & Create Deploy User

1.  SSH into your VPS as root:
    ```bash
    ssh root@YOUR_VPS_IP
    ```
2.  Create a new user for deployment (e.g., `deploy`):
    ```bash
    adduser deploy
    ```
3.  Grant sudo privileges to the new user:
    ```bash
    usermod -aG sudo deploy
    ```
4.  Switch to the new user:
    ```bash
    su - deploy
    ```
    (Henceforth, commands are assumed to be run as this `deploy` user, unless `sudo` is specified).

### 2.2. Install NVM, Node.js, and PM2

1.  **Install NVM (Node Version Manager):**
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
    Follow the instructions to update your shell, or close and reopen your terminal session. Verify with `command -v nvm`.
2.  **Install Node.js:**
    (Replace `v22.11.0` with your desired Node.js version)
    ```bash
    nvm install v22.11.0
    nvm use v22.11.0
    nvm alias default v22.11.0
    ```
    Verify with `node -v` and `npm -v`.
3.  **Install PM2:**
    PM2 is a process manager that will keep your Node.js application running.
    ```bash
    npm install pm2 -g
    ```
    Verify with `pm2 -v`.

### 2.3. Install Nginx

Nginx will act as a reverse proxy for your application.
```bash
sudo apt update
sudo apt install nginx -y
```
Verify Nginx is running: `sudo systemctl status nginx`.

### 2.4. Configure Firewall

Allow HTTP, HTTPS, and SSH traffic.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full' # Allows both HTTP (80) and HTTPS (443)
sudo ufw enable
sudo ufw status
```

### 2.5. Create Project Directories

These directories will house your application code, releases, and shared files.
```bash
sudo mkdir -p /var/www/locus-backend/releases
sudo mkdir -p /var/www/locus-backend/shared
sudo mkdir -p /var/www/locus-backend/logs
sudo chown -R deploy:deploy /var/www/locus-backend # Give ownership to deploy user
```

### 2.6. Initial Manual Code Deployment

This step is for the very first deployment. Subsequent deployments will be handled by GitHub Actions.

1.  **On your local machine:**
    *   Navigate to your `locus-back` project directory.
    *   Ensure all dependencies are installed: `npm install`
    *   Build the application (compiles TypeScript to JavaScript in `dist/`):
        ```bash
        npm run build
        ```
2.  **Create a release package:**
    Bundle the necessary files. You'll need `dist/`, `package.json`, and `package-lock.json`.
    ```bash
    # On your local machine, in locus-back directory
    tar -czvf deploy_package.tar.gz dist package.json package-lock.json
    ```
3.  **Upload to VPS:**
    Use `scp` to upload the package to the `deploy` user's home directory on the VPS.
    ```bash
    # On your local machine
    scp deploy_package.tar.gz deploy@YOUR_VPS_IP:/home/deploy/
    ```
4.  **On the VPS (as `deploy` user):**
    *   Create the first release directory:
        ```bash
        RELEASE_NAME=$(date +%Y%m%d%H%M%S) # Example: initial-release
        mkdir -p /var/www/locus-backend/releases/$RELEASE_NAME
        ```
    *   Move the package and extract it:
        ```bash
        mv /home/deploy/deploy_package.tar.gz /var/www/locus-backend/releases/$RELEASE_NAME/
        cd /var/www/locus-backend/releases/$RELEASE_NAME
        tar -xzvf deploy_package.tar.gz
        ```
    *   Install production dependencies:
        ```bash
        # Ensure NVM is sourced for this session if it's a new one
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"
        nvm use # Uses the default Node version set earlier, e.g., v22.11.0

        npm install --production --omit=dev --ignore-scripts
        ```

### 2.7. Create Shared `.env` File

This file will store your environment variables. It's placed in the `shared` directory so it persists across releases.
```bash
nano /var/www/locus-backend/shared/.env
```
Add the following content, replacing placeholders with your actual values:
```ini
NODE_ENV=production
PORT=7001 # Or your desired application port
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_very_strong_jwt_secret

# Cloudinary Credentials
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL for CORS (if needed by your app.ts CORS config)
# FRONTEND_LOCAL_URL=https://www.yourfrontend.com
```
*   `NODE_ENV`: Set to `production` for deployed environments.
*   `PORT`: The port your Node.js application will listen on (e.g., 7001).
*   `MONGODB_URI`: Connection string for your MongoDB database.
*   `JWT_SECRET`: A secret key for signing JSON Web Tokens.
*   Cloudinary variables: Credentials for your Cloudinary account.

### 2.8. Create `ecosystem.config.js` for PM2

This file tells PM2 how to run your application. Create it in the main project directory on the VPS:
```bash
nano /var/www/locus-backend/ecosystem.config.js
```
Add the following content:
```javascript
module.exports = {
  apps: [{
    name: 'locus-back', // Your application's name in PM2
    script: 'current/dist/app.js', // Path to the main script, relative to cwd
    cwd: '/var/www/locus-backend', // Root directory for the app
    interpreter: `/home/deploy/.nvm/versions/node/v22.11.0/bin/node`, // Absolute path to NVM's Node interpreter
                                                                  // IMPORTANT: Update 'v22.11.0' if you use a different Node version.
                                                                  // You can find this path with: which node (after `nvm use`)
    env_production: { // Environment variables specifically for production
      NODE_ENV: 'production',
      // PORT will be picked up from the .env file symlinked into current/
    },
    // Optional: Configure log files if you want PM2 to manage them directly
    // error_file: '/var/www/locus-backend/logs/error.log',
    // out_file: '/var/www/locus-backend/logs/out.log',
    // merge_logs: true,
    // log_date_format: 'YYYY-MM-DD HH:mm Z',
  }]
};
```
**Explanation:**
*   `name`: A friendly name for your app in PM2.
*   `script`: Path to your application's entry point (`app.js` in the `dist` folder of the `current` release).
*   `cwd`: The current working directory for PM2, set to the root of your deployment structure.
*   `interpreter`: The absolute path to the Node.js executable managed by NVM. **Crucially, ensure this path is correct for your `deploy` user's NVM installation and selected Node version.**
*   `env_production`: PM2 can set environment variables, but we rely on the `.env` file for most, which is loaded by the application. `NODE_ENV` is good to have here too.

### 2.9. Create `current` Symlink and Link `.env`

The `current` symlink points to the active release.
1.  **Symlink the release:**
    (Replace `$RELEASE_NAME` with the actual directory name, e.g., `initial-release` or the timestamped one from step 2.6.4)
    ```bash
    ln -sfn /var/www/locus-backend/releases/$RELEASE_NAME /var/www/locus-backend/current
    ```
2.  **Symlink the shared `.env` file into the `current` release:**
    Your application (specifically `app.ts`) is configured to look for `.env` inside the `current` directory when in production.
    ```bash
    ln -sfn /var/www/locus-backend/shared/.env /var/www/locus-backend/current/.env
    ```

### 2.10. Start Application with PM2

1.  Navigate to where `ecosystem.config.js` is located:
    ```bash
    cd /var/www/locus-backend
    ```
2.  Start the application using PM2:
    ```bash
    # Ensure NVM is sourced if this is a new shell or if pm2 has issues finding node
    # export NVM_DIR="$HOME/.nvm"
    # [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
    # nvm use

    pm2 start ecosystem.config.js --env production
    ```
3.  Verify the application is running:
    ```bash
    pm2 list
    pm2 logs locus-back # To see console output and errors
    ```
4.  Save the PM2 process list to automatically restart on server reboot:
    ```bash
    pm2 save
    sudo env PATH=$PATH:/home/deploy/.nvm/versions/node/$(nvm current)/bin pm2 startup systemd -u deploy --hp /home/deploy
    ```
    (The `env PATH` part ensures the systemd service generated by PM2 can find Node via NVM. Adjust path if your Node version or NVM location differs).

    **Troubleshooting PM2:**
    *   **`sudo pm2: command not found`**: If you need to run PM2 with `sudo` (less common for user-specific setups), ensure the `pm2` path from NVM is in root's `PATH` or use the full path. Generally, run `pm2` as the `deploy` user.
    *   **`/usr/bin/env: 'node': No such file or directory`**: This means PM2 can't find Node. The `interpreter` path in `ecosystem.config.js` must be correct. If the PM2 daemon itself (which might run as root initially before dropping privileges) can't find node, a system-wide symlink might be a workaround, but the `interpreter` path is preferred:
        `# sudo ln -s /home/deploy/.nvm/versions/node/vXX.Y.Z/bin/node /usr/local/bin/node` (use with caution).

### 2.11. Configure Nginx as a Reverse Proxy

Nginx will listen for public HTTP/HTTPS requests and forward them to your Node.js application.
1.  Create an Nginx server block configuration file:
    ```bash
    sudo nano /etc/nginx/sites-available/api.yourdomain.com # Replace with your actual domain
    ```
2.  Add the following configuration, adjusting `server_name` and `proxy_pass` port if needed:
    ```nginx
    server {
        listen 80;
        server_name api.yourdomain.com; # Your domain

        location / {
            proxy_pass http://localhost:7001; # Port your app runs on (from .env and app.ts)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Optional: Access and error logs for this specific site
        access_log /var/log/nginx/api.yourdomain.com.access.log;
        error_log /var/log/nginx/api.yourdomain.com.error.log;
    }
    ```
3.  Enable the site by creating a symlink:
    ```bash
    sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
    ```
4.  Test Nginx configuration:
    ```bash
    sudo nginx -t
    ```
5.  If the test is successful, reload Nginx:
    ```bash
    sudo systemctl reload nginx
    ```
    Your application should now be accessible via `http://api.yourdomain.com`.

### 2.12. Setup HTTPS with Certbot

Secure your API with a free SSL certificate from Let's Encrypt.
1.  Install Certbot and the Nginx plugin:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```
2.  Obtain and install the SSL certificate:
    ```bash
    sudo certbot --nginx -d api.yourdomain.com # Replace with your domain
    ```
    Follow the on-screen prompts. Certbot will automatically update your Nginx configuration for HTTPS and set up auto-renewal.
3.  Verify Certbot auto-renewal timer:
    ```bash
    sudo systemctl status certbot.timer
    ```
    Your API should now be accessible via `https://api.yourdomain.com`.

## 3. Phase 2: CI/CD with GitHub Actions

This phase automates the deployment process whenever you push changes to your `main` branch.

### 3.1. `app.ts` Modifications for Environment Loading

Ensure your `locus-back/src/app.ts` loads the `.env` file correctly for both local development and production deployments. The key is to make the path to `.env` conditional based on `NODE_ENV`.

```typescript
// locus-back/src/app.ts
import dotenv from 'dotenv';
import path from 'path'; // Import path module

// Configure dotenv to load the .env file
// In production, load from the 'current' subdirectory (symlinked from shared/.env)
// In development (or other non-production), load from the project root
let dotEnvPath;
if (process.env.NODE_ENV === 'production') {
  dotEnvPath = path.resolve(process.cwd(), 'current', '.env');
} else {
  dotEnvPath = path.resolve(process.cwd(), '.env'); // For local development
}
dotenv.config({ path: dotEnvPath });

// THIS MUST BE THE VERY FIRST THING DONE, before any other imports
// that might initialize services like Cloudinary which depend on env vars.

// ---- START DEBUGGING (Optional, remove after verification) ----
// console.log(`[DEBUG] Dotenv attempting to load from: ${dotEnvPath}`);
// console.log(`[DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);
// console.log(`[DEBUG] PORT: ${process.env.PORT}`);
// console.log(`[DEBUG] CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME}`);
// ---- END DEBUGGING ----

import express, { Express, Request, Response } from 'express';
// ... rest of your app.ts
```
**Important:** This `dotenv.config()` call should be one of the very first executable lines in your `app.ts` to ensure environment variables are loaded before any other modules (like Cloudinary SDK configurations) try to access them.

### 3.2. Cloudinary Configuration (`cloudinary.config.ts`)

If you have a separate Cloudinary configuration file (e.g., `src/config/cloudinary.config.ts`), **do not** call `dotenv.config()` within it. The Cloudinary SDK will automatically pick up environment variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) once they are loaded by `app.ts`.

Example of a clean `cloudinary.config.ts`:
```typescript
// src/config/cloudinary.config.ts
import { v2 as cloudinary } from 'cloudinary';

// Environment variables are expected to be loaded by app.ts already.
// The SDK will pick them up automatically.
cloudinary.config({
  secure: true, // Ensures URLs are HTTPS
  // cloud_name, api_key, api_secret are read from process.env by the SDK
});

export default cloudinary;
```

### 3.3. Generate SSH Key for GitHub Actions

GitHub Actions will use SSH to connect to your VPS.
1.  On your local machine (or any machine, the key is not tied to the VPS initially):
    ```bash
    ssh-keygen -t ed25519 -C "github-actions-locus-back" -f ~/.ssh/github_actions_locus_back
    # Do not set a passphrase for this key, as Actions cannot interactively enter one.
    ```
    This creates `github_actions_locus_back` (private key) and `github_actions_locus_back.pub` (public key).
2.  Add the **public key** (`github_actions_locus_back.pub`) to your `deploy` user's `authorized_keys` on the VPS:
    ```bash
    # On your local machine, display the public key
    cat ~/.ssh/github_actions_locus_back.pub
    ```
    Copy the output.
    ```bash
    # On your VPS, as the 'deploy' user
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    nano ~/.ssh/authorized_keys
    # Paste the public key content into this file.
    chmod 600 ~/.ssh/authorized_keys
    ```

### 3.4. Configure GitHub Secrets

Store sensitive information as secrets in your GitHub repository settings. Go to your `locus-back` repository on GitHub > Settings > Secrets and variables > Actions > New repository secret.

*   `VPS_HOST`: Your VPS's public IP address.
*   `VPS_USER`: `deploy` (or your deployment username).
*   `VPS_SSH_PRIVATE_KEY`: The content of the **private key** file (`~/.ssh/github_actions_locus_back` that you generated). Copy the entire content, including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`.
*   `VPS_PROJECT_PATH`: `/var/www/locus-backend` (the root deployment directory on your VPS).
*   `PM2_APP_NAME`: `locus-back` (must match the `name` in your `ecosystem.config.js`).
*   `NVM_NODE_VERSION`: e.g., `v22.11.0` (the Node.js version used on the VPS by the `deploy` user).
*   `NVM_DIR`: `/home/deploy/.nvm` (the NVM installation directory for your `deploy` user).

*   **Application Environment Variables (to be written into `.env` on the server):**
    *   `VPS_PORT_NUMBER`: `7001` (or your application's port).
    *   `MONGODB_URI_SECRET`: Your MongoDB connection string.
    *   `JWT_SECRET_VALUE`: Your JWT secret.
    *   `CLOUDINARY_CLOUD_NAME_SECRET`: Your Cloudinary cloud name.
    *   `CLOUDINARY_API_KEY_SECRET`: Your Cloudinary API key.
    *   `CLOUDINARY_API_SECRET_VALUE`: Your Cloudinary API secret.
    *   `FRONTEND_LOCAL_URL_SECRET`: (Optional) e.g., `https://www.yourfrontend.com` if needed for CORS in production.

### 3.5. Create GitHub Actions Workflow (`deploy.yml`)

Create a file at `.github/workflows/deploy.yml` in your `locus-back` repository.

```yaml
name: Deploy Locus Backend to VPS

on:
  push:
    branches:
      - main # Or your primary deployment branch

jobs:
  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest

    env:
      VPS_HOST: ${{ secrets.VPS_HOST }}
      VPS_USER: ${{ secrets.VPS_USER }}
      VPS_SSH_PRIVATE_KEY: ${{ secrets.VPS_SSH_PRIVATE_KEY }}
      VPS_PROJECT_PATH: ${{ secrets.VPS_PROJECT_PATH }} # e.g., /var/www/locus-backend
      PM2_APP_NAME: ${{ secrets.PM2_APP_NAME }}       # e.g., locus-back
      NVM_NODE_VERSION: ${{ secrets.NVM_NODE_VERSION }} # e.g., v22.11.0
      NVM_DIR_PATH: ${{ secrets.NVM_DIR }} # e.g., /home/deploy/.nvm

      # Secrets for .env file
      PORT_SECRET: ${{ secrets.VPS_PORT_NUMBER }}
      MONGODB_URI_SECRET: ${{ secrets.MONGODB_URI_SECRET }}
      JWT_SECRET_VALUE_SECRET: ${{ secrets.JWT_SECRET_VALUE }}
      CLOUDINARY_CLOUD_NAME_SECRET: ${{ secrets.CLOUDINARY_CLOUD_NAME_SECRET }}
      CLOUDINARY_API_KEY_SECRET: ${{ secrets.CLOUDINARY_API_KEY_SECRET }}
      CLOUDINARY_API_SECRET_VALUE_SECRET: ${{ secrets.CLOUDINARY_API_SECRET_VALUE }}
      FRONTEND_URL_SECRET: ${{ secrets.FRONTEND_LOCAL_URL_SECRET }} # Optional

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NVM_NODE_VERSION }} # Use the same Node version for build as on server

      - name: Install dependencies
        run: npm ci # Cleaner and faster than npm install for CI

      - name: Build application
        run: npm run build # Assumes your build script is 'build' in package.json

      - name: Prepare deployment package
        run: tar -czvf deploy_package.tar.gz dist package.json package-lock.json

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ env.VPS_HOST }}
          username: ${{ env.VPS_USER }}
          key: ${{ env.VPS_SSH_PRIVATE_KEY }}
          script: |
            set -e # Exit immediately if a command exits with a non-zero status.

            # Define variables for paths and names
            PROJECT_PATH="${{ env.VPS_PROJECT_PATH }}"
            RELEASES_DIR="$PROJECT_PATH/releases"
            SHARED_DIR="$PROJECT_PATH/shared"
            CURRENT_SYMLINK="$PROJECT_PATH/current"
            RELEASE_TIMESTAMP=$(date +%Y%m%d%H%M%S)
            NEW_RELEASE_DIR="$RELEASES_DIR/$RELEASE_TIMESTAMP"
            PACKAGE_NAME="deploy_package.tar.gz" # Must match the name in "Prepare deployment package" step

            echo "Starting deployment..."
            echo "Creating new release directory: $NEW_RELEASE_DIR"
            mkdir -p "$NEW_RELEASE_DIR"

            echo "Uploading $PACKAGE_NAME to $PROJECT_PATH/$PACKAGE_NAME"
            # The package is uploaded by ssh-action to $HOME by default, move it.
            # Alternatively, configure ssh-action to upload to a specific path if possible,
            # or SCP it in a separate step. For simplicity, assuming it's in $HOME or current dir.
            # If appleboy/ssh-action uploads to $HOME of VPS_USER:
            mv "$HOME/$PACKAGE_NAME" "$PROJECT_PATH/$PACKAGE_NAME"

            echo "Moving package to $NEW_RELEASE_DIR"
            mv "$PROJECT_PATH/$PACKAGE_NAME" "$NEW_RELEASE_DIR/"

            echo "Extracting package in $NEW_RELEASE_DIR"
            cd "$NEW_RELEASE_DIR"
            tar -xzvf "$PACKAGE_NAME"

            echo "Sourcing NVM and installing production dependencies..."
            # Source NVM explicitly for the script's environment
            export NVM_DIR="${{ env.NVM_DIR_PATH }}"
            [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
            [ -s "$NVM_DIR/bash_completion" ] && \\. "$NVM_DIR/bash_completion"
            
            echo "Using Node version: ${{ env.NVM_NODE_VERSION }}"
            nvm use "${{ env.NVM_NODE_VERSION }}"
            
            echo "Current Node version: $(node -v)"
            echo "Current npm version: $(npm -v)"

            npm install --production --omit=dev --ignore-scripts

            echo "Creating .env file in $SHARED_DIR/.env"
            # Use tee with a heredoc to create/overwrite the .env file atomically
            # This ensures a clean .env file on every deployment
            # Ensure your GitHub Secrets are not empty!
            cat << EOF | sudo tee "$SHARED_DIR/.env" > /dev/null
            NODE_ENV=production
            PORT=${{ env.PORT_SECRET }}
            MONGODB_URI='${{ env.MONGODB_URI_SECRET }}'
            JWT_SECRET='${{ env.JWT_SECRET_VALUE_SECRET }}'
            CLOUDINARY_CLOUD_NAME='${{ env.CLOUDINARY_CLOUD_NAME_SECRET }}'
            CLOUDINARY_API_KEY='${{ env.CLOUDINARY_API_KEY_SECRET }}'
            CLOUDINARY_API_SECRET='${{ env.CLOUDINARY_API_SECRET_VALUE_SECRET }}'
            FRONTEND_LOCAL_URL='${{ env.FRONTEND_URL_SECRET }}'
            EOF
            # Set permissions for the .env file if needed, though deploy user should own shared_dir items.
            # sudo chown ${{ env.VPS_USER }}:${{ env.VPS_USER }} "$SHARED_DIR/.env"
            # sudo chmod 600 "$SHARED_DIR/.env" # Restrict permissions

            echo "Symlinking shared .env to $NEW_RELEASE_DIR/.env"
            ln -sfn "$SHARED_DIR/.env" "$NEW_RELEASE_DIR/.env"

            echo "Updating 'current' symlink to point to new release: $NEW_RELEASE_DIR"
            ln -sfn "$NEW_RELEASE_DIR" "$CURRENT_SYMLINK"
            
            # It's also good practice to ensure current/.env exists for PM2, especially if it might read it
            # before ecosystem.config.js's env block or --update-env takes full effect.
            echo "Symlinking shared .env to $CURRENT_SYMLINK/.env"
            ln -sfn "$SHARED_DIR/.env" "$CURRENT_SYMLINK/.env"


            echo "Reloading application with PM2..."
            # Ensure PM2 can find node and npm from NVM
            # The PM2 daemon should already be configured with the correct interpreter path
            # but explicitly sourcing NVM before PM2 commands is a robust practice.
            export NVM_DIR="${{ env.NVM_DIR_PATH }}"
            [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
            nvm use "${{ env.NVM_NODE_VERSION }}"
            
            # Use the full path to PM2 from NVM to be absolutely sure
            NVM_PM2_PATH=$(dirname $(which node))/pm2 # Gets the pm2 path within current NVM bin
            
            # Reload using the ecosystem file and update environment variables
            # The ecosystem file should be at $PROJECT_PATH/ecosystem.config.js
            $NVM_PM2_PATH reload "$PROJECT_PATH/ecosystem.config.js" --update-env
            # If reload is problematic, consider:
            # $NVM_PM2_PATH restart ${{ env.PM2_APP_NAME }} --update-env
            # Or even:
            # $NVM_PM2_PATH delete ${{ env.PM2_APP_NAME }} || true # Ignore error if not found
            # $NVM_PM2_PATH start "$PROJECT_PATH/ecosystem.config.js" --env production

            echo "Cleaning up old releases (keeping last 3)..."
            # Count current releases, then remove older ones.
            # Ensure this command is safe and doesn't delete current or too many.
            cd "$RELEASES_DIR" && ls -1t | tail -n +4 | xargs -I {} sudo rm -rf "$RELEASES_DIR"/{}

            echo "Deployment finished successfully!"
```
**Explanation of `deploy.yml`:**
*   **`on: push: branches: [main]`**: Triggers the workflow on pushes to the `main` branch.
*   **`jobs: deploy: runs-on: ubuntu-latest`**: Defines a job named `deploy` that runs on a GitHub-hosted Ubuntu runner.
*   **`env:`**: Sets up environment variables for the job, mostly from GitHub Secrets.
*   **`steps:`**:
    *   **Checkout code**: Gets your repository code.
    *   **Set up Node.js**: Configures Node.js on the runner for building.
    *   **Install dependencies**: `npm ci` for clean, reproducible installs.
    *   **Build application**: Runs `npm run build` (compiles TypeScript).
    *   **Prepare deployment package**: Creates `deploy_package.tar.gz` with `dist/`, `package.json`, `package-lock.json`.
    *   **Deploy to VPS via SSH (`appleboy/ssh-action`)**:
        *   Connects to your VPS using the provided SSH credentials.
        *   The `script:` section runs commands on your VPS:
            *   Creates a timestamped release directory.
            *   Moves the uploaded tarball (assumed to be in `$HOME` by `ssh-action`, then moved to project path, then to release dir).
            *   Extracts the package.
            *   **Crucially sources NVM** to ensure the correct Node.js and npm versions are used for `npm install`.
            *   Installs production dependencies within the new release directory.
            *   **Atomically creates/overwrites `/var/www/locus-backend/shared/.env`** using `tee` and a heredoc, populated with secrets from GitHub. This ensures the `.env` file is always correct and clean.
            *   Symlinks `shared/.env` to `NEW_RELEASE_DIR/.env`.
            *   Updates the `current` symlink to point to the new release.
            *   Symlinks `shared/.env` to `current/.env` as well (belt-and-suspenders for PM2).
            *   **Reloads PM2** using `pm2 reload ecosystem.config.js --update-env`. This reloads the app with the new code and environment variables. The script uses the full NVM path to `pm2`.
            *   Cleans up old releases, keeping the last 3.

## 4. Troubleshooting Tips

*   **CORS Errors (`Not allowed by CORS`)**:
    *   Verify `allowedOrigins` in `locus-back/src/app.ts` includes your frontend's URL.
    *   Check if `FRONTEND_LOCAL_URL` (or similar) is correctly set in `.env` on the server if your CORS config depends on it.
    *   Ensure Nginx is not stripping necessary CORS headers (usually not an issue with default proxy configs).
*   **Cloudinary "Not fully set" / "Must supply cloud_name"**:
    *   This usually means Cloudinary environment variables are not loaded when the SDK initializes.
    *   **Ensure `dotenv.config()` is the *absolute first executable line* in `locus-back/src/app.ts`** (after imports like `path` and `dotenv` itself).
    *   Verify Cloudinary secrets (`CLOUDINARY_CLOUD_NAME_SECRET`, etc.) are correctly set in GitHub Actions secrets and are being written to `/var/www/locus-backend/shared/.env` on the server by the deployment script.
    *   Check that no other file (e.g., `cloudinary.config.ts`) is calling `dotenv.config()` before `app.ts` does.
*   **PM2 "Process not found" or startup issues**:
    *   Verify NVM is correctly sourced before PM2 commands in deployment scripts (`export NVM_DIR=...; . $NVM_DIR/nvm.sh; nvm use ...`).
    *   Double-check the `interpreter` path in `ecosystem.config.js` points to the correct NVM Node executable for the `deploy` user.
    *   Check PM2 logs: `pm2 logs locus-back` (or your app name).
    *   If `pm2 reload` is problematic, try `pm2 restart <app_name> --update-env` or a full delete and start: `pm2 delete <app_name> && pm2 start ecosystem.config.js --env production`.
    *   Ensure the `cwd` in `ecosystem.config.js` is correct (`/var/www/locus-backend`).
*   **GitHub Actions Failures**:
    *   Carefully examine the logs for the failing step in the GitHub Actions run.
    *   Ensure SSH keys (public key on server, private key in secrets) and other GitHub secrets are correctly configured and not empty.
    *   Verify file paths in the deployment script.
*   **Nginx 502 Bad Gateway**:
    *   Your application (`locus-back`) is not running or not responding on the port Nginx is proxying to.
    *   Check PM2: `pm2 list` to see if the app is `online`. `pm2 logs locus-back` for errors.
    *   Verify `proxy_pass http://localhost:XXXX;` in your Nginx config matches the `PORT` your application is actually listening on (check server's `.env` and `app.ts` logic).
*   **Environment Variables Not Loaded**:
    *   Ensure the `dotenv.config({ path: dotEnvPath })` in `app.ts` points to the correct `.env` file for the environment (production vs. local).
    *   For production, verify `/var/www/locus-backend/shared/.env` exists, is correctly populated by the GitHub Actions script, and is symlinked to `/var/www/locus-backend/current/.env`.

## 5. Local Development Notes

*   **`.env` File**: Have a `.env` file in the root of your `locus-back` project.
    ```ini
    # .env (in locus-back project root for local development)
    NODE_ENV=development
    PORT=7001 # Or your preferred local port
    MONGODB_URI=your_local_or_dev_mongodb_uri
    JWT_SECRET=your_local_jwt_secret
    # Local Cloudinary vars if testing Cloudinary features
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    FRONTEND_LOCAL_URL=http://localhost:5173 # Or your local frontend port
    ```
*   **Running Locally**: Start your backend using the script in `package.json` (e.g., `npm run dev` or `npm start`).
*   The modified `app.ts` (from section 3.1) will automatically pick up `.env` from the project root when `NODE_ENV` is not `production`.
*   If your frontend tries to connect to `http://localhost:7001`, ensure your local `locus-back` is indeed running on port `7001` (as set in your local `.env` file).

This guide should provide a solid foundation for deploying and managing your `locus-back` application. Remember to adapt paths, versions, and secrets to your specific setup. 