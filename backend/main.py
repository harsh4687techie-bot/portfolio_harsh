import json
import logging
import os
import shutil
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Header, Depends, File, UploadFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("portfolio")
# Add file handler for persistent logging
fh = logging.FileHandler(os.path.join(BASE_DIR, "app.log"))
fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
logger.addHandler(fh)


# ── Path constants (always absolute, regardless of CWD) ────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))          # .../backend
ROOT_DIR     = os.path.abspath(os.path.join(BASE_DIR, ".."))       # .../portfolio
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")                  # .../frontend
DATA_FILE    = os.path.join(BASE_DIR, "data", "contacts.json")     # .../backend/data/contacts.json

logger.info(f"BASE_DIR:     {BASE_DIR}")
logger.info(f"FRONTEND_DIR: {FRONTEND_DIR}")
logger.info(f"DATA_FILE:    {DATA_FILE}")

# ── App ────────────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Portfolio API", docs_url="/api/docs", redoc_url="/api/redoc")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Security Headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self' https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; img-src 'self' data: https:; font-src 'self' https: data:;"
    return response

# ── Email Helpers ──────────────────────────────────────────────────────────────
def send_email_notification(name: str, email: str, message: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    admin_email = os.getenv("ADMIN_EMAIL")

    if not all([smtp_host, smtp_port, smtp_user, smtp_pass, admin_email]):
        logger.warning("SMTP settings incomplete. Skipping email notification.")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = admin_email
        msg['Subject'] = f"New Portfolio Message from {name}"

        body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_host, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email notification sent to {admin_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

# ── Admin token ────────────────────────────────────────────────────────────────
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "supersecuretoken_123")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global error handler ───────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ── Admin token ────────────────────────────────────────────────────────────────
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "supersecuretoken_123")

def verify_admin(authorization: Optional[str] = Header(None)):
    if authorization != f"Bearer {ADMIN_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# ── Models ─────────────────────────────────────────────────────────────────────
class ContactIn(BaseModel):
    name: str
    email: EmailStr
    message: str

class ContactOut(ContactIn):
    id: int
    timestamp: str

# ── Data helpers ───────────────────────────────────────────────────────────────
def load_contacts() -> List[dict]:
    try:
        if not os.path.exists(DATA_FILE):
            os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
            with open(DATA_FILE, "w") as f:
                json.dump([], f)
            return []
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.error(f"Failed to load contacts: {e}")
        return []

def save_contacts(contacts: List[dict]):
    try:
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, "w") as f:
            json.dump(contacts, f, indent=4)
    except OSError as e:
        logger.error(f"Failed to save contacts: {e}")
        raise HTTPException(status_code=500, detail="Could not save message")

# ── API Routes (must be defined BEFORE StaticFiles mount) ──────────────────────
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), target_name: str = Form(...)):
    try:
        if target_name == "profile.jpg":
            save_path = os.path.join(FRONTEND_DIR, "images", "profile.jpg")
        else:
            save_path = os.path.join(FRONTEND_DIR, "images", "certificates", target_name)

        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Uploaded file saved to: {save_path}")
        return {"message": f"Successfully updated {target_name}!"}
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/contact", status_code=201)
@limiter.limit("5/minute")
async def submit_contact(request: Request, contact: ContactIn):
    # Basic sanitization
    name = contact.name.strip()[:100]
    email = contact.email.strip()
    message = contact.message.strip()[:2000]

    contacts = load_contacts()
    new_contact = {
        "id": len(contacts) + 1,
        "name": name,
        "email": email,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
    }
    contacts.append(new_contact)
    save_contacts(contacts)
    
    logger.info(f"New contact from: {email}")
    
    # Send email in background (synchronous implementation for now, or use BackgroundTasks)
    # We use a simple call here for reliability in small scale
    send_email_notification(name, email, message)
    
    return {"message": "Message received successfully!"}

@app.get("/api/certificates")
def list_certificates():
    cert_dir = os.path.join(FRONTEND_DIR, "images", "certificates")
    if not os.path.exists(cert_dir):
        return []
    
    files = [f for f in os.listdir(cert_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    return sorted(files)

@app.get("/api/admin/messages")
def get_messages(authorized: bool = Depends(verify_admin)):
    return load_contacts()

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# ── Serve frontend static files ────────────────────────────────────────────────
# StaticFiles with html=True auto-serves index.html for "/" and 404s
# This MUST come after all API routes
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    logger.info(f"Serving frontend from: {FRONTEND_DIR}")
else:
    logger.warning(f"Frontend directory not found: {FRONTEND_DIR}")

# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    # Use the app object (not a string) so reload works from any CWD.
    # For hot-reload to work properly, always run via:
    #   python -m uvicorn main:app --reload  (from the backend/ directory)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[BASE_DIR],   # ← only watch backend/, not the whole project
        app_dir=BASE_DIR,         # ← tells uvicorn where to find "main" module
    )
