# 📖 SCA Walkthrough: Project Guide & Simulation Manual

Welcome to the **Sustainable Campus Automation (SCA)** platform. This guide provides a comprehensive overview of how to navigate the system, simulate energy-saving events, and manage roles.

---

## 🔐 1. Authentication & Demo Users

The platform uses a role-based access control system. You can use the following demo credentials to explore different perspectives:

| Role | Email | Password | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sca.campus` | `admin123` | System audit, user management, and bulk verification. |
| **Student** | `pratham@sca.campus` | `user123` | View personal dashboard, transfer credits, and track rankings. |
| **Faculty** | `dr.rao@sca.campus` | `user123` | Monitor department efficiency and verify local classroom events. |

> **💡 Quick Tip**: On the Login page, click the **"Demo Login"** button at the bottom to automatically fill in the Admin credentials.

---

## 🧪 2. Simulation Modes: Sandbox vs. Real

SCA is designed to work in two distinct modes to facilitate both development and actual deployment.

### 🏜️ Sandbox (Mock Data)
- **What it is**: A purely frontend-driven simulation.
- **How to enable**: Toggle the **"Use Mock Data"** switch in the Dashboard header.
- **Why use it**: 
  - Test the UI without a running backend.
  - Explore the flow of uploading a video and seeing "detected" actions immediately.
  - Generating simulated detections for training purposes.

### 🏢 Real-Time (Production API)
- **What it is**: Integration with the Flask backend, YOLOv8 AI model, and SQLite database.
- **How to enable**: Toggle **"Use Mock Data"** to **OFF**. Ensure the connection status shows **"Live Data"**.
- **Process**:
  1. Upload a video file (MP4/MOV).
  2. Click **"Start AI Detection"**.
  3. The backend runs the YOLOv8 model to identify persons, devices, and actions.
  4. Real events are logged into the database and credits are prepared for auditing.

---

## 📊 3. Core Modules

### 🛠️ Dashboard (The Observation Deck)
- **Video Feed**: Upload CCTV clips to simulate real-time monitoring.
- **Inference Engine**: Watch as the AI detects "AC Off" and "Light Off" events.
- **Live Metrics**: Track your current session accuracy and total credits earned.

### 📜 Activity Log (The Ledger)
- View a historical record of all verified events.
- **Audit Reports**: Click on any event to see detailed metadata, including the room ID, confidence score, and energy impact.
- **Transparency**: Every credit minted is linked to a visual evidence block.

### 🏆 Leaderboard (The Impact Grid)
- See how departments and individuals stack up.
- **Search & Filter**: Find specific users or filter by department (e.g., "Computer Science").
- **Competitions**: Top earners contribute to UN SDGs and earn campus-wide recognition.

### 💳 Wallet (Asset Hub)
- **Credit Balance**: Real-time view of your EcoPoints (XP).
- **History**: Trace every reward back to the specific energy-saving action.
- **P2P Transfer**: Send credits to other students using their email IDs. This is useful for group projects or incentivizing clean habits among peers.

---

## 🛡️ 4. Administration Center

Accessed via the **Admin** link in the sidebar (Admin only).

1. **Audit Center**: View "Pending" events logged by the AI. You can manually **Verify** or **Reject** them.
2. **Bulk Approve**: Use the **High Confidence Approve** button to verify all events with >80% accuracy in one click.
3. **User Management**: 
   - Change user roles (e.g., promote a Student to Faculty).
   - Deactivate accounts if necessary.
4. **Network Health**: Monitor the database size and system-wide average accuracy.

---

## 🚀 5. Getting Started (Terminal Commands)

To run the full simulation locally:

```powershell
# 1. Start the Backend
cd backend
python app.py

# 2. Start the Frontend
npm install
npm run dev

# 3. Seed the Database (Optional)
python seed_database.py
```

*This walkthrough ensures all stakeholders can effectively use the SCA platform to reduce campus carbon footprints.*
