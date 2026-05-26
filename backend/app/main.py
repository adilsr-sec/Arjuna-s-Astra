import base64
import os
import uuid
from pathlib import Path

import cv2
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .arss import arss_to_audio, audio_to_arss
from .config import settings
from .database import engine, get_db, Base
from .db_models import User, Message as DBMessage, TelemetryLog
from .deps import add_soldier, authenticate, current_user, ensure_storage, write_log, add_department, edit_user, delete_user
from .models import AddSoldierRequest, MessageRequest, Role, TokenResponse, UserLogin, AddDepartmentRequest, EditUserRequest
from .security import (
    aes_decrypt,
    aes_encrypt,
    create_access_token,
    generate_rsa_keypair,
    package_payload,
    rsa_decrypt_key,
    rsa_encrypt_key,
    unpackage_payload,
    hash_password
)
from .steg import embed_payload, extract_payload, psnr

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_storage()

# Initialize DB Tables
Base.metadata.create_all(bind=engine)

# Seed initial users
db_gen = get_db()
db_session = next(db_gen)
try:
    if not db_session.query(User).first():
        db_session.add_all([
            User(username="admin", hashed_password=hash_password("Admin@123"), role="Admin", locked=False),
            User(username="signals_hq", hashed_password=hash_password("Dept@123"), role="Department", department="Signals", locked=False),
            User(username="soldier_alpha", hashed_password=hash_password("Soldier@123"), role="Soldier", department="Signals", locked=False),
            User(username="soldier_bravo", hashed_password=hash_password("Soldier@123"), role="Soldier", department="Signals", locked=False),
        ])
        db_session.commit()
finally:
    db_session.close()

def get_or_create_keys():
    key_file = os.path.join(settings.output_dir, "rsa_keys.json")
    if os.path.exists(key_file):
        import json
        with open(key_file, "r") as f:
            data = json.load(f)
            return data["private"].encode("utf-8"), data["public"].encode("utf-8")
    priv, pub = generate_rsa_keypair()
    import json
    with open(key_file, "w") as f:
        json.dump({"private": priv.decode("utf-8"), "public": pub.decode("utf-8")}, f)
    return priv, pub

PRIVATE_KEY, PUBLIC_KEY = get_or_create_keys()


@app.get("/health")
def health():
    return {"status": "Secure Channel Active", "app": settings.app_name}


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["username"], Role(user["role"]), user.get("department"))
    write_log(db, "LOGIN", user["username"], "SUCCESS", "Authenticated user")
    return TokenResponse(access_token=token, role=Role(user["role"]), department=user.get("department"))


@app.get("/org/users")
def get_users(user=Depends(current_user), db: Session = Depends(get_db)):
    if user["role"] == "Admin":
        users = db.query(User).all()
    elif user["role"] == "Department":
        users = db.query(User).filter(User.department == user["department"], User.role == "Soldier").all()
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    return [
        {"username": u.username, "role": u.role, "department": u.department, "locked": u.locked}
        for u in users
    ]


@app.post("/org/soldiers")
def create_soldier(payload: AddSoldierRequest, user=Depends(current_user), db: Session = Depends(get_db)):
    if user["role"] not in {"Admin", "Department"}:
        raise HTTPException(status_code=403, detail="Only Admin or Department can add soldiers")
    target_department = user["department"] if user["role"] == "Department" else (payload.department or "Signals")
    try:
        add_soldier(db, payload.username, payload.password, target_department)
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex)) from ex
    write_log(db, "CREATE_SOLDIER", user["username"], "SUCCESS", f"Added {payload.username} to {target_department}")
    return {"message": "Soldier added", "department": target_department, "username": payload.username}


@app.post("/org/departments")
def create_department(payload: AddDepartmentRequest, user=Depends(current_user), db: Session = Depends(get_db)):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        add_department(db, payload.username, payload.password, payload.department_name)
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex)) from ex
    write_log(db, "CREATE_DEPARTMENT", user["username"], "SUCCESS", f"Added department {payload.department_name} ({payload.username})")
    return {"message": "Department added", "department": payload.department_name, "username": payload.username}


