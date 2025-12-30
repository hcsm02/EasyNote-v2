"""
EasyNote 后端配置
从环境变量加载配置
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置类"""
    
    # 数据库配置 - 使用绝对路径确保持久化
    # 开发环境使用相对路径，生产环境使用 /app/data/
    import os as _os
    _base_dir = _os.path.dirname(_os.path.abspath(__file__))
    _data_dir = _os.path.join(_base_dir, 'data')
    _os.makedirs(_data_dir, exist_ok=True)
    DATABASE_URL: str = f"sqlite:///{_os.path.join(_data_dir, 'easynote.db')}"
    
    # JWT 配置
    SECRET_KEY: str = "your-super-secret-key-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 小时
    
    # 应用配置
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    
    # AI 配置 - 支持多平台动态切换
    # 每个平台独立配置 API Key
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = ""  # 可选，用于代理
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    SILICONFLOW_API_KEY: str = ""
    SILICONFLOW_BASE_URL: str = "https://api.siliconflow.cn/v1"
    SILICONFLOW_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"
    
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    
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
