#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 PostgreSQL 直接连接执行 Storage 策略脚本
"""

import psycopg2
from psycopg2 import sql

# Supabase 数据库连接信息
DATABASE_URL = "postgresql://postgres.mckoiztgjskrvueconqx:jinzenshi996@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

def execute_sql(cursor, sql_query, description):
    """执行单个 SQL 查询"""
    try:
        print(f"\n[{description}]")
        print(f"SQL: {sql_query[:100]}...")
        cursor.execute(sql_query)
        cursor.execute("COMMIT")  # 确保事务提交
        print("✅ 成功")
        return True
    except psycopg2.Error as e:
        print(f"❌ 失败: {e.pgerror[:200] if e.pgerror else str(e)}")
        cursor.execute("ROLLBACK")
        return False

def main():
    print("🚀 开始使用 PostgreSQL 连接执行 Storage 策略脚本...")
    print(f"📡 连接: {DATABASE_URL.split('@')[1]}")
    print()

    try:
        # 连接数据库
        conn = psycopg2.connect(DATABASE_URL)
        conn.set_isolation_level(0)  # 允许 DDL 操作
        cursor = conn.cursor()

        # SQL 策略脚本
        sql_statements = [
            ("启用 storage.objects RLS", "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;"),

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
        for description, sql_query in sql_statements:
            if not execute_sql(cursor, sql_query, description):
                failed_count += 1

        # 关闭连接
        cursor.close()
        conn.close()

        print("\n" + "="*60)
        if failed_count == 0:
            print("✅ 所有 Storage 策略创建成功！")
            print("\n📋 下一步操作：")
            print("   1. 登录 https://app.supabase.com")
            print("   2. 进入 Project → Storage 页面")
            print("   3. 确保以下三个 bucket 设为 Public：")
            print("      - docx-files")
            print("      - user-info")
            print("      - feedback-screenshots")
            print("   4. 测试文件上传功能")
        else:
            print(f"⚠️  部分策略创建失败 ({failed_count} 个失败)")

        return failed_count == 0

    except Exception as e:
        print(f"\n❌ 连接或执行失败: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
