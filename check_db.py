#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查数据库中的用户
"""

from models import init_db, User, SessionLocal

def check_users():
    """检查用户"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"数据库中共有 {len(users)} 个用户:")
        for user in users:
            print(f"- ID: {user.id}, 用户名: {user.username}, 管理员: {user.is_admin}, 创建时间: {user.created_at}")
            print(f"  密码哈希: {user.password[:50]}...")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    check_users()
