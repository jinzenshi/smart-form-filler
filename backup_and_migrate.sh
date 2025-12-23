#!/bin/bash

echo "================================================"
echo "🚀 执行 Supabase PostgreSQL 数据迁移"
echo "================================================"
echo ""

# 第一步：备份现有数据
echo "📦 第一步：备份现有 SQLite 数据..."
if [ -f "app.db" ]; then
    cp app.db app.db.backup
    echo "✅ 备份完成：app.db → app.db.backup"
    
    # 显示备份文件大小
    ls -lh app.db.backup | awk '{print "   备份文件大小: " $5}'
    echo ""
else
    echo "⚠️  未找到 app.db 文件（可能没有现有数据）"
    echo "   跳过备份步骤..."
    echo ""
fi

# 第三步：安装依赖
echo "📦 第三步：安装依赖包..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装完成"
    echo ""
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 运行迁移工具
echo "🔄 运行数据迁移工具..."
echo ""
python migrate_to_supabase.py

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "🎉 数据迁移完成！"
    echo "================================================"
    echo ""
    echo "📋 下一步操作："
    echo ""
    echo "1️⃣  重新部署到 Render："
    echo "   - 访问 https://render.com"
    echo "   - 选择您的项目"
    echo "   - 点击 'Manual Deploy'"
    echo ""
    echo "2️⃣  测试应用："
    echo "   - 访问您的应用 URL"
    echo "   - 使用 admin / admin123 登录"
    echo "   - 验证所有功能正常"
    echo ""
    echo "📚 详细指南请查看: SUPABASE_MIGRATION_GUIDE.md"
else
    echo "❌ 数据迁移失败"
    echo "请查看错误信息并重试"
    exit 1
fi
