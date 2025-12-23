#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据迁移工具 - 从 SQLite 迁移到 Supabase PostgreSQL
使用方法: python migrate_to_supabase.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

# 配置数据库连接 - 使用 Session Pooler（支持 IPv4）
SQLITE_DB_PATH = "app.db"
SUPABASE_URL = "postgresql://postgres.mckoiztgjskrvueconqx:jinzenshi996@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

def create_sqlite_engine():
    """创建 SQLite 引擎"""
    return create_engine(f"sqlite:///{SQLITE_DB_PATH}", echo=False)

def create_postgresql_engine():
    """创建 PostgreSQL 引擎"""
    return create_engine(
        SUPABASE_URL,
        pool_size=20,
        max_overflow=30,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False
    )

def check_sqlite_db():
    """检查 SQLite 数据库是否存在"""
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ SQLite 数据库文件不存在: {SQLITE_DB_PATH}")
        print("请确保您有现有的 SQLite 数据库文件")
        return False
    return True

def migrate_users(sqlite_session, pg_session):
    """迁移用户数据"""
    print("\n📤 迁移用户数据...")
    
    try:
        # 从 SQLite 读取数据
        sqlite_users = sqlite_session.execute(text("SELECT * FROM users")).fetchall()
        print(f"   从 SQLite 读取到 {len(sqlite_users)} 条用户记录")
        
        # 插入到 PostgreSQL
        for user in sqlite_users:
            # 检查用户是否已存在
            exists = pg_session.execute(
                text("SELECT COUNT(*) FROM users WHERE username = :username"),
                {"username": user[1]}
            ).scalar()
            
            if not exists:
                pg_session.execute(
                    text("""
                        INSERT INTO users (id, username, password, created_at, expires_at, is_admin, is_temporary)
                        VALUES (:id, :username, :password, :created_at, :expires_at, :is_admin, :is_temporary)
                    """),
                    {
                        "id": user[0],
                        "username": user[1],
                        "password": user[2],
                        "created_at": user[3],
                        "expires_at": user[4],
                        "is_admin": user[5] if user[5] else False,
                        "is_temporary": user[6] if user[6] else False
                    }
                )
        
        pg_session.commit()
        print("   ✅ 用户数据迁移完成")
        return True
    except Exception as e:
        print(f"   ❌ 用户数据迁移失败: {e}")
        pg_session.rollback()
        return False

def migrate_operation_logs(sqlite_session, pg_session):
    """迁移操作日志"""
    print("\n📤 迁移操作日志...")
    
    try:
        # 从 SQLite 读取数据
        sqlite_logs = sqlite_session.execute(text("SELECT * FROM operation_logs")).fetchall()
        print(f"   从 SQLite 读取到 {len(sqlite_logs)} 条操作日志")
        
        # 插入到 PostgreSQL
        for log in sqlite_logs:
            pg_session.execute(
                text("""
                    INSERT INTO operation_logs (id, username, operation, details, submitted_data, ip_address, status, created_at)
                    VALUES (:id, :username, :operation, :details, :submitted_data, :ip_address, :status, :created_at)
                """),
                {
                    "id": log[0],
                    "username": log[1],
                    "operation": log[2],
                    "details": log[3],
                    "submitted_data": log[4],
                    "ip_address": log[5],
                    "status": log[6] if log[6] else 'success',
                    "created_at": log[7]
                }
            )
        
        pg_session.commit()
        print("   ✅ 操作日志迁移完成")
        return True
    except Exception as e:
        print(f"   ❌ 操作日志迁移失败: {e}")
        pg_session.rollback()
        return False

def migrate_feedbacks(sqlite_session, pg_session):
    """迁移用户反馈"""
    print("\n📤 迁移用户反馈...")
    
    try:
        # 从 SQLite 读取数据
        sqlite_feedbacks = sqlite_session.execute(text("SELECT * FROM feedbacks")).fetchall()
        print(f"   从 SQLite 读取到 {len(sqlite_feedbacks)} 条反馈记录")
        
        # 插入到 PostgreSQL
        for feedback in sqlite_feedbacks:
            pg_session.execute(
                text("""
                    INSERT INTO feedbacks (
                        id, username, feedback_type, rating, title, description,
                        screenshot_path, page_url, user_agent, contact_email,
                        status, admin_reply, created_at, updated_at
                    )
                    VALUES (
                        :id, :username, :feedback_type, :rating, :title, :description,
                        :screenshot_path, :page_url, :user_agent, :contact_email,
                        :status, :admin_reply, :created_at, :updated_at
                    )
                """),
                {
                    "id": feedback[0],
                    "username": feedback[1],
                    "feedback_type": feedback[2],
                    "rating": feedback[3],
                    "title": feedback[4],
                    "description": feedback[5],
                    "screenshot_path": feedback[6],
                    "page_url": feedback[7],
                    "user_agent": feedback[8],
                    "contact_email": feedback[9],
                    "status": feedback[10] if feedback[10] else 'pending',
                    "admin_reply": feedback[11],
                    "created_at": feedback[12],
                    "updated_at": feedback[13] if feedback[13] else feedback[12]
                }
            )
        
        pg_session.commit()
        print("   ✅ 用户反馈迁移完成")
        return True
    except Exception as e:
        print(f"   ❌ 用户反馈迁移失败: {e}")
        pg_session.rollback()
        return False

def verify_migration(pg_session):
    """验证迁移结果"""
    print("\n🔍 验证迁移结果...")
    
    try:
        # 统计各表数据量
        tables = {
            "users": "SELECT COUNT(*) FROM users",
            "operation_logs": "SELECT COUNT(*) FROM operation_logs",
            "feedbacks": "SELECT COUNT(*) FROM feedbacks"
        }
        
        for table, query in tables.items():
            count = pg_session.execute(text(query)).scalar()
            print(f"   {table}: {count} 条记录")
        
        print("   ✅ 验证完成")
        return True
    except Exception as e:
        print(f"   ❌ 验证失败: {e}")
        return False

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 智能填表系统 - SQLite 到 Supabase PostgreSQL 迁移工具")
    print("=" * 60)
    
    # 检查 SQLite 数据库
    if not check_sqlite_db():
        sys.exit(1)
    
    # 创建引擎
    print("\n🔌 连接数据库...")
    sqlite_engine = create_sqlite_engine()
    pg_engine = create_postgresql_engine()
    
    # 创建会话
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PgSession = sessionmaker(bind=pg_engine)
    
    sqlite_session = SQLiteSession()
    pg_session = PgSession()
    
    try:
        # 执行迁移
        success = True
        success &= migrate_users(sqlite_session, pg_session)
        success &= migrate_operation_logs(sqlite_session, pg_session)
        success &= migrate_feedbacks(sqlite_session, pg_session)
        
        # 验证结果
        if success:
            verify_migration(pg_session)
            print("\n" + "=" * 60)
            print("🎉 数据迁移完成！")
            print("=" * 60)
            print("\n📋 下一步操作:")
            print("1. 确认数据迁移正确")
            print("2. 更新环境变量 DATABASE_URL")
            print("3. 重新部署应用到 Render")
            print("4. 测试所有功能")
            print("\n💡 提示: 可以保留 SQLite 文件作为备份")
        else:
            print("\n❌ 数据迁移失败，请检查错误信息")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ 迁移过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # 关闭会话
        sqlite_session.close()
        pg_session.close()
        
        # 关闭引擎
        sqlite_engine.dispose()
        pg_engine.dispose()

if __name__ == "__main__":
    main()
