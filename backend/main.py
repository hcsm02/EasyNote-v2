"""
EasyNote 后端入口
FastAPI 应用配置和启动
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from config import get_settings
from database import init_db
from routers import auth_router, tasks_router, ai_router

# 获取配置
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    启动时初始化数据库，关闭时清理资源
    """
    # 启动时执行
    print("🚀 EasyNote 后端启动中...")
    init_db()
    print("✅ 数据库初始化完成")
    
    yield  # 应用运行中
    
    # 关闭时执行
    print("👋 EasyNote 后端关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title="EasyNote API",
    description="轻量级智能任务管理应用后端 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,  # 生产环境禁用 Swagger
    redoc_url="/redoc" if settings.DEBUG else None,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(ai_router, prefix="/api")


@app.get("/api/info")
async def api_info():
    """
    API 信息（原根路径移至此处，以便前端静态文件托管）
    """
    return {
        "message": "EasyNote API 运行中",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "已禁用"
    }


@app.get("/health")
async def health_check():
    """
    健康检查接口
    """
    return {"status": "healthy"}


# 托管静态文件 (用于单容器部署)
# 检查是否存在 static 目录（由 Docker 构建或手动放入）
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
