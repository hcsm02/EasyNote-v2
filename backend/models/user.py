"""
用户数据模型
"""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    """用户表"""
    
    __tablename__ = "users"
    
    # 主键 - UUID
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 用户信息
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # 用户偏好设置 (JSON 格式存储：模型选择、喝水目标等)
    settings_json = Column(String(2000), nullable=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
