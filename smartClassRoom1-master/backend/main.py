from __future__ import annotations

import base64
import datetime
import hashlib
import hmac
import io
import json
import logging
import os
import random
import secrets
import threading
from typing import Any

import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from PIL import Image

try:
    import cv2

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    CV2_AVAILABLE = True
except Exception:
    CV2_AVAILABLE = False

try:
    from transformers import pipeline as hf_pipeline

    emotion_classifier = None
    HF_AVAILABLE = True
except Exception:
    HF_AVAILABLE = False
    emotion_classifier = None

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartClass AI Backend",
    version="3.1.0",
    description="Secure IoT Smart Classroom Engagement Analyzer API",
)

allowed_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
allow_all_origins = "*" in allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

TOKEN_SECRET = os.getenv("TOKEN_SECRET", "dev-smartclass-secret-change-me")
TOKEN_TTL_MINUTES = int(os.getenv("TOKEN_TTL_MINUTES", "120"))
REQUIRE_AUTH_FOR_ANALYTICS = os.getenv("REQUIRE_AUTH_FOR_ANALYTICS", "false").lower() == "true"
REQUIRE_AUTH_FOR_NLP = os.getenv("REQUIRE_AUTH_FOR_NLP", "false").lower() == "true"
ENFORCE_HTTPS = os.getenv("ENFORCE_HTTPS", "false").lower() == "true"
PRELOAD_EMOTION_MODEL = os.getenv("PRELOAD_EMOTION_MODEL", "false").lower() == "true"
ENABLE_EMOTION_INFERENCE = os.getenv("ENABLE_EMOTION_INFERENCE", "false").lower() == "true"

session_log: list[dict[str, Any]] = []
cloud_report_db: list[dict[str, Any]] = []
virtual_iot_packets: list[dict[str, Any]] = []
MAX_LOG = 500
MAX_PACKETS = 1000
security = HTTPBearer(auto_error=False)
users_db: dict[str, dict[str, str]] = {}
emotion_model_lock = threading.Lock()
emotion_model_loading = False


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    role: str = Field(default="teacher")


class LoginRequest(BaseModel):
    username: str
    password: str


class QueryRequest(BaseModel):
    question: str


class VirtualIoTPacket(BaseModel):
    device_id: str
    device_type: str = Field(description="camera or microphone")
    timestamp: str
    image_base64: str | None = None
    audio_level_db: float | None = None
    sample_text: str | None = None


def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, expected = password_hash.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
    return hmac.compare_digest(digest, expected)