@app.put("/org/users/{username}")
def update_user(username: str, payload: EditUserRequest, user=Depends(current_user), db: Session = Depends(get_db)):
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        edit_user(db, username, payload.department, payload.locked, payload.password)
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex)) from ex
    write_log(db, "EDIT_USER", user["username"], "SUCCESS", f"Updated user {username}")
    return {"message": "User updated", "username": username}


@app.delete("/org/users/{username}")
def delete_user_route(username: str, user=Depends(current_user), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user["role"] == "Admin":
        pass
    elif user["role"] == "Department":
        if target_user.role != "Soldier" or target_user.department != user["department"]:
            raise HTTPException(status_code=403, detail="Department can only delete its own soldiers")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        delete_user(db, username)
    except ValueError as ex:
        raise HTTPException(status_code=400, detail=str(ex)) from ex
        
    write_log(db, "DELETE_USER", user["username"], "SUCCESS", f"Deleted user {username}")
    return {"message": "User deleted", "username": username}


@app.post("/comms/send")
def send_message(payload: MessageRequest, user=Depends(current_user), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.username == payload.to_user.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="Recipient not found")
    sender = db.query(User).filter(User.username == user["username"].lower()).first()
    if not sender:
        raise HTTPException(status_code=401, detail="Sender not found")

    sender_role = sender.role
    recipient_role = target.role
    sender_dept = sender.department
    recipient_dept = target.department

    if sender_role != "Admin":
        if sender_role == "Soldier":
            same_dept = sender_dept and sender_dept == recipient_dept
            valid_target = recipient_role in {"Soldier", "Department", "Admin"}
            if not (same_dept and valid_target):
                raise HTTPException(status_code=403, detail="Soldier can message own department users and Admin")
        elif sender_role == "Department":
            valid_target = (recipient_role == "Soldier" and sender_dept == recipient_dept) or recipient_role == "Admin"
            if not valid_target:
                raise HTTPException(status_code=403, detail="Department can message own soldiers and Admin")

    msg = DBMessage(
        sender_id=sender.id,
        recipient_id=target.id,
        body=payload.body,
        department=sender_dept,
        timestamp=str(uuid.uuid4()),
    )
    db.add(msg)
    db.commit()
    write_log(db, "MESSAGE_SEND", user["username"], "SUCCESS", f"to={payload.to_user}")
    return {"message": "Transmission delivered"}


@app.get("/comms/inbox")
def inbox(user=Depends(current_user), db: Session = Depends(get_db)):
    if user["role"] == "Admin":
        messages = db.query(DBMessage).order_by(DBMessage.id.desc()).limit(200).all()
    else:
        recipient = db.query(User).filter(User.username == user["username"].lower()).first()
        if not recipient:
            return []
        messages = db.query(DBMessage).filter(DBMessage.recipient_id == recipient.id).order_by(DBMessage.id.desc()).limit(100).all()
        
    return [
        {
            "from": m.sender.username,
            "to": m.recipient.username,
            "body": m.body,
            "department": m.department,
            "timestamp": m.timestamp,
            "type": m.msg_type,
            "stego_image": m.stego_image,
            "spectrogram_image": m.spectrogram_image,
            "psnr": float(m.psnr) if m.psnr else None,
        }
        for m in messages
    ]


@app.get("/comms/contacts")
def contacts(user=Depends(current_user), db: Session = Depends(get_db)):
    sender = db.query(User).filter(User.username == user["username"].lower()).first()
    if not sender:
        raise HTTPException(status_code=401, detail="Invalid sender")
    sender_role = sender.role
    sender_dept = sender.department

    out = []
    users = db.query(User).all()
    for details in users:
        uname = details.username
        if uname == user["username"].lower():
            continue
        role = details.role
        dept = details.department
        allowed = False
        if sender_role == "Admin":
            allowed = True
        elif sender_role == "Department":
            allowed = (role == "Soldier" and dept == sender_dept) or role == "Admin"
        elif sender_role == "Soldier":
            allowed = role == "Admin" or (dept == sender_dept and role in {"Soldier", "Department"})
        if allowed:
            out.append({"username": uname, "role": role, "department": dept})
    return out


@app.get("/security/status")
def security_status(user=Depends(current_user)):
    return {
        "channel": "Secure Channel Active",
        "tamper_detection": True,
        "key_rotation": "Enabled (session key per operation)",
        "self_destruct_policy": "Enabled for transient decoded files",
        "actor": user["username"],
    }


@app.post("/security/burn")
def burn_protocol(user=Depends(current_user), db: Session = Depends(get_db)):
    username = user["username"].lower()
    user_record = db.query(User).filter(User.username == username).first()
    if user_record:
        user_record.locked = True
        
        # Log critical event
        write_log(db, "BURN_PROTOCOL", user["username"], "CRITICAL", "Terminal compromised. Account locked.")
        
        # Broadcast distress signal to Admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            distress_msg = DBMessage(
                sender_id=user_record.id,
                recipient_id=admin_user.id,
                body=f"CRITICAL: User {user['username']} has initiated BURN PROTOCOL. Terminal locked.",
                department="Security",
                timestamp=str(uuid.uuid4()),
                msg_type="distress_signal"
            )
            db.add(distress_msg)
        
        # Broadcast to department HQ if applicable
        if user.get("department"):
            dept_hq_username = f"{user['department'].lower()}_hq"
            dept_hq = db.query(User).filter(User.username == dept_hq_username).first()
            if dept_hq:
                dept_distress = DBMessage(
                    sender_id=user_record.id,
                    recipient_id=dept_hq.id,
                    body=f"CRITICAL: User {user['username']} has initiated BURN PROTOCOL. Terminal locked.",
                    department="Security",
                    timestamp=str(uuid.uuid4()),
                    msg_type="distress_signal"
                )
                db.add(dept_distress)
        db.commit()

    return {"status": "BURN_PROTOCOL_ENGAGED", "message": "Terminal locked successfully."}


