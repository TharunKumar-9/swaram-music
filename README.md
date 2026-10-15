# 🎵 Swaram - Pan-India & Tollywood Music Player

A high-fidelity retro music player with Indian cinema music (Tollywood, Bollywood, Kollywood, Sandalwood, Mollywood, Punjabi), official YouTube integration, offline song downloads, responsive tablet/mobile UI, and private friend accounts with 4-digit PIN protection.

---

## 🚀 Deployment Options

### Option 1: Render.com (Recommended - Free & 24/7 Online)
Render provides free hosting for Node.js apps with automatic HTTPS.
1. Push this project to your GitHub repository:
   ```bash
   git add .
   git commit -m "Initial commit for deployment"
   git remote add origin https://github.com/YOUR_USERNAME/swaram-music.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [render.com](https://render.com) and log in with your GitHub account.
3. Click **New +** > **Web Service**.
4. Select your `swaram-music` repository.
5. Set:
   - **Environment**: `Node`
   - **Build Command**: *(leave empty)*
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. Click **Deploy Web Service**. You will get an instant public URL (e.g. `https://swaram-music.onrender.com`) to share with friends!

---

### Option 2: Railway.app (Instant 1-Click Cloud)
1. Go to [railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select this repo. Railway automatically detects `server.js` and deploys it with a public HTTPS domain.

---

### Option 3: Docker (Run Anywhere)
To run via Docker locally or deploy to any cloud server (AWS, GCP, DigitalOcean, VPS):
```bash
# Build the Docker image
docker build -t swaram-music .

# Run the container on port 3000
docker run -d -p 3000:3000 --name swaram swaram-music
```
Visit `http://localhost:3000`.

---

### Option 4: Instant Public URL for Testing (No Setup Required)
If you want to let your friends test the app right now from your computer without setting up any cloud hosting:
1. Start the server locally:
   ```bash
   node server.js
   ```
2. In a second terminal, run Localtunnel:
   ```bash
   npx localtunnel --port 3000
   ```
3. Share the generated public link with your friends!

---

## 🛠️ Local Development
```bash
# Start server
node server.js
# Or double-click run.bat on Windows
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