def seed_default_users() -> None:
    if "admin" not in users_db:
        users_db["admin"] = {
            "password_hash": hash_password(os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")),
            "role": "admin",
        }
    if "teacher" not in users_db:
        users_db["teacher"] = {
            "password_hash": hash_password(os.getenv("DEFAULT_TEACHER_PASSWORD", "Teacher@123")),
            "role": "teacher",
        }


def create_token(username: str, role: str) -> str:
    exp = (datetime.datetime.utcnow() + datetime.timedelta(minutes=TOKEN_TTL_MINUTES)).isoformat()
    payload = {"sub": username, "role": role, "exp": exp}
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(TOKEN_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def decode_token(token: str) -> dict[str, Any]:
    try:
        encoded, signature = token.split(".", 1)
        expected_sig = hmac.new(TOKEN_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            raise ValueError("Invalid token signature")
        payload = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())
        if datetime.datetime.fromisoformat(payload["exp"]) < datetime.datetime.utcnow():
            raise ValueError("Token expired")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return decode_token(credentials.credentials)


def require_roles(*roles: str):
    def checker(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not allowed")
        return user

    return checker


def maybe_require_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any] | None:
    if not REQUIRE_AUTH_FOR_ANALYTICS:
        return None
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return decode_token(credentials.credentials)


def maybe_require_nlp_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict[str, Any] | None:
    if not REQUIRE_AUTH_FOR_NLP:
        return None
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = decode_token(credentials.credentials)
    if user.get("role") not in {"teacher", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role not allowed")
    return user


def get_emotion_classifier():
    global emotion_classifier
    global emotion_model_loading
    if emotion_classifier is None and HF_AVAILABLE:
        with emotion_model_lock:
            if emotion_classifier is not None:
                return emotion_classifier
            if emotion_model_loading:
                return None
            emotion_model_loading = True
        try:
            logger.info("Loading emotion model...")
            loaded_model = hf_pipeline("image-classification", model="trpakov/vit-face-expression", device=-1)
            with emotion_model_lock:
                emotion_classifier = loaded_model
            logger.info("Emotion model ready")
        except Exception as exc:
            logger.warning("Could not load emotion model: %s", exc)
        finally:
            with emotion_model_lock:
                emotion_model_loading = False
    return emotion_classifier


def detect_faces(img_array: np.ndarray) -> int:
    if not CV2_AVAILABLE:
        return random.randint(1, 5)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    return len(faces)


def estimate_noise() -> int:
    base = random.gauss(45, 12)
    spike = 25 if random.random() < 0.08 else 0
    return max(20, min(95, round(base + spike)))


def estimate_attention(num_faces: int, noise_level: float = 45) -> int:
    if num_faces == 0:
        return random.randint(25, 50)
    noise_penalty = max(0, int((noise_level - 65) * 0.6))
    score = random.randint(65, 95) - noise_penalty
    return max(20, min(100, score))


def analyze_speech_features(audio_level_db: float) -> dict[str, Any]:
    clarity = max(40, min(100, int(100 - abs(audio_level_db - 52))))
    speech_tempo = random.choice(["steady", "fast", "slow"])
    return {"clarity_score": clarity, "speech_tempo": speech_tempo}


def decode_frame(data: str) -> np.ndarray | None:
    try:
        if "," in data:
            data = data.split(",")[1]
        img_bytes = base64.b64decode(data)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return np.array(img)
    except Exception as exc:
        logger.error("Frame decode error: %s", exc)
        return None


def store_packet(packet: dict[str, Any]) -> None:
    if len(virtual_iot_packets) >= MAX_PACKETS:
        virtual_iot_packets.pop(0)
    virtual_iot_packets.append(packet)


def store_session(payload: dict[str, Any]) -> None:
    if len(session_log) >= MAX_LOG:
        session_log.pop(0)
    session_log.append(payload)
    cloud_report_db.append(
        {"stored_at": datetime.datetime.utcnow().isoformat(), "source": "engagement-stream", "record": payload}
    )


EMOTION_MAP = {
    "angry": "confused",
    "disgust": "bored",
    "fear": "confused",
    "happy": "happy",
    "sad": "bored",
    "surprise": "happy",
    "neutral": "neutral",
    "focused": "focused",
}


@app.get("/", tags=["Health"])
def root():
    return {"message": "SmartClass AI Backend v3.1 is running", "docs": "/docs", "status": "ok"}


@app.get("/api/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "cv2_available": CV2_AVAILABLE,
        "hf_available": HF_AVAILABLE,
        "session_datapoints": len(session_log),
        "virtual_iot_packets": len(virtual_iot_packets),
        "cloud_records": len(cloud_report_db),
        "security": {
            "https_required": ENFORCE_HTTPS,
            "rbac_enabled": True,
            "auth_required_for_analytics": REQUIRE_AUTH_FOR_ANALYTICS,
        },
    }


@app.get("/api/security/config", tags=["Security"])
def security_config():
    return {
        "communication": "HTTPS recommended for all production traffic",
        "enforce_https": ENFORCE_HTTPS,
        "rbac_roles": ["admin", "teacher"],
        "token_ttl_minutes": TOKEN_TTL_MINUTES,
    }


@app.post("/api/auth/register", tags=["Security"])
def register(payload: RegisterRequest):
    role = payload.role.lower()
    if role not in {"admin", "teacher"}:
        raise HTTPException(status_code=400, detail="Role must be either admin or teacher")
    if payload.username in users_db:
        raise HTTPException(status_code=409, detail="Username already exists")
    users_db[payload.username] = {"password_hash": hash_password(payload.password), "role": role}
    return {"message": "User registered", "username": payload.username, "role": role}


@app.post("/api/auth/login", tags=["Security"])
def login(payload: LoginRequest):
    user = users_db.get(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(payload.username, user["role"])
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@app.get("/api/auth/me", tags=["Security"])
def me(user: dict[str, Any] = Depends(get_current_user)):
    return {"username": user["sub"], "role": user["role"], "expires_at": user["exp"]}


@app.get("/api/metrics/historical", tags=["Analytics"])
def historical_metrics(_user: dict[str, Any] | None = Depends(maybe_require_user)):
    return {
        "labels": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "attention": [75, 82, 68, 90, 85],
        "engagement": [80, 85, 70, 92, 88],
        "noise": [42, 38, 58, 35, 40],
        "sessions": [4, 5, 4, 6, 5],
    }


@app.get("/api/metrics/today", tags=["Analytics"])
def today_metrics(_user: dict[str, Any] | None = Depends(maybe_require_user)):
    hours = ["8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"]
    return {
        "labels": hours,
        "attention": [random.randint(55, 95) for _ in hours],
        "engagement": [random.randint(50, 92) for _ in hours],
        "noise": [random.randint(30, 75) for _ in hours],
    }


@app.get("/api/students", tags=["Students"])
def get_students(_user: dict[str, Any] | None = Depends(maybe_require_user)):
    names = [
        "Arjun Kumar",
        "Priya Sharma",
        "Rahul Singh",
        "Sneha Patel",
        "Karan Mehta",
        "Divya Nair",
        "Vikram Reddy",
        "Anjali Verma",
        "Suresh Babu",
        "Meera Joshi",
    ]
    return [
        {
            "id": i + 1,
            "name": student_name,
            "attention": random.randint(30, 98),
            "engagement": random.randint(30, 98),
            "emotion": random.choice(["happy", "neutral", "focused", "confused", "bored"]),
            "seat": f"{chr(65 + i // 2)}{(i % 2) + 1}",
        }
        for i, student_name in enumerate(names)
    ]


@app.get("/api/session/log", tags=["Analytics"])
def get_session_log(limit: int = 100, _user: dict[str, Any] | None = Depends(maybe_require_user)):
    return {"data": session_log[-limit:], "total": len(session_log)}


@app.post("/api/iot/virtual-hardware/ingest", tags=["IoT"])
def ingest_virtual_iot(packet: VirtualIoTPacket, _teacher: dict[str, Any] = Depends(require_roles("teacher", "admin"))):
    packet_dict = packet.model_dump()
    packet_dict["received_at"] = datetime.datetime.utcnow().isoformat()
    store_packet(packet_dict)
    return {"message": "Virtual IoT packet accepted", "total_packets": len(virtual_iot_packets)}


@app.get("/api/iot/virtual-hardware/status", tags=["IoT"])
def virtual_hardware_status(_teacher: dict[str, Any] = Depends(require_roles("teacher", "admin"))):
    latest = virtual_iot_packets[-1] if virtual_iot_packets else None
    return {"connected_virtual_devices": len({p["device_id"] for p in virtual_iot_packets}), "latest_packet": latest}


@app.get("/api/cloud/reports", tags=["Cloud"])
def cloud_reports(limit: int = Query(default=50, ge=1, le=500), _admin: dict[str, Any] = Depends(require_roles("admin"))):
    return {"count": len(cloud_report_db), "records": cloud_report_db[-limit:]}


@app.post("/api/query", tags=["NLP"])
async def nlp_query(req: QueryRequest, _teacher: dict[str, Any] | None = Depends(maybe_require_nlp_user)):
    try:
        import google.generativeai as genai

        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key or api_key == "your_gemini_api_key_here":
            q = req.question.lower()
            if "attention" in q or "focus" in q:
                ans = "Current class-wide attention is **82%**. Peak attention was between 10:00 and 11:00 with **91%**."
            elif "noise" in q or "audio" in q:
                ans = "Noise is **45 dB**, acceptable for lecture mode. A short spike was observed at 10:15 during discussion."
            elif "emotion" in q or "mood" in q:
                ans = "Dominant emotion is **focused** (42%), then happy (28%), neutral (20%), and bored/confused (10%)."
            elif "summary" in q or "today" in q:
                ans = "Today: 22 students, average attention **82%**, three low-engagement alerts, and overall engagement marked **Good**."
            else:
                ans = "Ask about attention trend, dominant emotions, noise, or request a class summary report."
            return {"question": req.question, "answer": ans}

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        context = (
            "You are an assistant for Smart Classroom Engagement Analyzer. "
            "Use concise instructional language. "
            "Current context: avg attention 82%, noise 45 dB, dominant emotion focused, 22 students."
        )
        response = model.generate_content(f"{context}\nTeacher query: {req.question}")
        return {"question": req.question, "answer": response.text}
    except Exception as exc:
        logger.error("NLP error: %s", exc)
        return {"question": req.question, "answer": f"Could not reach AI service: {exc}"}


@app.get("/api/engagement/report", tags=["NLP"])
def engagement_report(
    query: str = Query(default="Give me today's engagement summary"),
    _teacher: dict[str, Any] | None = Depends(maybe_require_nlp_user),
):
    latest = session_log[-1] if session_log else {}
    return {
        "requested_query": query,
        "report": {
            "average_attention": 82,
            "dominant_emotion": latest.get("emotion", "focused"),
            "noise_level_db": latest.get("noise_level", 45),
            "recommendation": "Use interactive question prompts every 15 minutes to lift low-engagement clusters.",
        },
    }


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    classifier = emotion_classifier
    frame_count = 0
    try:
        while True:
            raw = await websocket.receive_text()
            img_array = decode_frame(raw)
            if img_array is None:
                await websocket.send_json({"error": "bad_frame"})
                continue
            frame_count += 1
            num_faces = detect_faces(img_array)
            noise = estimate_noise()
            emotion = "neutral"
            if ENABLE_EMOTION_INFERENCE and classifier is not None and frame_count % 5 == 0:
                try:
                    pil_img = Image.fromarray(img_array)
                    results = classifier(pil_img)
                    top = results[0]["label"].lower() if results else "neutral"
                    emotion = EMOTION_MAP.get(top, top)
                except Exception:
                    emotion = random.choice(["neutral", "focused", "happy", "confused"])
            else:
                emotion = random.choices(
                    ["neutral", "focused", "happy", "confused", "bored"], weights=[0.30, 0.35, 0.20, 0.10, 0.05]
                )[0]
            speech_features = analyze_speech_features(noise)
            attention = estimate_attention(num_faces, noise)
            payload = {
                "attention_level": attention,
                "emotion": emotion,
                "noise_level": noise,
                "speech_clarity": speech_features["clarity_score"],
                "speech_tempo": speech_features["speech_tempo"],
                "faces_detected": num_faces,
                "frame_count": frame_count,
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "source": "virtual-hardware-camera",
            }
            store_session(payload)
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
        try:
            await websocket.close()
        except Exception:
            pass


@app.on_event("startup")
def startup_notice():
    seed_default_users()
    if PRELOAD_EMOTION_MODEL and HF_AVAILABLE:
        threading.Thread(target=get_emotion_classifier, daemon=True).start()
    if ENFORCE_HTTPS:
        logger.info("HTTPS enforcement is enabled. Run uvicorn with TLS certificates in production.")
    else:
        logger.warning("HTTPS enforcement is disabled. Enable ENFORCE_HTTPS=true for production.")