@app.get("/mission/logs")
def mission_logs(user=Depends(current_user), db: Session = Depends(get_db)):
    logs = db.query(TelemetryLog).order_by(TelemetryLog.id.desc()).limit(100).all()
    return [
        {
            "event": log.event_type,
            "actor": log.actor,
            "status": log.status,
            "details": log.details,
            "ts": log.timestamp
        } for log in logs[::-1]
    ]


@app.post("/encode")
async def encode_message(
    audio: UploadFile = File(...),
    image: UploadFile = File(...),
    seed: int = Form(...),
    to_user: str = Form(""),
    use_password: bool = Form(False),
    password: str = Form(""),
    user=Depends(current_user),
    db: Session = Depends(get_db)
):
    uid = uuid.uuid4().hex
    audio_path = os.path.join(settings.upload_dir, f"{uid}_{audio.filename}")
    image_path = os.path.join(settings.upload_dir, f"{uid}_{image.filename}")
    with open(audio_path, "wb") as f:
        f.write(await audio.read())
    with open(image_path, "wb") as f:
        f.write(await image.read())

    arss_blob, meta, spectrogram_img = audio_to_arss(audio_path)
    session_key, nonce, ciphertext = aes_encrypt(arss_blob)
    encrypted_key = rsa_encrypt_key(session_key, PUBLIC_KEY)
    if use_password and password:
        # Secondary lock: xor session key with password-derived bytes for optional extra layer
        pwd = password.encode("utf-8")
        session_key = bytes(b ^ pwd[i % len(pwd)] for i, b in enumerate(session_key))
    decoy = b"routine image asset cache"
    packed = package_payload(ciphertext, nonce, encrypted_key, meta, decoy)

    stego = embed_payload(image_path, packed, seed=seed)
    out_img = os.path.join(settings.output_dir, f"stego_{uid}.png")
    spectrogram_path = os.path.join(settings.output_dir, f"spectrogram_{uid}.png")
    cv2.imwrite(out_img, stego)
    cv2.imwrite(spectrogram_path, spectrogram_img)
    quality = psnr(image_path, stego)
    write_log(db, "ENCODE", user["username"], "SUCCESS", f"stego generated, PSNR={quality:.2f}dB")

    # If recipient chosen, place encoded transmission into mission inbox.
    if to_user:
        recipient = db.query(User).filter(User.username == to_user.lower()).first()
        sender = db.query(User).filter(User.username == user["username"].lower()).first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
            
        sender_role = sender.role
        sender_dept = sender.department
        recipient_role = recipient.role
        recipient_dept = recipient.department

        allowed = False
        if sender_role == "Admin":
            allowed = True
        elif sender_role == "Department":
            allowed = (recipient_role == "Soldier" and sender_dept == recipient_dept) or recipient_role == "Admin"
        elif sender_role == "Soldier":
            allowed = recipient_role == "Admin" or (sender_dept == recipient_dept and recipient_role in {"Soldier", "Department"})
        if not allowed:
            raise HTTPException(status_code=403, detail="Recipient not allowed by communication policy")

        msg = DBMessage(
            sender_id=sender.id,
            recipient_id=recipient.id,
            body="Encoded transmission attached",
            department=sender_dept,
            timestamp=str(uuid.uuid4()),
            msg_type="encoded_transmission",
            stego_image=out_img,
            spectrogram_image=spectrogram_path,
            psnr=str(quality)
        )
        db.add(msg)
        db.commit()
        write_log(db, "TRANSMISSION_SEND", user["username"], "SUCCESS", f"to={to_user}")

    return {
        "stego_image": out_img,
        "spectrogram_image": spectrogram_path,
        "psnr": quality,
        "meta": meta,
        "to_user": to_user or None,
    }


