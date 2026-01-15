# SCA - Sustainable Campus Automation

**AI-Powered Campus Energy Monitoring with Blockchain-Verified Rewards**

An integrated full-stack application combining a React dashboard with a Python computer vision backend for detecting and rewarding sustainable energy-saving actions on university campuses.

---

## 🏗️ Project Structure

```
sca/
├── src/                          # React Frontend
│   ├── components/               # UI Components
│   ├── pages/                    # Page Components
│   │   ├── Dashboard.tsx         # AI Detection Dashboard (Mock + Real API)
│   │   ├── Leaderboard.tsx       # Sustainability Rankings
│   │   ├── Events.tsx            # Activity Log
│   │   ├── Wallet.tsx            # Blockchain Credits
│   │   └── Admin.tsx             # Administration
│   ├── services/                 # API Services
│   │   └── cvApi.ts              # CV Module API Client
│   └── hooks/                    # Custom React Hooks
├── backend/                      # Python CV Module
│   ├── app.py                    # Flask REST API (with CORS)
│   ├── cv_processor.py           # YOLO-based Computer Vision
│   ├── energy_analyzer.py        # Energy Calculations
│   ├── database.py               # SQLAlchemy Models
│   ├── incentive_tracker.py      # Blockchain Credit System
│   ├── requirements.txt          # Python Dependencies
│   ├── yolov8n.pt               # YOLO Model Weights
│   ├── uploads/                  # Video Uploads
│   └── outputs/                  # Detection Results
├── public/                       # Static Assets
├── package.json                  # Node Dependencies
├── .env                          # Environment Config
└── README.md                     # This File
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **pip** (Python package manager)

### 1. Frontend Setup

```bash
# Navigate to project
cd sca

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:5173**

### 2. Backend Setup

```bash
# Navigate to backend
cd sca/backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```

Backend API will be available at: **http://localhost:5000**

---

## 🎯 Features

### Frontend Dashboard

| Feature | Description |
|---------|-------------|
| **Video Upload** | Upload CCTV footage for AI analysis |
| **Mock/Real Toggle** | Switch between simulated and real AI detection |
| **Live Stats** | Real-time action counts, credits, and confidence metrics |
| **Leaderboard** | Student sustainability rankings |
| **Event Log** | Detailed activity history |
| **Blockchain Wallet** | Track earned credits (₹5/kWh) |
| **CSV Export** | Download detection results |

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /upload` | Upload video file |
| `POST /process` | Run AI detection |
| `GET /results/<file>` | Get detection results |
| `GET /db/events` | List all events |
| `GET /db/persons` | List all persons |
| `GET /db/leaderboard` | Get rankings |
| `GET /energy/report` | Energy analytics |
| `GET /energy/blockchain-credits` | Credits summary |
| `GET /energy/live-metrics` | Real-time metrics |

### Computer Vision (93.5% Accuracy)

- **Person Recognition** - Face detection + appearance matching (96%)
- **Device Detection** - ON/OFF state for laptops, monitors, ACs (97%)
- **Occupancy Detection** - YOLO + background subtraction (98%)
- **Action Classification** - Sustainable/unsustainable behaviors (96%)

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000
```

### API CORS Origins

The backend is configured to accept requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

To add more origins, edit `backend/app.py`:

```python
CORS(app, origins=[
    'http://localhost:5173',
    'http://your-production-domain.com',
])
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Workflow                                │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     Upload      ┌──────────────┐
    │   Browser    │ ───────────────► │   Frontend   │
    │   (User)     │                 │   (React)    │
    └──────────────┘                 └──────┬───────┘
                                            │
           ┌────────────────────────────────┤
           │                                │
           ▼ Mock Mode                      ▼ Real Mode
    ┌──────────────┐              ┌─────────────────┐
    │  Simulated   │              │  Flask Backend  │
    │    Data      │              │  (Port 5000)    │
    └──────────────┘              └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  CV Processor   │
                                  │  (YOLO + OpenCV)│
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  SQLite DB +    │
                                  │  Energy Analyzer│
                                  └─────────────────┘
```

---

## 🧪 Testing

### Test Mock Mode (No Backend Required)

1. Start frontend: `npm run dev`
2. Navigate to Dashboard
3. Ensure "Use Mock Data" is ON
4. Upload any video file and click "Start AI Detection"

### Test Real Mode (Backend Required)

1. Start backend: `cd backend && python app.py`
2. Start frontend: `npm run dev`
3. Dashboard should show "Backend: Connected"
4. Toggle OFF "Use Mock Data"
5. Upload video and process with real AI

### API Health Check

```bash
curl http://localhost:5000/status
```

Expected:
```json
{
  "status": "running",
  "timestamp": "2026-01-15T10:30:00",
  "uploads_count": 0,
  "outputs_count": 0
}
```

---

## 📈 Performance Metrics

| Metric | Value |
|--------|-------|
| **Accuracy** | 93.5% |
| **Precision** | 92.9% |
| **Recall** | 91.5% |
| **F1 Score** | 92.2% |
| **Latency** | <31ms/frame |
| **Video Support** | MP4, AVI, MOV, MKV, WebM |
| **Max Upload** | 500MB |

---

## 🏆 Recognition

- 🥇 **AISSMS Ideathon Winner**
- 🤖 **IEEE AI Idea-thon** Recognition
- 📄 **IJIRCCE Publication**
- 🎯 **i2i Finalist**

---

## 📚 Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (Build Tool)
- TailwindCSS + shadcn/ui
- React Query (Data Fetching)
- React Router (Navigation)

### Backend
- Python 3.8+
- Flask + Flask-CORS
- OpenCV + YOLOv8
- SQLAlchemy + SQLite
- NumPy

---

## 📝 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📞 Support

For issues and feature requests, please open a GitHub issue.

**© 2026 SCA - Sustainable Campus Automation**
*AI-powered energy solutions for a greener future*
*Supporting UN SDGs 11, 12 & 13*
