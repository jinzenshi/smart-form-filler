#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试完整的文档处理流程
"""

import requests
import json

def test_process_api():
    """测试文档处理API"""
    base_url = "http://localhost:8080"

    print("=" * 60)
    print("🧪 测试文档处理API")
    print("=" * 60)

    # 1. 登录获取token
    print("\n1️⃣ 登录获取token...")
    login_url = f"{base_url}/api/login"
    login_data = {"username": "admin", "password": "admin123"}

    try:
        response = requests.post(login_url, data=login_data, timeout=5)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            token = data.get('token')
            print(f"   ✅ 登录成功!")
        else:
            print(f"   ❌ 登录失败: {response.text}")
            return
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
        print("   请确保服务器正在运行")
        return

    # 2. 测试文档处理
    print("\n2️⃣ 测试文档处理API...")
    process_url = f"{base_url}/api/process"

    # 准备测试文件
    try:
        # 读取测试文件
        with open('报名表.docx', 'rb') as f:
            docx_content = f.read()

        with open('个人信息.txt', 'r', encoding='utf-8') as f:
            user_info = f.read()

        print(f"   Word文档大小: {len(docx_content)} 字节")
        print(f"   个人信息长度: {len(user_info)} 字符")

        # 准备表单数据 - 使用 files 包含所有字段（包括token）
        files = {
            'docx': ('报名表.docx', docx_content, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            'user_info_text': (None, user_info),
            'auth_token': (None, token)
        }
        headers = {
            'Authorization': f'Bearer {token}'
        }

        print("\n   正在发送请求...")
        print(f"   表单字段: {list(files.keys())}")
        response = requests.post(process_url, files=files, headers=headers, timeout=60)
        print(f"   响应状态码: {response.status_code}")

        if response.status_code == 200:
            # 保存响应文件
            with open('test_output.docx', 'wb') as f:
                f.write(response.content)
            print(f"   ✅ 处理成功! 响应大小: {len(response.content)} 字节")
            print(f"   📄 输出文件已保存为: test_output.docx")
        else:
            print(f"   ❌ 处理失败!")
            print(f"   响应头: {dict(response.headers)}")
            try:
                error_data = response.json()
                print(f"   错误信息: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                print(f"   响应内容: {response.text[:500]}")

    except FileNotFoundError as e:
        print(f"   ❌ 测试文件未找到: {e}")
        print("   请确保 报名表.docx 和 个人信息.txt 文件存在")
    except requests.exceptions.Timeout:
        print(f"   ⏱️ 请求超时")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
    except Exception as e:
        print(f"   ❌ 其他错误: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 60)
    print("✅ 测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_process_api()
