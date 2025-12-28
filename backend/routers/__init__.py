"""
API 路由包
"""

from routers.auth import router as auth_router
from routers.tasks import router as tasks_router
from routers.ai import router as ai_router

__all__ = ["auth_router", "tasks_router", "ai_router"]
