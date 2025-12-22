#!/bin/bash
# 快速启动脚本

echo "🚀 启动智能填表助手..."

# 初始化数据库
python3 -c "from models import init_db; init_db()"

# 启动服务器
exec python -m uvicorn server_with_auth:app_instance --host 0.0.0.0 --port $PORT
