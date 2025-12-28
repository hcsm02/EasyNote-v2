"""
EasyNote 后端配置
从环境变量加载配置
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置类"""
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./easynote.db"
    
    # JWT 配置
    SECRET_KEY: str = "your-super-secret-key-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 小时
    
    # 应用配置
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    
    # AI 配置 - 支持多平台动态切换
    # 每个平台独立配置 API Key
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    SILICONFLOW_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    
    # 默认提供商（前端未选择时使用）
    AI_DEFAULT_PROVIDER: str = "siliconflow"
    
    @property
    def allowed_origins_list(self) -> list[str]:
        """将逗号分隔的域名转换为列表"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()
