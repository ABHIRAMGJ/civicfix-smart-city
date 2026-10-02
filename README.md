# CivicFix — AI-Powered Smart City Issue Management Platform
### Tadipatri Municipality · Anantapur District, Andhra Pradesh (PIN 515411)

**CivicFix** is an enterprise-grade civic technology web platform designed for municipal corporations, connecting citizens, municipal commissioners, department officers, and field repair crews into a unified, auditable workflow:

**Citizen Report → Multimodal AI Triage → Admin Gatekeeper Acceptance → Department-Wise Split → Field Crew Dispatch → Photographic Proof → Citizen Confirmation → Transparency Analytics**

---

## 🏛️ Key Features

1. **Role-Segregated Navigation & 3-Tier Authentication Portal**:
   - Public view displays strictly **Overview**, **Tadipatri Map**, **Report Issue**, and **Login** with a bilingual toggle (**తెలుగు / English**).
   - Division queues and the central command center are protected: **Department Console** and **Admin Split Desk** are strictly invisible to regular visitors and citizens until authenticated with their respective credentials.
   - Separate, dedicated login sections for:
     - `Section 01: Citizen Resident Portal` (Email/Password, Google OAuth, OTP verification).
     - `Section 02: Department Officer Login` (R&B Roads, APSPDCL Electrical, Water Supply, Sanitation, UGD Drainage, Traffic, Environment, Town Planning).
     - `Section 03: Municipal Commissioner Admin Command Center`.

2. **Citizen → Admin Acceptance → Department Split Workflow**:
   - **Zero Artificial Reports Policy**: No synthetic or phantom issues are seeded. All issues originate from genuine citizen reports.
   - Incoming reports arrive in the **Admin Acceptance Desk** in `Pending Admin Review` status.
   - The Municipal Commissioner inspects photo evidence, Ward 1–36 GPS pins, and AI triage recommendations.
   - Admin sets the **Primary Department**, optional **Joint Supporting Department**, **Priority**, **SLA Window (Hours)**, and **Repair Budget (₹ INR)**.
   - Clicking **Accept & Split to Department** publishes the issue live to the Tadipatri map and routes it to that specific division officer.

3. **Field Operations & Engineering Governance**:
   - Department Officers assign on-duty field supervisors and log materials/equipment used (e.g. *Cold-Mix Asphalt, Roller, LED Luminaire*).
   - Interactive **Before / After Resolution Photo Comparison Slider**.
   - **Scannable QR Code** on official Tadipatri Municipal Receipts (`CIV-TDP-2026-XXXX`).
   - Automated **SLA Escalation & Show-Cause Notice Generator** for overdue complaints.
   - Emergency **War-Room Mode** for monsoon and flood rapid response across all 36 wards.
   - Real-time **Field Crew GPS & Route Tracking** on Leaflet maps.

---

## 📦 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Leaflet Maps, Lucide Icons, Recharts.
- **Backend**: Express.js, Node.js, WebSocket server (`ws`) for real-time live dispatches.
- **Database**: PostgreSQL (Google Cloud SQL) managed with Drizzle ORM.
- **Authentication**: Firebase Authentication (Google Sign-In) + JWT session tokens + bcrypt password hashing.
- **AI Engine**: `@google/genai` (Gemini 3.8 Flash) multimodal vision and natural language triage.

---

## 🚀 Step-by-Step: Adding to GitHub

Follow these steps to upload your CivicFix project to a new GitHub repository:

### Step 1: Initialize Git in your project
Open your terminal in the project directory and run:
```bash
git init
```

### Step 2: Configure your Git User (if not already done)
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Step 3: Add files to staging
The `.gitignore` is already configured to exclude `node_modules/`, `.env`, and build artifacts:
```bash
git add .
```

### Step 4: Create your initial commit
```bash
git commit -m "feat: CivicFix Tadipatri Smart City Issue Management Platform"
```

### Step 5: Create a new repository on GitHub
1. Go to [GitHub.com](https://github.com) and log in.
2. Click the **+** icon in the top right corner and select **New repository**.
3. Name your repository (e.g. `civicfix-tadipatri`).
4. Keep it **Public** (or **Private** as desired).
5. **Do NOT** check "Add a README file", ".gitignore", or "Choose a license" (we already have them).
6. Click **Create repository**.

### Step 6: Link local repository and push to GitHub
Copy the commands from GitHub under "push an existing repository from the command line":
```bash
git branch -M main
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/civicfix-tadipatri.git
git push -u origin main
```

*(If prompted, log in with your GitHub credentials or Personal Access Token / SSH key).*

---

## 🌐 Step-by-Step: Deploying the Application

### Option A: Cloud Run / Google Cloud (Recommended for Full-Stack)
CivicFix includes an Express.js backend and a Vite frontend served together via `server.ts`.

1. **Build the production bundle**:
   ```bash
   npm run build
   ```

2. **Deploy using Google Cloud Run**:
   ```bash
   gcloud run deploy civicfix-tadipatri \
     --source . \
     --region asia-southeast1 \
     --allow-unauthenticated \
     --set-env-vars "NODE_ENV=production,PORT=3000"
   ```

3. **Set Environment Secrets**:
   In Cloud Run console or Secret Manager:
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.
   - `DATABASE_URL`: PostgreSQL connection string.

---

### Option B: Render.com (Easiest Full-Stack Node.js Deployment)
1. Sign in to [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`civicfix-tadipatri`).
4. Configure service settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `GEMINI_API_KEY`: *(Your key)*
   - `DATABASE_URL`: *(PostgreSQL connection URI)*
6. Click **Create Web Service**. Render will build and deploy a live HTTPS URL!

---

### Option C: Railway.app / Docker
A `Dockerfile` can be used directly:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Run locally or deploy to any container platform:
```bash
docker build -t civicfix-tadipatri .
docker run -p 3000:3000 -e GEMINI_API_KEY="your-key" civicfix-tadipatri
```

---

## 🛠️ Local Development

1. **Clone your repository**:
   ```bash
   git clone https://github.com/<YOUR-GITHUB-USERNAME>/civicfix-tadipatri.git
   cd civicfix-tadipatri
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up `.env`**:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📄 License
Licensed under the Apache License 2.0. Built for Tadipatri Municipality, Anantapur District, Andhra Pradesh.
