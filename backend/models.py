#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库模型 - Supabase PostgreSQL 版本
支持从 SQLite 平滑迁移到 PostgreSQL
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta
import os

# 加载环境变量
try:
    from dotenv import load_dotenv
    # 直接加载当前目录的 .env 文件
    load_dotenv('./.env')
except ImportError:
    pass

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

class SimpleUser(Base):
    """简单用户表（支持Token登录）"""
    __tablename__ = 'simple_users'

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)  # 用户唯一标识
    balance = Column(Integer, default=0)  # 剩余次数
    total_balance = Column(Integer, default=0)  # 总次数
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)  # 最后使用时间
    expires_at = Column(DateTime, nullable=True)  # 过期时间
    is_active = Column(Boolean, default=True)  # 是否激活

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

class FileStorage(Base):
    """文件存储表"""
    __tablename__ = 'file_storage'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)  # 上传用户
    file_type = Column(String(20), nullable=False)  # 文件类型：docx, user_info, screenshot
    original_filename = Column(String(255), nullable=False)  # 原始文件名
    file_path = Column(String(500), nullable=False)  # Supabase Storage 中的文件路径
    public_url = Column(String(1000), nullable=False)  # 公共访问URL
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）
    content_type = Column(String(100), nullable=True)  # MIME 类型
    operation_log_id = Column(Integer, nullable=True)  # 关联的操作日志ID
    created_at = Column(DateTime, default=datetime.utcnow)

# 数据库初始化 - 支持 PostgreSQL 和 SQLite
def get_database_url():
    """获取数据库连接 URL"""
    # 优先使用环境变量中的 DATABASE_URL
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")

    # 临时使用SQLite测试Token功能
    return "sqlite:///./test.db"

DATABASE_URL = get_database_url()

# 创建引擎 - 根据数据库类型选择配置
if DATABASE_URL.startswith("postgresql"):
    # PostgreSQL 配置 - 使用连接池优化性能（降低 pool_size 避免连接满）
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,        # 降低连接池大小（Supabase Session Mode 限制）
        max_overflow=10,    # 降低最大溢出
        pool_pre_ping=True,
        pool_recycle=3600,  # 标准连接回收时间
        pool_timeout=30,    # 连接超时
        echo=False  # 设置为 True 可以看到 SQL 日志
    )
else:
    # SQLite 配置（向后兼容）
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """初始化数据库"""
    try:
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        print(f"✅ 数据库表创建成功！连接类型: {'PostgreSQL' if DATABASE_URL.startswith('postgresql') else 'SQLite'}")

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
            else:
                print("ℹ️ 管理员账户已存在")
        except Exception as e:
            print(f"⚠️ 创建管理员账户失败: {e}")
            db.rollback()
        finally:
            db.close()

        print("✅ 数据库初始化成功！")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        import traceback
        traceback.print_exc()

def get_db():
    """获取数据库会话的依赖注入"""
    """用于 FastAPI 依赖注入"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def close_db():
    """关闭数据库连接"""
    engine.dispose()
