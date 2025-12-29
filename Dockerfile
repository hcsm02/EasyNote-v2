# 多阶段构建：前端 + 后端 合体镜像
# 第一阶段：构建前端
FROM node:18-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 第二阶段：构建后端并整合
FROM python:3.9-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn uvicorn

COPY backend/ .
# 从第一阶段拷贝构建好的前端文件到后端的 static 目录
COPY --from=frontend-builder /app/frontend/dist ./static

EXPOSE 8000
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
