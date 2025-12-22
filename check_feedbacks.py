#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查反馈数据
"""

from models import init_db, Feedback, SessionLocal

def check_feedbacks():
    """检查反馈数据"""
    init_db()
    db = SessionLocal()
    try:
        feedbacks = db.query(Feedback).all()
        print(f"数据库中共有 {len(feedbacks)} 条反馈:")
        for f in feedbacks:
            print(f"\n=== 反馈 ID: {f.id} ===")
            print(f"用户: {f.username}")
            print(f"类型: {f.feedback_type}")
            print(f"评分: {f.rating}")
            print(f"标题: {f.title}")
            print(f"描述: {f.description[:100]}...")
            print(f"状态: {f.status}")
            print(f"截图: {f.screenshot_path}")
            print(f"时间: {f.created_at}")
    finally:
        db.close()

if __name__ == "__main__":
    check_feedbacks()
