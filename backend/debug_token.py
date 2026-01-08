#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
详细测试token
"""

import requests

def debug_token():
    """调试token问题"""
    base_url = "http://localhost:8080"

    print("=" * 60)
    print("🔑 调试Token")
    print("=" * 60)

    # 1. 登录
    print("\n1️⃣ 登录...")
    login_url = f"{base_url}/api/login"
    login_data = {"username": "admin", "password": "admin123"}

    response = requests.post(login_url, data=login_data)
    print(f"登录状态码: {response.status_code}")

    if response.status_code != 200:
        print(f"登录失败: {response.text}")
        return

    data = response.json()
    token = data.get('token')
    print(f"Token: {token}")
    print(f"Token长度: {len(token)}")
    print(f"Token前50字符: {token[:50]}")

    # 分析token结构
    parts = token.split(':')
    print(f"Token分割结果: {parts}")
    print(f"分割部分数: {len(parts)}")

    # 2. 测试token验证
    print("\n2️⃣ 测试token验证...")
    test_url = f"{base_url}/api/admin/stats"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    print(f"请求头: {headers}")
    response = requests.get(test_url, headers=headers)
    print(f"响应状态码: {response.status_code}")
    print(f"响应内容: {response.text}")

if __name__ == "__main__":
    debug_token()
