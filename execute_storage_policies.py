#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 Service Role 执行 Supabase Storage 策略脚本
"""

import requests
import json

# Supabase 配置
SUPABASE_URL = "https://mckoiztgjskrvueconqx.supabase.co"
PROJECT_REF = "mckoiztgjskrvueconqx"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja29penRnc2tydnVlY29ucXgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzY2NDUxMDA4LCJleHAiOjIwODIwMjcwMDh9.YvPTXnOnYSc8xdT888n4QU_Z30E7Xu7iwFOYVgvfw6s"

def execute_sql(sql_query):
    """执行 SQL 查询"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY
    }
    data = {"query": sql_query}

    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200 or response.status_code == 201:
            print(f"   ✅ 成功")
            return True
        else:
            print(f"   ❌ 失败")
            print(f"   响应: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ 执行出错: {e}")
        return False

def main():
    print("🚀 开始使用 Service Role 执行 Storage 策略脚本...")
    print(f"🔑 使用 Service Role Key: {SERVICE_ROLE_KEY[:20]}...")
    print()

    # SQL 策略脚本
    sql_statements = [
        # 启用 RLS
        ("启用 storage.objects RLS", "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;"),

        # 创建策略
        ("创建 Public Access 策略 (SELECT)", """CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));"""),

        ("创建 Public Upload 策略 (INSERT)", """CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));"""),

        ("创建 Public Update 策略 (UPDATE)", """CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']))
WITH CHECK (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));"""),

        ("创建 Public Delete 策略 (DELETE)", """CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));""")
    ]

    # 执行每个 SQL 语句
    failed_count = 0
    for i, (description, sql) in enumerate(sql_statements, 1):
        print(f"\n[{i}/{len(sql_statements)}] {description}")
        if not execute_sql(sql):
            failed_count += 1

    print("\n" + "="*60)
    if failed_count == 0:
        print("✅ 所有 SQL 策略创建成功！")
        print("\n📋 下一步操作：")
        print("   1. 登录 Supabase Dashboard")
        print("   2. 进入 Storage 页面")
        print("   3. 确保以下三个 bucket 设为 Public：")
        print("      - docx-files")
        print("      - user-info")
        print("      - feedback-screenshots")
        print("   4. 测试文件上传功能")
    else:
        print(f"⚠️  部分 SQL 执行失败 ({failed_count} 个失败)")
        print("请检查错误信息并重试")

    return failed_count == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
