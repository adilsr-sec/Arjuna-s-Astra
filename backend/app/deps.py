from datetime import datetime, timezone
from pathlib import Path
import json

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .models import MissionLog
from .security import decode_token, hash_password, verify_password
from .database import get_db
from .db_models import User, TelemetryLog, Message

security = HTTPBearer()

def authenticate(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    if user.locked:
        raise HTTPException(status_code=403, detail="TERMINAL LOCKED: Burn protocol initiated")
    return {"username": user.username, "role": user.role, "department": user.department}

def current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = decode_token(credentials.credentials)
        username = payload["sub"]
        user = db.query(User).filter(User.username == username.lower()).first()
        if user and user.locked:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="TERMINAL LOCKED: Burn protocol initiated")
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return {"username": user.username, "role": user.role, "department": user.department}
    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from ex

def ensure_storage():
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.output_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.log_file).parent.mkdir(parents=True, exist_ok=True)
    if not Path(settings.log_file).exists():
        Path(settings.log_file).write_text("", encoding="utf-8")

def write_log(db: Session, event: str, actor: str, status_: str, details: str):
    # Log to file for redundancy (existing behavior)
    record = MissionLog(
        event=event,
        actor=actor,
        status=status_,
        details=details,
        ts=datetime.now(timezone.utc).isoformat(),
    )
    with open(settings.log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record.model_dump()) + "\n")
    
    # Log to DB
    user = db.query(User).filter(User.username == actor.lower()).first()
    db_log = TelemetryLog(
        user_id=user.id if user else None,
        event_type=event,
        actor=actor,
        status=status_,
        details=details,
        timestamp=record.ts
    )
    db.add(db_log)
    db.commit()

def add_soldier(db: Session, username: str, password: str, department: str):
    if not username.strip():
        raise ValueError("Username cannot be empty")
    key = username.lower()
    existing = db.query(User).filter(User.username == key).first()
    if existing:
        raise ValueError("User already exists")
    new_user = User(
        username=key,
        hashed_password=hash_password(password),
        role="Soldier",
        department=department,
        locked=False
    )
    db.add(new_user)
    db.commit()

def add_department(db: Session, username: str, password: str, department_name: str):
    if not username.strip():
        raise ValueError("Username cannot be empty")
    key = username.lower()
    existing = db.query(User).filter(User.username == key).first()
    if existing:
        raise ValueError("User already exists")
    new_user = User(
        username=key,
        hashed_password=hash_password(password),
        role="Department",
        department=department_name,
        locked=False
    )
    db.add(new_user)
    db.commit()

def edit_user(db: Session, username: str, department: str | None, locked: bool | None, password: str | None = None):
    key = username.lower()
    user = db.query(User).filter(User.username == key).first()
    if not user:
        raise ValueError("User not found")
    if user.role == "Admin":
        raise ValueError("Cannot edit Admin user")
    
    if department is not None:
        user.department = department
    if locked is not None:
        user.locked = locked
    if password is not None and password.strip() != "":
        user.hashed_password = hash_password(password)
    db.commit()

def delete_user(db: Session, username: str):
    key = username.lower()
    user = db.query(User).filter(User.username == key).first()
    if not user:
        raise ValueError("User not found")
    if user.role == "Admin":
        raise ValueError("Cannot delete Admin user")
    
    # Delete associated messages
    db.query(Message).filter((Message.sender_id == user.id) | (Message.recipient_id == user.id)).delete(synchronize_session=False)
    # Delete telemetry logs
    db.query(TelemetryLog).filter(TelemetryLog.user_id == user.id).delete(synchronize_session=False)
    
    db.delete(user)
    db.commit()
