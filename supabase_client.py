#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase 客户端配置
用于文件存储功能
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Supabase 配置 - 全新项目
SUPABASE_URL = "https://rttgrvpsmltltegykcsw.supabase.co"
# 使用正确的 service_role key
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dGdydnBzbWx0bHRlZ3lrY3N3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ5Njk2MSwiZXhwIjoyMDgyMDcyOTYxfQ.tGaGPpdQUcxbLHdCuohlf8ZjX781helCmEWihnxX7wo"

# 创建 Supabase 客户端（使用 service_role key）
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def upload_file_to_supabase(file_content: bytes, bucket_name: str, file_path: str, content_type: str = None) -> str:
    """
    上传文件到 Supabase Storage

    Args:
        file_content: 文件二进制内容
        bucket_name: bucket 名称
        file_path: 文件路径
        content_type: 文件 MIME 类型

    Returns:
        公共访问 URL
    """
    try:
        # 上传文件到指定bucket
        bucket = supabase.storage.from_(bucket_name)

        # 构建文件选项
        file_options = {}
        if content_type:
            file_options["content-type"] = content_type

        # 上传文件
        response = bucket.upload(
            path=file_path,
            file=file_content,
            file_options=file_options
        )

        # 使用 SDK 的 get_public_url 方法获取公共URL
        public_url = bucket.get_public_url(file_path)

        print(f"✅ 文件上传成功: {public_url}")
        return public_url

    except Exception as e:
        error_msg = str(e)
        print(f"❌ 文件上传失败: {error_msg}")

        # 提供更详细的错误信息
        if "signature verification failed" in error_msg or "Unauthorized" in error_msg:
            print("\n💡 身份验证错误可能原因：")
            print("   1. SUPABASE_URL 配置错误（URL 不应包含路径后缀）")
            print("   2. 存储桶需要设置为 Public（公共访问）")
            print("   3. 缺少必要的 RLS 策略")
            print("\n📝 检查项目：")
            print("   - SUPABASE_URL 应该是: https://mckoiztgjskrvueconqx.supabase.co")
            print("   - 登录 Supabase Dashboard → Storage → 选择bucket →")
            print("     确保 'Public bucket' 选项已启用")

        raise Exception(f"文件上传失败: {error_msg}")

def delete_file_from_supabase(bucket_name: str, file_path: str) -> bool:
    """
    从 Supabase Storage 删除文件

    Args:
        bucket_name: bucket 名称
        file_path: 文件路径

    Returns:
        是否删除成功
    """
    try:
        response = supabase.storage.from_(bucket_name).remove([file_path])
        return True
    except Exception as e:
        print(f"文件删除失败: {e}")
        return False

def get_file_info(bucket_name: str, file_path: str) -> dict:
    """
    获取文件信息

    Args:
        bucket_name: bucket 名称
        file_path: 文件路径

    Returns:
        文件信息字典
    """
    try:
        bucket = supabase.storage.from_(bucket_name)
        response = bucket.list(file_path.split('/')[:-1])
        for item in response:
            if item['name'] == file_path.split('/')[-1]:
                return {
                    'name': item['name'],
                    'id': item['id'],
                    'created_at': item['created_at'],
                    'size': item['metadata']['size'],
                    'public_url': bucket.get_public_url(file_path)
                }
        return {}
    except Exception as e:
        print(f"获取文件信息失败: {e}")
        return {}

def generate_unique_filename(original_filename: str, prefix: str = "") -> str:
    """
    生成唯一的文件名

    Args:
        original_filename: 原始文件名
        prefix: 文件名前缀

    Returns:
        唯一文件名
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    extension = os.path.splitext(original_filename)[1]
    return f"{prefix}{timestamp}_{unique_id}{extension}"
