#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整测试所有API
"""

import requests
import json
import time

def test_all_apis():
    """测试所有API"""
    base_url = "http://localhost:8080"

    print("=" * 60)
    print("🔍 开始测试API")
    print("=" * 60)

    # 1. 测试登录
    print("\n1️⃣ 测试登录...")
    login_url = f"{base_url}/api/login"
    login_data = {"username": "admin", "password": "admin123"}

    try:
        response = requests.post(login_url, data=login_data, timeout=5)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            token = data.get('token')
            print(f"   ✅ 登录成功!")
            print(f"   Token: {token[:50]}...")
        else:
            print(f"   ❌ 登录失败: {response.text}")
            return
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
        print("   请确保服务器正在运行: uvicorn server_with_auth:app_instance --host 0.0.0.0 --port 8080 --reload")
        return

    # 2. 测试获取用户列表
    print("\n2️⃣ 测试获取用户列表...")
    users_url = f"{base_url}/api/admin/users"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(users_url, headers=headers, timeout=5)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            users = response.json()
            print(f"   ✅ 获取用户列表成功!")
            print(f"   用户数: {len(users)}")
            for user in users:
                print(f"   - {user['username']} (管理员: {user['is_admin']})")
        else:
            print(f"   ❌ 获取用户列表失败: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")

    # 3. 测试获取操作日志
    print("\n3️⃣ 测试获取操作日志...")
    logs_url = f"{base_url}/api/admin/logs?limit=10"

    try:
        response = requests.get(logs_url, headers=headers, timeout=5)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            logs = response.json()
            print(f"   ✅ 获取操作日志成功!")
            print(f"   日志数: {len(logs)}")
        else:
            print(f"   ❌ 获取操作日志失败: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")

    # 4. 测试获取统计信息
    print("\n4️⃣ 测试获取统计信息...")
    stats_url = f"{base_url}/api/admin/stats"

    try:
        response = requests.get(stats_url, headers=headers, timeout=5)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            stats = response.json()
            print(f"   ✅ 获取统计信息成功!")
            print(f"   统计: {json.dumps(stats, indent=2, ensure_ascii=False)}")
        else:
            print(f"   ❌ 获取统计信息失败: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")

    print("\n" + "=" * 60)
    print("✅ 测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_all_apis()
