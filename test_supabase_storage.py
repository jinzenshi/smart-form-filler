#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 Supabase Storage 连接和文件上传
"""

from supabase import create_client
import os

# Supabase 配置 - 全新项目
SUPABASE_URL = "https://rttgrvpsmltltegykcsw.supabase.co"
# 使用正确的 service_role key
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dGdydnBzbWx0bHRlZ3lrY3N3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ5Njk2MSwiZXhwIjoyMDgyMDcyOTYxfQ.tGaGPpdQUcxbLHdCuohlf8ZjX781helCmEWihnxX7wo"

def test_supabase_connection():
    """测试 Supabase 连接"""
    try:
        print("🔌 测试 Supabase 连接...")
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("✅ Supabase 客户端创建成功")
        return supabase
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return None

def test_bucket_access(supabase, bucket_name):
    """测试存储桶访问"""
    try:
        print(f"\n📂 测试存储桶访问: {bucket_name}")
        bucket = supabase.storage.from_(bucket_name)
        print(f"✅ 存储桶 {bucket_name} 访问成功")
        return bucket
    except Exception as e:
        print(f"❌ 存储桶 {bucket_name} 访问失败: {e}")
        return None

def test_file_upload(bucket, file_path, file_name):
    """测试文件上传"""
    try:
        print(f"\n📤 测试文件上传...")
        print(f"   存储桶: {bucket.id}")
        print(f"   文件路径: {file_path}")
        print(f"   文件名: {file_name}")

        # 创建测试内容
        test_content = b"This is a test file content"

        # 上传文件
        response = bucket.upload(
            path=file_path,
            file=test_content,
            file_options={"content-type": "text/plain"}
        )

        print(f"✅ 文件上传成功")
        print(f"   响应: {response}")

        # 获取公共URL
        public_url = bucket.get_public_url(file_path)
        print(f"   公共URL: {public_url}")

        return True
    except Exception as e:
        print(f"❌ 文件上传失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("="*60)
    print("🧪 Supabase Storage 测试")
    print("="*60)

    # 测试连接
    supabase = test_supabase_connection()
    if not supabase:
        return False

    # 测试存储桶
    buckets_to_test = ['docx-files', 'user-info', 'feedback-screenshots']
    success_count = 0

    for bucket_name in buckets_to_test:
        bucket = test_bucket_access(supabase, bucket_name)
        if bucket:
            # 测试上传
            test_file_path = f"test/{bucket_name}_test_file.txt"
            if test_file_upload(bucket, test_file_path, f"{bucket_name}_test_file.txt"):
                success_count += 1

    print("\n" + "="*60)
    print(f"📊 测试结果: {success_count}/{len(buckets_to_test)} 个存储桶成功")
    print("="*60)

    return success_count > 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
