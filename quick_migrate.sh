#!/bin/bash

# =====================================================
# 智能填表系统 - Supabase 快速迁移脚本
# =====================================================

echo "====================================================="
echo "🚀 智能填表系统 - Supabase PostgreSQL 快速迁移"
echo "====================================================="
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python 3，请先安装 Python"
    exit 1
fi

# 检查 SQLite 数据库是否存在
if [ ! -f "app.db" ]; then
    echo "⚠️  警告: 未找到 SQLite 数据库文件 app.db"
    echo "   这意味着您可能没有现有数据需要迁移"
    read -p "是否继续？(y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 安装依赖
echo "📦 安装依赖..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo ""
echo "====================================================="
echo "✅ 依赖安装完成！"
echo "====================================================="
echo ""
echo "📋 下一步操作："
echo ""
echo "1️⃣  在 Supabase 中执行 SQL 脚本："
echo "   - 访问 https://supabase.com/dashboard"
echo "   - 打开 SQL Editor"
echo "   - 复制并执行 supabase_migration.sql"
echo ""
echo "2️⃣  运行数据迁移工具："
echo "   python3 migrate_to_supabase.py"
echo ""
echo "3️⃣  部署到 Render："
echo "   - 访问 https://render.com"
echo "   - 选择您的项目"
echo "   - 点击 'Manual Deploy'"
echo ""
echo "4️⃣  测试应用："
echo "   - 访问您的应用 URL"
echo "   - 使用 admin / admin123 登录"
echo ""
echo "📚 详细指南请查看: SUPABASE_MIGRATION_GUIDE.md"
echo ""
echo "🎉 迁移准备完成！"
