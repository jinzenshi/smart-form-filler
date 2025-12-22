#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库模型
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import os

Base = declarative_base()

class User(Base):
    """用户表"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # 账号有效期，NULL表示永不过期（管理员账号）
    is_admin = Column(Boolean, default=False)
    is_temporary = Column(Boolean, default=False)  # 是否为临时账号

class OperationLog(Base):
    """操作日志表"""
    __tablename__ = 'operation_logs'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    operation = Column(String(100), nullable=False)  # 登录、上传文件等
    details = Column(Text, nullable=True)  # 详细信息，如文件名
    submitted_data = Column(Text, nullable=True)  # 用户提交的详细数据（JSON格式）
    ip_address = Column(String(50), nullable=True)
    status = Column(String(20), default='success')  # success, failed
    created_at = Column(DateTime, default=datetime.utcnow)

class Feedback(Base):
    """用户反馈表"""
    __tablename__ = 'feedbacks'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    feedback_type = Column(String(20), nullable=False)  # suggestion, bug, ux, performance, other
    rating = Column(Integer, nullable=False)  # 1-5星评分
    title = Column(String(200), nullable=False)  # 反馈标题
    description = Column(Text, nullable=False)  # 详细描述
    screenshot_path = Column(String(500), nullable=True)  # 截图文件路径
    page_url = Column(String(500), nullable=True)  # 反馈页面URL
    user_agent = Column(String(500), nullable=True)  # 浏览器信息
    contact_email = Column(String(100), nullable=True)  # 联系方式
    status = Column(String(20), default='pending')  # pending, processing, resolved, closed
    admin_reply = Column(Text, nullable=True)  # 管理员回复
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# 数据库初始化
DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """初始化数据库"""
    try:
        Base.metadata.create_all(bind=engine)
        # 创建默认管理员账户
        db = SessionLocal()
        try:
            admin = db.query(User).filter(User.username == 'admin').first()
            if not admin:
                # 导入加密函数
                from auth import hash_password
                admin_user = User(
                    username='admin',
                    password=hash_password('admin123'),
                    is_admin=True
                )
                db.add(admin_user)
                db.commit()
                print("✅ 默认管理员账户创建成功: admin / admin123")
        except Exception as e:
            print(f"⚠️ 创建管理员账户失败: {e}")
        finally:
            db.close()
    except Exception as e:
        print(f"⚠️ 数据库初始化失败: {e}")
