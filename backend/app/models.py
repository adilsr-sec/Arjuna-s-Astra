from enum import Enum
from pydantic import BaseModel


class Role(str, Enum):
    admin = "Admin"
    department = "Department"
    soldier = "Soldier"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    department: str | None = None


class UserLogin(BaseModel):
    username: str
    password: str


class AddSoldierRequest(BaseModel):
    username: str
    password: str
    department: str | None = None


class AddDepartmentRequest(BaseModel):
    username: str
    password: str
    department_name: str


class EditUserRequest(BaseModel):
    department: str | None = None
    locked: bool | None = None
    password: str | None = None


class MessageRequest(BaseModel):
    to_user: str
    body: str


class MissionLog(BaseModel):
    event: str
    actor: str
    status: str
    details: str
    ts: str
