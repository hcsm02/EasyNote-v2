#!/bin/bash
# EasyNote 服务器初始化脚本
# 在服务器上运行一次即可

set -e

echo "🚀 初始化 EasyNote 部署环境..."

# 创建项目目录
mkdir -p /opt/easynote/data
cd /opt/easynote

# 克隆代码（首次）
if [ ! -d ".git" ]; then
    echo "📥 克隆代码仓库..."
    git clone https://github.com/您的用户名/EasyNote-v2.git .
fi

# 创建环境变量文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境变量文件..."
    cat > .env << 'EOF'
# 请填写以下配置
SECRET_KEY=请替换为32位以上的随机字符串
GEMINI_API_KEY=请替换为您的Gemini密钥
DEBUG=false
ALLOWED_ORIGINS=https://您的域名.com
EOF
    echo "⚠️  请编辑 /opt/easynote/.env 填写正确的配置！"
fi

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker build -t easynote:latest .

# 启动容器
echo "🐳 启动容器..."
docker run -d \
    --name easynote \
    -p 8001:8000 \
    -v /opt/easynote/data:/app/data \
    --env-file .env \
    --restart unless-stopped \
    easynote:latest

echo "✅ 部署完成！请在 1Panel 中配置反向代理指向端口 8001"
