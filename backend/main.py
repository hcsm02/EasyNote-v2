import os
import fastapi
from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
from sqlalchemy.orm import Session

from config import get_settings
from database import init_db
from routers import auth_router, tasks_router, ai_router
from utils.deps import get_db, get_current_user_optional
from models.user import User

# 用于验证部署版本的唯一 ID
BOOT_ID = "BOOT-20260104-1150" 

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

@app.get("/api/ping")
async def ping():
    return {"message": "pong", "boot_id": BOOT_ID}

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


@app.get("/api/debug/db")
async def debug_db(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    数据库诊断接口
    返回当前数据库文件的路径、大小及当前登录的用户信息
    """
    from database import engine
    import os
    
    db_url = str(engine.url)
    db_path = "Unknown"
    file_size = -1
    exists = False
    
    if "sqlite" in db_url:
        # 稳健路径解析
        if db_url.startswith("sqlite:////"):
            db_path = "/" + db_url.replace("sqlite:////", "")
        elif db_url.startswith("sqlite:///"):
            db_path = db_url.replace("sqlite:///", "")
        else:
            db_path = db_url.split("sqlite://")[-1]

        if os.path.exists(db_path):
            exists = True
            file_size = os.path.getsize(db_path)
            db_path = os.path.abspath(db_path)
            
    return {
        "boot_id": BOOT_ID,
        "debug_version": "2026-01-04-V2-FIX",  # 用于校验代码是否更新
        "database_url_configured": settings.DATABASE_URL,
        "database_url_actual": db_url,
        "db_file_path": db_path,
        "db_file_exists": exists,
        "db_file_size_bytes": file_size,
        "cwd": os.getcwd(),
        "current_user": {
            "id": current_user.id,
            "email": current_user.email,
            "nickname": current_user.nickname
        } if current_user else None
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