@app.post("/decode")
async def decode_message(
    image: UploadFile = File(...),
    seed: int = Form(...),
    use_password: bool = Form(False),
    password: str = Form(""),
    user=Depends(current_user),
    db: Session = Depends(get_db)
):
    uid = uuid.uuid4().hex
    image_path = os.path.join(settings.upload_dir, f"in_{uid}_{image.filename}")
    with open(image_path, "wb") as f:
        f.write(await image.read())

    payload = extract_payload(image_path, seed=seed)
    wrapped = unpackage_payload(payload)
    encrypted_key = base64.b64decode(wrapped["enc_key"])
    nonce = base64.b64decode(wrapped["nonce"])
    ciphertext = base64.b64decode(wrapped["ciphertext"])

    session_key = rsa_decrypt_key(encrypted_key, PRIVATE_KEY)
    if use_password and password:
        # Reverse the secondary XOR lock applied during encoding
        pwd = password.encode("utf-8")
        session_key = bytes(b ^ pwd[i % len(pwd)] for i, b in enumerate(session_key))
    plain_arss = aes_decrypt(session_key, nonce, ciphertext)
    audio_bytes, spec_img = arss_to_audio(plain_arss, sr=wrapped["arss_meta"]["sr"])

    out_wav = os.path.join(settings.output_dir, f"recovered_{uid}.wav")
    spectrogram_path = os.path.join(settings.output_dir, f"dec_spectrogram_{uid}.png")
    
    with open(out_wav, "wb") as f:
        f.write(audio_bytes)
    cv2.imwrite(spectrogram_path, spec_img)
    
    write_log(db, "DECODE", user["username"], "SUCCESS", "audio reconstructed")
    return {
        "audio_file": out_wav,
        "spectrogram_image": spectrogram_path,
        "message": "Decrypt Signal complete"
    }


@app.post("/preview/spectrogram")
async def preview_spectrogram(
    audio: UploadFile = File(...),
    user=Depends(current_user),
    db: Session = Depends(get_db)
):
    uid = uuid.uuid4().hex
    audio_path = os.path.join(settings.upload_dir, f"preview_{uid}_{audio.filename}")
    with open(audio_path, "wb") as f:
        f.write(await audio.read())

    _, meta, spectrogram_img = audio_to_arss(audio_path)
    spectrogram_path = os.path.join(settings.output_dir, f"preview_spectrogram_{uid}.png")
    cv2.imwrite(spectrogram_path, spectrogram_img)
    write_log(db, "SPECTROGRAM_PREVIEW", user["username"], "SUCCESS", "live spectrogram generated")
    return {"spectrogram_image": spectrogram_path, "meta": meta}


@app.get("/download/stego")
def download_stego(path: str, user=Depends(current_user)):
    if not Path(path).exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="image/png", filename=Path(path).name)


def remove_file_task(path: str):
    try:
        os.remove(path)
    except Exception:
        pass

@app.get("/download/audio")
def download_audio(path: str, background_tasks: BackgroundTasks, user=Depends(current_user)):
    if not Path(path).exists():
        raise HTTPException(status_code=404, detail="File not found")
    # one-time retrieval policy
    background_tasks.add_task(remove_file_task, path)
    return FileResponse(path, media_type="audio/wav", filename=Path(path).name)
