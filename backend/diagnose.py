#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
诊断系统问题
"""

import os
import sys
import traceback

def check_imports():
    """检查导入"""
    print("=" * 60)
    print("🔍 检查导入...")
    print("=" * 60)

    modules_to_check = [
        ('fastapi', 'FastAPI框架'),
        ('sqlalchemy', 'SQLAlchemy ORM'),
        ('docx', 'python-docx库'),
        ('requests', 'requests库'),
    ]

    for module, description in modules_to_check:
        try:
            __import__(module)
            print(f"✅ {module:15} - {description}")
        except ImportError as e:
            print(f"❌ {module:15} - 未安装: {e}")

def check_files():
    """检查文件"""
    print("\n" + "=" * 60)
    print("📁 检查文件...")
    print("=" * 60)

    files_to_check = [
        ('core.py', '核心模块'),
        ('server_with_auth.py', '认证服务器'),
        ('models.py', '数据模型'),
        ('auth.py', '认证模块'),
        ('static/index.html', '前端主页'),
        ('static/login.html', '登录页面'),
        ('static/admin.html', '管理页面'),
        ('报名表.docx', '测试文档'),
        ('个人信息.txt', '测试信息'),
    ]

    for filepath, description in files_to_check:
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            print(f"✅ {filepath:25} - {description} ({size} bytes)")
        else:
            print(f"❌ {filepath:25} - 文件不存在")

def check_database():
    """检查数据库"""
    print("\n" + "=" * 60)
    print("🗄️ 检查数据库...")
    print("=" * 60)

    try:
        from models import init_db, User, SessionLocal

        db = SessionLocal()
        users = db.query(User).all()
        print(f"✅ 数据库连接正常")
        print(f"   用户数量: {len(users)}")
        for user in users:
            print(f"   - {user.username} (管理员: {user.is_admin})")
        db.close()
    except Exception as e:
        print(f"❌ 数据库错误: {e}")
        traceback.print_exc()

def test_core_import():
    """测试核心模块导入"""
    print("\n" + "=" * 60)
    print("🧪 测试核心模块...")
    print("=" * 60)

    try:
        from core import fill_form
        print("✅ core.fill_form 导入成功")

        # 测试函数是否存在
        if callable(fill_form):
            print("✅ fill_form 是可调用函数")
        else:
            print("❌ fill_form 不可调用")

    except Exception as e:
        print(f"❌ 核心模块导入失败: {e}")
        traceback.print_exc()

def test_server_import():
    """测试服务器导入"""
    print("\n" + "=" * 60)
    print("🚀 测试服务器模块...")
    print("=" * 60)

    try:
        import server_with_auth
        print("✅ server_with_auth 导入成功")

        if hasattr(server_with_auth, 'app'):
            print("✅ app 对象存在")
        else:
            print("❌ app 对象不存在")

    except Exception as e:
        print(f"❌ 服务器模块导入失败: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    print("🔧 系统诊断开始...\n")

    check_imports()
    check_files()
    check_database()
    test_core_import()
    test_server_import()

    print("\n" + "=" * 60)
    print("✅ 诊断完成")
    print("=" * 60)
