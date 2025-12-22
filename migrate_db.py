#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本
为现有数据库添加新字段：expires_at 和 is_temporary
"""

import sqlite3
import os

def migrate_database():
    """迁移数据库以添加新字段"""
    db_path = "app.db"

    if not os.path.exists(db_path):
        print("ℹ️  数据库文件不存在，跳过迁移")
        return

    print("🔄 开始数据库迁移...")

    # 备份原数据库
    backup_path = "app.db.backup"
    if os.path.exists(backup_path):
        os.remove(backup_path)
    os.rename(db_path, backup_path)
    print(f"✅ 已备份原数据库为: {backup_path}")

    try:
        # 连接到备份数据库读取数据
        conn_backup = sqlite3.connect(backup_path)
        cursor_backup = conn_backup.cursor()

        # 获取表结构
        cursor_backup.execute("PRAGMA table_info(users)")
        columns = cursor_backup.fetchall()

        # 检查新字段是否已存在
        column_names = [col[1] for col in columns]
        has_expires_at = 'expires_at' in column_names
        has_is_temporary = 'is_temporary' in column_names

        if has_expires_at and has_is_temporary:
            print("ℹ️  新字段已存在，无需迁移")
            os.rename(backup_path, db_path)
            conn_backup.close()
            return

        # 创建新数据库
        conn_new = sqlite3.connect(db_path)
        cursor_new = conn_new.cursor()

        # 读取所有用户数据
        cursor_backup.execute("SELECT * FROM users")
        users = cursor_backup.fetchall()

        # 创建新表结构
        cursor_new.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NULL,
                is_admin BOOLEAN DEFAULT 0,
                is_temporary BOOLEAN DEFAULT 0
            )
        """)

        # 插入数据
        for user in users:
            id_val = user[0]
            username = user[1]
            password = user[2]
            created_at = user[3] if len(user) > 3 else 'CURRENT_TIMESTAMP'
            is_admin = user[4] if len(user) > 4 else 0

            cursor_new.execute("""
                INSERT INTO users (id, username, password, created_at, expires_at, is_admin, is_temporary)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (id_val, username, password, created_at, None, is_admin, 0))

        # 创建 operation_logs 表
        cursor_new.execute("""
            CREATE TABLE operation_logs (
                id INTEGER PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                operation VARCHAR(100) NOT NULL,
                details TEXT NULL,
                submitted_data TEXT NULL,
                ip_address VARCHAR(50) NULL,
                status VARCHAR(20) DEFAULT 'success',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 读取并插入操作日志
        cursor_backup.execute("SELECT * FROM operation_logs")
        logs = cursor_backup.fetchall()
        for log in logs:
            cursor_new.execute("""
                INSERT INTO operation_logs
                (id, username, operation, details, submitted_data, ip_address, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, log)

        # 创建 feedbacks 表
        cursor_new.execute("""
            CREATE TABLE feedbacks (
                id INTEGER PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                feedback_type VARCHAR(20) NOT NULL,
                rating INTEGER NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                screenshot_path VARCHAR(500) NULL,
                page_url VARCHAR(500) NULL,
                user_agent VARCHAR(500) NULL,
                contact_email VARCHAR(100) NULL,
                status VARCHAR(20) DEFAULT 'pending',
                admin_reply TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 读取并插入反馈
        cursor_backup.execute("SELECT * FROM feedbacks")
        feedbacks = cursor_backup.fetchall()
        for feedback in feedbacks:
            cursor_new.execute("""
                INSERT INTO feedbacks
                (id, username, feedback_type, rating, title, description, screenshot_path,
                 page_url, user_agent, contact_email, status, admin_reply, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, feedback)

        # 提交事务
        conn_new.commit()
        conn_backup.commit()

        # 关闭连接
        conn_backup.close()
        conn_new.close()

        print("✅ 数据库迁移完成！")
        print(f"ℹ️  新字段已添加:")
        print(f"   - expires_at: 账号有效期")
        print(f"   - is_temporary: 是否为临时账号")

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        print("正在恢复备份数据库...")
        if os.path.exists(db_path):
            os.remove(db_path)
        os.rename(backup_path, db_path)
        print("✅ 已恢复备份数据库")

if __name__ == "__main__":
    migrate_database()
