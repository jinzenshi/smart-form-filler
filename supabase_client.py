#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase 客户端配置
用于文件存储功能
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Supabase 配置
SUPABASE_URL = "https://mckoiztgjskrvueconqx.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja29penRnc2tydnVlY29ucXgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY4NjU4MDQ3MCwiZXhwIjoyMDAyMTU2NDcwfQ.LmJ7wLq7bX5K3zC8h3oV9YkGZ5c8h1j6t6r9e5v3z0"

# 创建 Supabase 客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

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
        # 上传文件
        response = supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": content_type} if content_type else {}
        )

        # 获取公共 URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)

        return public_url
    except Exception as e:
        print(f"文件上传失败: {e}")
        raise

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
        response = supabase.storage.from_(bucket_name).list(file_path.split('/')[:-1])
        for item in response:
            if item['name'] == file_path.split('/')[-1]:
                return {
                    'name': item['name'],
                    'id': item['id'],
                    'created_at': item['created_at'],
                    'size': item['metadata']['size'],
                    'public_url': supabase.storage.from_(bucket_name).get_public_url(file_path)
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
