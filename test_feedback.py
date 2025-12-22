#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试反馈功能
"""

import requests

def test_feedback():
    """测试反馈提交"""
    base_url = "http://localhost:8080"

    print("=" * 60)
    print("💬 测试反馈功能")
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

    # 2. 提交反馈
    print("\n2️⃣ 提交反馈...")
    files = {
        'feedback_type': (None, 'suggestion'),
        'rating': (None, '5'),
        'title': (None, '测试反馈功能'),
        'description': (None, '这是一个测试反馈，功能运行正常！'),
        'contact_email': (None, 'test@example.com'),
        'auth_token': (None, token)
    }
    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = requests.post(f"{base_url}/api/feedback", files=files, headers=headers)
    print(f"   状态码: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ 反馈提交成功: {result}")
    else:
        print(f"   ❌ 反馈提交失败: {response.text}")

    # 3. 获取反馈列表
    print("\n3️⃣ 获取反馈列表...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{base_url}/api/admin/feedbacks?limit=10", headers=headers)

    print(f"   状态码: {response.status_code}")
    if response.status_code == 200:
        feedbacks = response.json()
        print(f"   ✅ 获取反馈成功，共 {len(feedbacks)} 条")
        for f in feedbacks:
            print(f"   - ID:{f['id']} {f['username']} {f['title']}")
    else:
        print(f"   ❌ 获取反馈失败: {response.text}")

if __name__ == "__main__":
    test_feedback()
