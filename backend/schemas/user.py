"""
用户相关的 Pydantic 模式
用于请求/响应数据验证
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


# ==================== 请求模式 ====================

class UserRegister(BaseModel):
    """用户注册请求"""
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    nickname: Optional[str] = Field(None, max_length=50, description="昵称")


class UserLogin(BaseModel):
    """用户登录请求"""
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., description="密码")


class PasswordChange(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., description="旧密码")
    new_password: str = Field(..., min_length=6, max_length=100, description="新密码")


class UserUpdate(BaseModel):
    """更新用户信息请求"""
    nickname: Optional[str] = Field(None, max_length=50, description="昵称")
    avatar_url: Optional[str] = Field(None, max_length=500, description="头像 URL")
    settings_json: Optional[str] = Field(None, max_length=2000, description="用户设置 JSON")


# ==================== 响应模式 ====================

class UserResponse(BaseModel):
    """用户信息响应"""
    id: str
    email: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    settings_json: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """登录成功响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """通用消息响应"""
    message: str
    success: bool = True
