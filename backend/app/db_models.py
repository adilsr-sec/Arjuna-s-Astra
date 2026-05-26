from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime

from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    role = Column(String(20), nullable=False) # Admin, Department, Soldier
    department = Column(String(50), nullable=True)
    public_key = Column(Text, nullable=True) # Optional for now, rely on global key if empty
    locked = Column(Boolean, default=False)

    # Relationships
    messages_sent = relationship("Message", back_populates="sender", foreign_keys="[Message.sender_id]")
    messages_received = relationship("Message", back_populates="recipient", foreign_keys="[Message.recipient_id]")
    telemetry_logs = relationship("TelemetryLog", back_populates="user")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    department = Column(String(50), nullable=True)
    
    stego_image = Column(String(255), nullable=True)
    spectrogram_image = Column(String(255), nullable=True)
    psnr = Column(String(20), nullable=True)
    
    timestamp = Column(String(100), nullable=False)
    msg_type = Column(String(50), nullable=True) # E.g., 'encoded_transmission', 'distress_signal'
    retrieval_status = Column(String(20), default="pending") # pending, retrieved, deleted

    sender = relationship("User", back_populates="messages_sent", foreign_keys=[sender_id])
    recipient = relationship("User", back_populates="messages_received", foreign_keys=[recipient_id])

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # System events might not have a user
    event_type = Column(String(50), nullable=False) # LOGIN, ENCODE, DECODE, BURN_PROTOCOL
    actor = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(String(100), nullable=False)

    user = relationship("User", back_populates="telemetry_logs")
