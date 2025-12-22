#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试登录验证
"""

from models import init_db, User, SessionLocal
from auth import authenticate_user

def test_login():
    """测试登录"""
    init_db()
    db = SessionLocal()
    try:
        # 测试 admin 登录
        user = authenticate_user(db, 'admin', 'admin123')
        if user:
            print(f"✅ admin 登录成功! 用户ID: {user.id}, 管理员: {user.is_admin}")
        else:
            print("❌ admin 登录失败")

        # 测试错误密码
        user = authenticate_user(db, 'admin', 'wrongpassword')
        if user:
            print("❌ 错误密码验证通过（这是不对的）")
        else:
            print("✅ 错误密码正确拒绝")

        # 测试新用户注册和登录
        from auth import create_user
        try:
            new_user = create_user(db, 'testuser', 'test123')
            print(f"✅ 新用户创建成功: {new_user.username}")

            # 测试新用户登录
            user = authenticate_user(db, 'testuser', 'test123')
            if user:
                print(f"✅ testuser 登录成功! 用户ID: {user.id}")
            else:
                print("❌ testuser 登录失败")
        except Exception as e:
            print(f"⚠️ 新用户创建失败（可能已存在）: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_login()
