#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试管理员API详细
"""

import requests
import json

def test_admin_apis():
    """测试所有管理员API"""
    base_url = "http://localhost:8080"

    print("=" * 60)
    print("🔍 测试管理员API")
    print("=" * 60)

    # 1. 登录
    print("\n1️⃣ 登录获取token...")
    login_data = {"username": "admin", "password": "admin123"}
    response = requests.post(f"{base_url}/api/login", data=login_data)

    if response.status_code != 200:
        print(f"❌ 登录失败: {response.text}")
        return

    data = response.json()
    token = data.get('token')
    print(f"✅ 登录成功! Token: {token[:50]}...")

    # 2. 测试获取用户列表
    print("\n2️⃣ 测试获取用户列表...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{base_url}/api/admin/users", headers=headers)

    print(f"   状态码: {response.status_code}")
    print(f"   响应: {response.text}")

    # 3. 测试获取操作日志
    print("\n3️⃣ 测试获取操作日志...")
    response = requests.get(f"{base_url}/api/admin/logs?limit=10", headers=headers)

    print(f"   状态码: {response.status_code}")
    print(f"   响应: {response.text}")

    # 4. 测试获取统计信息
    print("\n4️⃣ 测试获取统计信息...")
    response = requests.get(f"{base_url}/api/admin/stats", headers=headers)

    print(f"   状态码: {response.status_code}")
    print(f"   响应: {response.text}")

if __name__ == "__main__":
    test_admin_apis()
