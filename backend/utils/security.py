"""
安全工具
密码哈希和 JWT Token 处理
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from config import get_settings

# 获取配置
settings = get_settings()

# 密码上下文 - 使用 bcrypt 算法
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==================== 密码处理 ====================

def hash_password(password: str) -> str:
    """
    对密码进行哈希处理
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码是否正确
    """
    return pwd_context.verify(plain_password, hashed_password)


# ==================== JWT Token 处理 ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建 JWT Token
    
    Args:
        data: 要编码到 token 中的数据（通常包含用户 ID）
        expires_delta: Token 有效期
    
    Returns:
        编码后的 JWT Token 字符串
    """
    to_encode = data.copy()
    
    # 设置过期时间
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    
    # 编码 token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    解码 JWT Token
    
    Args:
        token: JWT Token 字符串
    
    Returns:
        解码后的数据，如果 token 无效则返回 None
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """
    从 Token 中提取用户 ID
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")
    return None
