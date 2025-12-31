# EasyNote-v2 部署上线指南

本指南将指导您如何将 EasyNote-v2 部署到生产环境（通常是 Linux 云服务器/VPS）。

---

## 方案一：手动部署 (推荐常规 VPS)

采用 **Nginx + Gunicorn + Uvicorn** 的成熟架构。

### 1. 准备工作
- **环境**: Ubuntu 22.04+ 或类似 Linux 系统。
- **环境要求**: Python 3.9+, Node.js 18+。

### 2. 后端部署 (Backend)
1. **源码克隆**:
   ```bash
   git clone <your-repo-url>
   cd EasyNote-v2/backend
   ```
2. **虚拟环境与依赖**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install gunicorn uvloop httptools
   ```
3. **配置环境变量**:
   创建 `.env` 文件，确保 `SECRET_KEY` 和 `ALGORITHM` 已正确配置。
4. **启动生产服务器**:
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --daemon
   ```

### 3. 前端部署 (Frontend)
1. **构建输出**:
   ```bash
   cd ../frontend
   npm install
   # 修改 .env.production 或 api.ts 中的 API 基础路径为生产地址
   npm run build
   ```
   构建完成后，会生成 `dist/` 目录。

### 4. Nginx 配置
安装 Nginx 并建议如下配置站点:
```nginx
server {
    listen 80;
    server_name your-domain.com; # 替换为您的域名

    # 前端静态文件
    location / {
        root /path/to/EasyNote-v2/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 转发
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 方案二：1Panel 图形化面板部署 (极力推荐)

既然您已有 1Panel 环境，部署将变得非常直观：

### 1. 准备代码
- 将 `backend/` 文件夹整体上传到服务器某目录（如 `/opt/easynote/backend`）。
- 在本地执行 `npm run build`，将生成的 `frontend/dist` 文件夹上传到服务器（如 `/opt/easynote/frontend`）。

### 2. 后端部署 (1Panel -> 应用商店/运行环境)
1. **安装 Python 运行环境**: 如果还没安装，在 1Panel 应用商店搜索并安装 Python。
2. **创建应用**: 
   - 选择 Python 环境。
   - 项目路径指向 `backend/`。
   - 启动命令：`gunicorn main:app -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000`。
   - 环境变量：在 1Panel 项目面板中添加 `.env` 内容。

### 3. 前端部署 (1Panel -> 网站 -> 网站)
1. **创建静态网站**: 
   - 网站目录指向您的 `frontend/dist` 文件夹。
2. **配置反向代理**:
   - 在该网站的设置中点击 **[反向代理]** -> **[添加反向代理]**。
   - 代理名称：`api`。
   - 代理地址：`http://127.0.0.1:8000`。
   - 源路径：`/api`。
   - 目标路径：`/api` (或空)。

### 4. 开启证书
- 在网站设置中，利用 1Panel 自带的 Acme 功能，一键申请并开启 HTTPS。

---

## 方案三：Docker 部署 (灵活性更高)
...（保留原方案内容）...

### 5. 💡 特别说明：Gemini API 连接
- 由于生产环境下中转/代理对 HTTP/2 的支持不一，后端已通过 `httpx` 重写了 Gemini 的 **REST 通信逻辑**。
- 即使在复杂的网络环境下，也不会再出现 `403 Forbidden` 错误。

## 安全建议 (重要)
1. **SSL 证书**: 使用 Let's Encrypt (Certbot) 开启 HTTPS。
2. **数据库备份**: 定期备份 `easynote.db` 文件。

---

> [!TIP]
> 如果您需要我为您直接生成 `Dockerfile` 或 `docker-compose.yml`，或者需要特定平台（如阿里云）的详细配置，请告诉我。
