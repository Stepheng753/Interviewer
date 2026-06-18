<div align="center">
  
# 🚀 Interview.ai
**Personal Knowledge & Voice Preservation AI**

[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](/)

*Interview.ai is a full-stack application designed to interview individuals, capturing their unique knowledge, stories, and expertise to train a personalized AI model.*

---

</div>

## 🌟 Core Identity

Our mission is to preserve human knowledge and personality. Whether it's a parent passing down their life lessons and wisdom to their children, or an expert archiving their technical knowledge, Interview.ai acts as the conversational bridge. 

By conducting high-speed, dynamic interviews via the Gemini Live API, we capture Question & Answer pairs tied directly to a specific user. Ultimately, this isolated data is used to train a custom AI model (and eventually a voice clone) that authentically imitates the interviewed individual.

### 💼 Operational Philosophy
- **Modern App Architecture:** We utilize **Node.js (Express)** for the backend and **React Native (Expo)** for the mobile frontend.
- **Data Persistence & Isolation:** We place a strong emphasis on data privacy. Every interview snippet is securely isolated using PostgreSQL user foreign keys, ensuring your personal AI model is trained strictly on your own knowledge.

---

## 🛠️ Technology Stack

<p align="center">
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Gemini_Live_API-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini Live API"/>
  <img src="https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E" alt="JavaScript"/>
</p>

### Key Focus Areas
1. **Knowledge Preservation:** Capturing life stories, advice, and expertise through an intuitive mobile interview interface.
2. **AI Identity Cloning:** Organizing isolated datasets (Q&A pairs) specifically structured to fine-tune future LLMs and TTS models.
3. **High-Speed Audio:** Utilizing WebSockets for bidirectional low-latency audio streaming with the AI interviewer.

---

## 🏗️ Repository Structure

| Directory | Description | Default Port |
| :--- | :--- | :--- |
| **`/interviewer-mobile`** | The React Native (Expo) frontend application. | `localhost:8081` |
| **`/interviewer-backend`** | The Express Node.js backend & BFF proxy. | `localhost:3000` |

---

## 🚀 Running the Development Environment (WSL to Phone)

When developing locally on WSL and testing on a physical phone, you need to route requests from your mobile device (on your local Wi-Fi or mobile network) to the backend running inside WSL's virtual network. 

The most reliable, permanent method to achieve this is via **Tailscale**, as it provides static IPs and avoids changing environment files.

---

### Method 1: Using Tailscale (Recommended & Persistent)

Tailscale provides static IPs that do not change between server restarts or network switches.

#### 1. Setup
* Make sure both your **computer** and **iPhone/Android phone** are connected to your Tailscale network.
* Find your development computer's Tailscale IP (e.g. `100.67.12.101`).

#### 2. Configure Env Files
* **Backend (`/interviewer-backend/.env`)**: Set `DATABASE_URL` to your database (e.g., your remote/local tailscale DB IP: `postgres://flash-server:7530@100.66.69.41:5432/interviewer_db`).
* **Mobile (`/interviewer-mobile/.env`)**: Use your computer's Tailscale IP:
  ```env
  EXPO_PUBLIC_API_URL="http://100.67.12.101:3000/api"
  EXPO_PUBLIC_WS_URL="ws://100.67.12.101:3000"
  ```

#### 3. WSL Port Forwarding (Run Once on Windows)
Since WSL runs behind a virtual switch, you must tell Windows to forward incoming Tailscale port 3000 (Backend) and port 8081 (Metro Bundler) requests to your WSL IP address. Run this command **once** in **Windows PowerShell (as Administrator)** (replace `YOUR_WSL_IP` with your actual WSL IP, e.g., from `ip addr`):
```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=YOUR_WSL_IP
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=YOUR_WSL_IP
```

#### 4. Run the Apps
* **Backend:** Start the node backend. It listens on `0.0.0.0` to receive external requests:
  ```bash
  cd interviewer-backend
  npm run dev
  ```
* **Frontend:** Start the Expo server using your Windows Tailscale IP to route the QR code connections properly:
  ```bash
  cd interviewer-mobile
  REACT_NATIVE_PACKAGER_HOSTNAME="YOUR_TAILSCALE_IP" npx expo start
  ```
  Scan the QR code in Expo Go to run the app.

---

### Method 2: Using Tunnels (Fallback, No Tailscale Required)

If you don't have Tailscale installed on your mobile device, you can tunnel your servers temporarily.

#### 1. Expose WSL Backend
Start the backend and run localtunnel in a new tab:
```bash
npx localtunnel --port 3000
```
This gives you a public URL (e.g., `https://xyz.loca.lt`). Update your `/interviewer-mobile/.env` with this new URL. Note that this URL changes every time the tunnel restarts.

#### 2. Run Expo with Tunnel
Start Expo using the tunnel flag:
```bash
cd interviewer-mobile
npx expo start --tunnel
```

---

## 🌍 Production Deployment Architecture

In a production environment, the brittle tunnel architecture is completely removed:

1. **Backend & Database:** 
   - The Express server is deployed on a dedicated Linux VPS alongside the PostgreSQL database (e.g., via PM2 or Docker).
   - A reverse proxy like Nginx handles SSL certificates and assigns a permanent, public domain name (e.g., `api.interview.ai`).
2. **Mobile Frontend:** 
   - Before compiling the mobile app for the App Store/Play Store, the `/interviewer-mobile/.env` file is permanently pointed to `https://api.interview.ai`.
   - The React Native bundle is compiled into native iOS/Android binaries, meaning it no longer needs the Expo development server or Metro bundler at all.

---

<div align="center">
  <i>Developed and engineered for Interview.ai</i>
</div> 
