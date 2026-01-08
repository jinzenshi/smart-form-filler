#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重建数据库（添加新字段）
"""

import os
from models import init_db

def rebuild_database():
    """重建数据库"""
    # 删除现有数据库文件
    db_file = "app.db"
    if os.path.exists(db_file):
        os.remove(db_file)
        print(f"✅ 已删除旧数据库文件: {db_file}")

    # 重新初始化数据库
    init_db()
    print("✅ 数据库重建完成")

if __name__ == "__main__":
    rebuild_database()
