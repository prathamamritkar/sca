# SCA - Sustainable Campus Automation

**AI-Powered Campus Energy Monitoring with Frictionless Rewards**

An integrated full-stack application combining a React dashboard with a Python computer vision backend for detecting, verifying, and rewarding sustainable energy-saving actions on university campuses.

---

## 🚀 Quick Start (Technical Setup)

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+
- **pip** (Python package manager)

### 1. Frontend Setup
```bash
# Navigate to project root
cd sca

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend will be available at: **http://localhost:5173**

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```
Backend API will be available at: **http://localhost:5000**

---

## ⚡ Short Walkthrough (User Guide)

1.  **Login**: Use the **"Demo Login"** button on the Auth page to sign in as **System Administrator** (`admin@sca.campus`).
2.  **Dashboard**: Navigate to the Dashboard.
3.  **Select Mode**: Toggle **"Data Mode"** to OFF for **Production (Live API)** or ON for **Sandbox (Mock Data)**.
4.  **Simulate Event**: Upload a CCTV video clip (e.g., typically found in `backend/test_videos/`).
5.  **Analysis**: Click **"Start Neural Inference"**. The AI will detect actions (e.g., "Lights Off").
6.  **Results**: View the **Fidelity Index** and earned **Credits** in the "Session Impact" sidebar.

---

## 📖 Comprehensive Functionality Guide

### 🔐 Authentication & Roles
The platform employs a secure JWT-based Role-Based Access Control (RBAC) system.

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@sca.campus` | `admin123` | Full access: Audit Queue, User Management, Data Export. |
| **Student** | `student@sca.campus` | `user123` | Personal Dashboard, Wallet, P2P Transfers, Leaderboard. |
| **Faculty** | `faculty@sca.campus` | `user123` | Departmental Analytics, Class Verification, Leaderboard. |

### 🛠️ Dashboard (The Central Command)
- **Neural Link**: Upload video feeds to the YOLOv8 computer vision engine.
- **Live Stream Refinement**: Filter detection results by action type (e.g., "Lights Off", "AC Off").
- **Session Impact**: Real-time ticker showing **Credits Earned** and **Energy Saved (Watts)**.
- **Fidelity Index**: A confidence metric (0-100%) indicating the reliability of the AI's detection.

### 📜 Network Ledger (Events)
- **Audit Trails**: A searchable history of every detected sustainability signal.
- **Evidence Block**: Click any row to view the "Audit Report" containing the source video evidence and metadata.
- **Filter & Search**: standardized search bars allow finding specific "Pulse IDs" or locations.

### 🏆 Network Census (Leaderboard)
- **Rankings**: View top-performing "Nodes" (Users) based on verified credits.
- **Metrics**: "Fidelity" scores tracks how accurate a user's submissions are.
- **Profile Modes**: Switch between "Audit Queue" (Admin view) and "Node Operators" (User list).

### 💳 Wallet (Asset Management)
- **Blockchain Integration**: Connect **MetaMask** to sync with the Sepolia Testnet.
- **Bridge Credits**: Mint your internal database credits into on-chain `SCC` tokens.
- **Dispatch Assets**: Peer-to-peer credit transfer system. Admin can dispatch assets to students/faculty.
- **Identity Sync**: Verifies if your active Web3 wallet matches your registered account.

### 🛡️ Administration Center
Exclusive to System Administrators.
1.  **Audit Queue**: Review flagged low-fidelity events. Manually **Verify** or **Reject**.
2.  **User Management**: Reset passwords, deactivate users (`is_active` flags), or update roles.
3.  **Export Data**: Download CSV reports for "Full Events" or "User Census".
4.  **Bulk Actions**: "High Fidelity Approval" to instantly verify all safe events >80% fidelity.

---

## 🧪 Simulation Modes

### 🏜️ Sandbox (Mock Data)
- **Purpose**: UI testing and demoing without backend dependencies.
- **Behavior**: Generates randomized detection results and wallet transactions.
- **Visuals**: Identified by an "Amber/Orange" connection status.

### 🏢 Production (Mainnet)
- **Purpose**: Real-world deployment.
- **Behavior**: Connects to the local Python Flask API. Uses **YOLOv8** for inference and **SQLite** for persistence.
- **Visuals**: Identified by a "Green" connection status ("Live Data").

---

## 🏗️ Project Structure

```
sca/
├── src/                          # React Frontend
│   ├── components/               # Reusable UI (Cards, Badges, Charts)
│   ├── pages/                    # Core Route Views (Dashboard, Admin, etc.)
│   ├── services/                 # Axios API wrappers
│   └── store/                    # Zustand State Management (Auth)
├── backend/                      # Python Server
│   ├── app.py                    # API Entrypoint
│   ├── cv_processor.py           # Logic: YOLOv8 + OpenCV
│   ├── energy_analyzer.py        # Logic: Watts calculation
│   ├── database.py               # Database ORM (SQLite)
│   └── outputs/                  # Generated DBs and Face IDs
└── public/                       # Static Assets & Icons
```

---

## 📚 Tech Stack
- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui, Recharts.
- **Backend**: Python 3.10+, Flask, OpenCV, Ultralytics YOLOv8.
- **Database**: SQLite (dev) / PostgreSQL (prod ready).
- **Blockchain**: Web3.js / Ethers.js (Sepolia Testnet interaction).

---

## 📝 License
**© 2026 SCA - Sustainable Campus Automation**  
*AI-powered energy solutions for a greener future.*  
Supporting UN SDGs 11, 12 & 13.
