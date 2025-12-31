"""
任务数据模型
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Task(Base):
    """任务表"""
    
    __tablename__ = "tasks"
    
    # 主键 - UUID
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 外键 - 关联用户
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # 任务内容
    text = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    
    # 时间相关
    start_date = Column(String(10), nullable=True)  # YYYY-MM-DD 格式
    due_date = Column(String(10), nullable=True)    # YYYY-MM-DD 格式 (截止日期)
    timeframe = Column(String(20), nullable=True)  # history, today, future2, later
    
    # 状态
    archived = Column(Boolean, default=False, index=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Task(id={self.id}, text={self.text[:20]}...)>"
