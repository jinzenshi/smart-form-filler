#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设置用户为管理员
"""

from models import init_db, User, SessionLocal

def set_user_as_admin(username: str):
    """设置用户为管理员"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            user.is_admin = True
            db.commit()
            print(f"✅ 用户 {username} 已设置为管理员")
        else:
            print(f"❌ 用户 {username} 不存在")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("用法: python set_admin.py <用户名>")
        sys.exit(1)

    set_user_as_admin(sys.argv[1])
