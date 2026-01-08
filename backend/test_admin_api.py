#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试管理员API
"""

import requests
import json
from auth import generate_token

# 首先登录获取token
def login_and_test():
    # 登录获取token
    login_url = "http://localhost:8080/api/login"
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    print("🔐 尝试登录...")
    response = requests.post(login_url, data=login_data)
    print(f"登录响应状态码: {response.status_code}")
    print(f"登录响应内容: {response.text}")

    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        print(f"✅ 登录成功! Token: {token[:50]}...")

        # 测试获取用户列表
        print("\n📋 测试获取用户列表...")
        users_url = "http://localhost:8080/api/admin/users"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(users_url, headers=headers)
        print(f"用户列表响应状态码: {response.status_code}")
        print(f"用户列表响应内容: {response.text}")

        # 测试获取操作日志
        print("\n📝 测试获取操作日志...")
        logs_url = "http://localhost:8080/api/admin/logs?limit=10"
        response = requests.get(logs_url, headers=headers)
        print(f"操作日志响应状态码: {response.status_code}")
        print(f"操作日志响应内容: {response.text[:500]}...")

        # 测试获取统计信息
        print("\n📊 测试获取统计信息...")
        stats_url = "http://localhost:8080/api/admin/stats"
        response = requests.get(stats_url, headers=headers)
        print(f"统计信息响应状态码: {response.status_code}")
        print(f"统计信息响应内容: {response.text}")

    else:
        print("❌ 登录失败")

if __name__ == "__main__":
    login_and_test()
