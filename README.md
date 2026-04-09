# Harshvardhan's Professional Portfolio

A production-grade, full-stack personal portfolio and admin dashboard emphasizing a modern, dark-themed, glassmorphism aesthetic.

## Architecture
- **Frontend**: Pure HTML, CSS (Glassmorphism & animations), JavaScript (Vanilla ES6)
- **Backend**: Python (FastAPI)
- **Database**: JSON-based (Scalable to PostgreSQL/MongoDB)

## Directory Structure
```
c:\Users\Harshvardhan\portfolio\
├── backend/
│   ├── data/
│   │   └── contacts.json       # Database for form submissions
│   ├── main.py                 # FastAPI Backend Code
│   └── requirements.txt        # Backend dependencies
└── frontend/
    ├── css/
    │   └── style.css           # Modern dark UI, tokens, and styling
    ├── img/
    │   └── profile.jpg         # Profile picture location (Upload yours here)
    ├── js/
    │   └── main.js             # Animation, API linking, and Logic
    ├── resume/
    │   └── Harshvardhan_Resume.pdf
    ├── index.html              # Main Portfolio Page (Home, About, Projects, Contact)
    └── admin.html              # Secure Admin Panel
```

## Setup & Running

### 1. Run the Backend API
The backend requires Python.
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
*API will run on `http://localhost:8000`*

### 2. View the Frontend
Since it's pure HTML/CSS/JS, you can open `frontend/index.html` directly in your browser.
However, for the Contact API integration to work best without CORS issues across `file://` protocols, use a simple live server:
```bash
cd frontend
python -m http.server 3000
```
*Navigate to `http://localhost:3000` in your browser.*

### 3. Admin Access
Go to `admin.html`. The default secure token is set via the `.env` variable `ADMIN_TOKEN`, but if not set, it defaults to:
**`supersecuretoken_123`**

## Profile Picture
To show your attached photo, save your profile picture as `frontend/img/profile.jpg`.

## Deployment Instructions (Vercel & Render)
1. Frontend: Deploy the `/frontend` directory statically using **Vercel** or **Netlify**.
2. Backend: Deploy the `/backend` directory as a web service using **Render** or **Heroku**.
3. Point the fetch requests in `main.js` to your deployed backend URL.
