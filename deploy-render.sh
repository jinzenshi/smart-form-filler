#!/bin/bash

# 智能填表助手 - Render 部署脚本
# 用于快速部署到 Render.com

echo "🚀 智能填表助手 - Render 部署脚本"
echo "=================================="
echo ""

# 检查是否安装了 Git
if ! command -v git &> /dev/null; then
    echo "❌ 错误：未检测到 Git，请先安装 Git"
    exit 1
fi

# 检查是否已初始化 Git 仓库
if [ ! -d ".git" ]; then
    echo "📦 初始化 Git 仓库..."
    git init
fi

# 检查是否有关联的远程仓库
if ! git remote get-url origin &> /dev/null; then
    echo ""
    echo "⚠️  未检测到远程仓库，请先创建 GitHub 仓库并关联："
    echo ""
    echo "1. 访问 https://github.com/new 创建新仓库"
    echo "2. 仓库名建议：smart-form-filler"
    echo "3. 不要初始化 README、.gitignore 或 license"
    echo "4. 创建后复制仓库地址"
    echo ""
    read -p "请输入 GitHub 仓库地址（例：https://github.com/username/smart-form-filler.git）：" repo_url
    echo ""

    if [ -z "$repo_url" ]; then
        echo "❌ 错误：未提供仓库地址"
        exit 1
    fi

    git remote add origin "$repo_url"
    echo "✅ 已关联远程仓库"
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 创建环境变量配置文件..."
    cp .env.example .env
    echo ""
    echo "✅ .env 文件已预配置豆包API密钥，可直接使用"
    echo ""
    echo "ℹ️  API配置信息："
    echo "  - API Key: 5410d463-1115-4320-9279-a5441ce30694"
    echo "  - 模型: doubao-seed-1-6-251015"
    echo "  - 如需更换密钥，请编辑 .env 文件"
    echo ""
    read -p "配置完成后按 Enter 键继续..."
fi

# 检查并提交代码
echo "📤 提交代码到 GitHub..."

# 检查是否有变更
if git diff --quiet && git diff --cached --quiet; then
    echo "ℹ️  没有检测到变更，但仍将推送代码..."
else
    git add .
    git commit -m "🚀 Prepare for Render deployment"
fi

# 推送到 GitHub
echo "正在推送到 GitHub..."
if git branch -M main 2>/dev/null || git branch -M master
then
    echo "已切换到 main 分支"
fi

if git push -u origin main 2>/dev/null || git push -u origin master; then
    echo "✅ 代码已推送到 GitHub"
else
    echo "❌ 推送到 GitHub 失败，请检查网络连接和仓库权限"
    exit 1
fi

echo ""
echo "🎉 代码推送完成！"
echo ""
echo "下一步操作："
echo "1. 访问 https://render.com"
echo "2. 登录您的账号（建议使用 GitHub 登录）"
echo "3. 点击 'New' → 'Web Service'"
echo "4. 选择您的 GitHub 仓库"
echo "5. 配置部署参数（参考 README_DEPLOY.md）"
echo ""
echo "关键配置："
echo "  - Build Command: pip install -r requirements.txt"
echo "  - Start Command: python -m uvicorn server_with_auth:app_instance --host 0.0.0.0 --port \$PORT"
echo "  - Environment: ARK_API_KEY=5410d463-1115-4320-9279-a5441ce30694"
echo "                 MODEL_ENDPOINT=doubao-seed-1-6-251015"
echo ""
echo "部署完成后，访问："
echo "  - 应用地址：https://your-app.onrender.com"
echo "  - 登录地址：https://your-app.onrender.com/login"
echo "  - 管理后台：https://your-app.onrender.com/admin"
echo ""
echo "默认管理员账号："
echo "  - 用户名：admin"
echo "  - 密码：admin123"
echo ""
echo "⚠️  部署后请立即修改管理员密码！"
echo ""
echo "详细部署指南请参考：README_DEPLOY.md"
echo ""
echo "祝您部署顺利！🚀"
