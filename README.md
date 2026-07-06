# VergeX — Employee Performance Analytics Platform

## Setup Instructions

### Step 1 — Install dependencies
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors pandas openpyxl
```

### Step 2 — Run the Flask backend
```
cd backend
source venv/bin/activate
python3 app.py
```
Flask runs on: http://127.0.0.1:5000

### Step 3 — Open the frontend
Open `frontend/login.html` using Live Server in VS Code.
URL: http://127.0.0.1:5500/frontend/login.html

## Login Credentials

| Role     | Username   | Password  |
|----------|------------|-----------|
| Admin    | admin      | admin123  |
| Employee | E001–E020  | emp123    |

## Features
- Role-based login (Admin & Employee)
- Admin dashboard with charts and analytics
- Employee personal performance portal
- AI-powered insights and recommendations
- Employee table with search and filter
- CSV and summary report downloads
- Department-wise analytics
