import base64
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from passlib.context import CryptContext

from .config import settings
from .models import Role

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(username: str, role: Role, department: Optional[str] = None) -> str:
    expiry = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expiry_minutes)
    payload = {"sub": username, "role": role.value, "department": department, "exp": expiry}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def generate_rsa_keypair() -> tuple[bytes, bytes]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    priv = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return priv, pub


def aes_encrypt(data: bytes) -> tuple[bytes, bytes, bytes]:
    key = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    cipher = AESGCM(key)
    encrypted = cipher.encrypt(nonce, data, None)
    return key, nonce, encrypted


def aes_decrypt(key: bytes, nonce: bytes, encrypted: bytes) -> bytes:
    cipher = AESGCM(key)
    return cipher.decrypt(nonce, encrypted, None)


def rsa_encrypt_key(key: bytes, public_pem: bytes) -> bytes:
    pub = serialization.load_pem_public_key(public_pem)
    return pub.encrypt(
        key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )


def rsa_decrypt_key(enc_key: bytes, private_pem: bytes) -> bytes:
    priv = serialization.load_pem_private_key(private_pem, password=None)
    return priv.decrypt(
        enc_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )


def package_payload(ciphertext: bytes, nonce: bytes, enc_key: bytes, arss_meta: dict, decoy: bytes) -> bytes:
    wrapped = {
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "enc_key": base64.b64encode(enc_key).decode(),
        "arss_meta": arss_meta,
        "decoy": base64.b64encode(decoy).decode(),
        "tamper_tag": base64.b64encode(os.urandom(16)).decode(),
    }
    return json.dumps(wrapped).encode("utf-8")


def unpackage_payload(payload: bytes) -> dict:
    return json.loads(payload.decode("utf-8"))
