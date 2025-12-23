#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FileStorage 表迁移脚本
用于添加文件存储功能到现有数据库
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# 使用与 models.py 相同的数据库配置
DATABASE_URL = "postgresql://postgres.mckoiztgjskrvueconqx:jinzenshi996@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

Base = declarative_base()

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

def run_migration():
    """运行迁移"""
    try:
        print("🚀 开始 FileStorage 表迁移...")

        # 创建 FileStorage 表
        FileStorage.__table__.create(engine, checkfirst=True)
        print("✅ FileStorage 表创建成功！")

        print("\n✅ 迁移完成！")
        print("\n📋 功能说明：")
        print("   - FileStorage 表已创建，用于跟踪所有上传的文件")
        print("   - 支持 DOCX 文档、个人信息 TXT 文件、反馈截图")
        print("   - 文件存储在 Supabase Storage 中")
        print("   - 管理员可以在后台查看、下载和删除文件")

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
