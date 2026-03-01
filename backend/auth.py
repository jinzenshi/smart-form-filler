#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户认证模块
"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from models import User, SessionLocal, OperationLog
from typing import Optional
import base64
import json
import os
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone

# 密钥配置（优先使用环境变量，未配置时使用进程临时密钥）
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip() or secrets.token_urlsafe(32)
TOKEN_EXPIRE_SECONDS = int(os.getenv("AUTH_TOKEN_EXPIRE_SECONDS", str(7 * 24 * 3600)))

if not os.getenv("JWT_SECRET_KEY"):
    print("⚠️ JWT_SECRET_KEY 未配置，当前使用进程临时密钥，重启后令牌将失效")

security = HTTPBearer()

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign_payload(payload_b64: str) -> str:
    return hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()


def _decode_token(token: str) -> dict:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="无效的认证凭据") from exc

    expected_signature = _sign_payload(payload_b64)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=401, detail="认证签名无效")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode())
    except Exception as exc:
        raise HTTPException(status_code=401, detail="令牌内容无效") from exc

    exp = int(payload.get("exp", 0))
    if exp <= int(time.time()):
        raise HTTPException(status_code=401, detail="令牌已过期")

    username = str(payload.get("sub", "")).strip()
    if not username:
        raise HTTPException(status_code=401, detail="令牌缺少用户信息")

    return payload


def hash_password(password: str) -> str:
    """加密密码"""
    # 使用HMAC-SHA256加密
    return hmac.new(SECRET_KEY.encode(), password.encode(), hashlib.sha256).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return hash_password(plain_password) == hashed_password

def create_user(db: Session, username: str, password: str) -> User:
    """创建用户"""
    # 检查用户名和密码长度
    if len(username) < 3 or len(password) < 3:
        raise HTTPException(
            status_code=400,
            detail="用户名和密码必须至少3个字符"
        )

    # 检查用户是否已存在
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="用户名已存在"
        )

    # 创建用户
    hashed_pwd = hash_password(password)
    user = User(username=username, password=hashed_pwd)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """验证用户"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password):
        return None

    # 检查账号是否过期（仅对临时账号）
    if user.expires_at and user.expires_at < datetime.utcnow():
        return None

    return user

def check_user_expired(user: User) -> bool:
    """检查用户是否过期"""
    if not user.expires_at:
        return False  # 永不过期（如管理员）

    # 确保两个时间都有相同的时区设置
    expires_at = user.expires_at

    # 如果 expires_at 是 naive 时间，假设它是 UTC 时间
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    # 使用 timezone-aware 的时间进行比较
    return expires_at < datetime.now(timezone.utc)

def generate_temporary_username(db: Session) -> str:
    """生成唯一的临时用户名"""
    import string
    import random

    while True:
        # 生成8位随机用户名：temp_ + 4位随机字符
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        username = f"temp_{suffix}"

        # 检查是否已存在
        if not db.query(User).filter(User.username == username).first():
            return username

def generate_temporary_password(length: int = 10) -> str:
    """生成随机密码"""
    import string
    import random

    # 包含大小写字母、数字和常用符号
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choices(characters, k=length))

def create_temporary_account(db: Session, days_valid: int = 7) -> dict:
    """创建临时账号"""
    username = generate_temporary_username(db)
    password = generate_temporary_password()
    expires_at = datetime.utcnow() + timedelta(days=days_valid)

    hashed_pwd = hash_password(password)
    user = User(
        username=username,
        password=hashed_pwd,
        expires_at=expires_at,
        is_temporary=True,
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "username": username,
        "password": password,
        "expires_at": expires_at,
        "days_valid": days_valid
    }

def log_operation(db: Session, username: str, operation: str, details: str = None,
                  submitted_data: dict = None, ip_address: str = None, status: str = 'success'):
    """记录操作日志"""
    import json

    log = OperationLog(
        username=username,
        operation=operation,
        details=details,
        submitted_data=json.dumps(submitted_data, ensure_ascii=False) if submitted_data else None,
        ip_address=ip_address,
        status=status
    )
    db.add(log)
    db.commit()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security),
                    db: Session = Depends(get_db)) -> User:
    """获取当前用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        if not token:
            raise credentials_exception

        payload = _decode_token(token)
        username = str(payload.get("sub", "")).strip()
        user = db.query(User).filter(User.username == username).first()

        if user is None:
            raise credentials_exception

        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token验证错误: {e}")
        raise credentials_exception

def is_admin(user: User = Depends(get_current_user)) -> User:
    """检查是否为管理员"""
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="需要管理员权限"
        )
    return user

def generate_token(username: str) -> str:
    """生成签名令牌"""
    now_ts = int(time.time())
    payload = {
        "sub": username,
        "iat": now_ts,
        "exp": now_ts + TOKEN_EXPIRE_SECONDS,
        "nonce": secrets.token_hex(8),
    }
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = _sign_payload(payload_b64)
    return f"{payload_b64}.{signature}"
