#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 A4 纸张预览功能
"""

import requests
import base64
import json

def test_preview_api():
    """测试预览 API"""
    print("=" * 60)
    print("🧪 测试 A4 纸张预览功能")
    print("=" * 60)

    # 登录获取 token
    print("\n1️⃣ 用户登录...")
    login_url = "http://localhost:8000/api/login"
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    try:
        response = requests.post(login_url, data=login_data)
        if response.status_code == 200:
            result = response.json()
            token = result.get('token')
            print(f"   ✅ 登录成功，获取到 token")
        else:
            print(f"   ❌ 登录失败: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ 登录错误: {e}")
        return

    # 读取测试文件
    print("\n2️⃣ 读取测试文件...")
    try:
        with open('报名表.docx', 'rb') as f:
            docx_content = f.read()
        print(f"   ✅ 报名表.docx 读取成功，大小: {len(docx_content)} 字节")

        with open('user_info.txt', 'r', encoding='utf-8') as f:
            user_info = f.read()
        print(f"   ✅ user_info.txt 读取成功，大小: {len(user_info)} 字符")
    except Exception as e:
        print(f"   ❌ 文件读取失败: {e}")
        return

    # 发送预览请求
    print("\n3️⃣ 发送预览请求...")
    preview_url = "http://localhost:8000/api/process"
    headers = {
        "Authorization": f"Bearer {token}"
    }

    files = {
        "docx": ("报名表.docx", docx_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }

    data = {
        "user_info_text": user_info,
        "auth_token": token,
        "preview": "true"
    }

    try:
        response = requests.post(preview_url, headers=headers, files=files, data=data)
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and result.get('mode') == 'preview':
                data_b64 = result.get('data')
                if data_b64:
                    # 解码 base64 数据
                    decoded_data = base64.b64decode(data_b64)
                    print(f"   ✅ 预览数据生成成功！")
                    print(f"   📊 数据大小: {len(decoded_data)} 字节")
                    print(f"   📄 文件名: {result.get('filename')}")

                    # 保存解码后的文件用于验证
                    with open('preview_output.docx', 'wb') as f:
                        f.write(decoded_data)
                    print(f"   💾 预览文件已保存为: preview_output.docx")

                    print("\n" + "=" * 60)
                    print("✅ 预览 API 测试成功！")
                    print("=" * 60)
                    print("\n📋 测试结果:")
                    print(f"   • 模式: {result.get('mode')}")
                    print(f"   • 文件名: {result.get('filename')}")
                    print(f"   • 数据大小: {len(decoded_data)} 字节")
                    print(f"   • Base64 长度: {len(data_b64)} 字符")
                    print("\n🌐 请访问 http://localhost:8000 查看前端渲染效果")
                    print("   (使用 admin/admin123 登录)")
                    print("=" * 60)
                else:
                    print(f"   ❌ 预览数据为空")
            else:
                print(f"   ❌ 预览失败: {result.get('message')}")
        else:
            print(f"   ❌ 请求失败: {response.status_code}")
            print(f"   响应内容: {response.text}")
    except Exception as e:
        print(f"   ❌ 预览请求错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_preview_api()
