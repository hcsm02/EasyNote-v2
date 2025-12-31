"""
任务相关的 Pydantic 模式
用于请求/响应数据验证
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class TimeframeEnum(str, Enum):
    """时间分类枚举"""
    HISTORY = "history"
    TODAY = "today"
    FUTURE2 = "future2"
    LATER = "later"


# ==================== 请求模式 ====================

class TaskCreate(BaseModel):
    """创建任务请求"""
    id: Optional[str] = Field(None, description="任务 ID (可选，用于同步去重)")
    text: str = Field(..., min_length=1, max_length=1000, description="任务内容")
    details: Optional[str] = Field(None, max_length=5000, description="详细描述")
    start_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="开始日期 YYYY-MM-DD")
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="截止日期 YYYY-MM-DD")
    timeframe: Optional[TimeframeEnum] = Field(None, description="时间分类")
    archived: bool = Field(False, description="是否归档")


class TaskUpdate(BaseModel):
    """更新任务请求"""
    text: Optional[str] = Field(None, min_length=1, max_length=1000, description="任务内容")
    details: Optional[str] = Field(None, max_length=5000, description="详细描述")
    start_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="开始日期 YYYY-MM-DD")
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="截止日期 YYYY-MM-DD")
    timeframe: Optional[TimeframeEnum] = Field(None, description="时间分类")
    archived: Optional[bool] = Field(None, description="是否归档")


class TaskBatchCreate(BaseModel):
    """批量创建任务请求"""
    tasks: List[TaskCreate] = Field(..., min_length=1, max_length=100, description="任务列表")


class TaskSync(BaseModel):
    """同步任务请求（从本地上传到云端）"""
    tasks: List[TaskCreate] = Field(..., description="要同步的任务列表")
    merge_strategy: str = Field("merge", description="合并策略: merge(合并) 或 replace(替换)")


# ==================== 响应模式 ====================

class TaskResponse(BaseModel):
    """任务响应"""
    id: str
    text: str
    details: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    timeframe: Optional[str] = None
    archived: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """任务列表响应"""
    tasks: List[TaskResponse]
    total: int


class TaskBatchResponse(BaseModel):
    """批量操作响应"""
    success: bool
    created_count: int
    task_ids: List[str]
