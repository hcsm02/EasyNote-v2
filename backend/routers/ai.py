"""
AI 相关 API 路由
处理任务解析、语音识别、智能规划等
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from services.ai_service import (
    parse_tasks_from_text,
    parse_tasks_from_audio,
    plan_tasks,
    chat_with_ai,
    format_notes,
    transcribe_audio_simple,
    generate_daily_insight,
    get_ai_config,
)
from config import get_settings

# 创建路由器
router = APIRouter(prefix="/ai", tags=["AI 服务"])

settings = get_settings()


# ==================== 请求/响应模式 ====================

class TaskItem(BaseModel):
    """解析出的任务项"""
    text: str
    startDate: Optional[str] = None
    dueDate: str
    category: str
    isArchived: bool = False


class ParseTextRequest(BaseModel):
    """文本解析请求"""
    text: str = Field(..., min_length=1, max_length=5000, description="要解析的文本")
    provider: Optional[str] = Field(None, description="指定 AI 提供商")


class ParseAudioRequest(BaseModel):
    """音频解析请求"""
    audio: str = Field(..., description="Base64 编码的音频数据")
    mimeType: str = Field(default="audio/webm", description="音频 MIME 类型")
    provider: Optional[str] = Field(None, description="指定 AI 提供商")


class PlanRequest(BaseModel):
    """AI 规划请求"""
    input: str = Field(..., min_length=1, max_length=5000, description="规划需求描述")
    provider: Optional[str] = Field(None, description="指定 AI 提供商")


class ParseResponse(BaseModel):
    """解析响应"""
    success: bool
    items: List[TaskItem]


class PlanResponse(BaseModel):
    """规划响应"""
    success: bool
    analysis: str
    items: List[TaskItem]


class ChatRequest(BaseModel):
    """聊天请求"""
    messages: List[dict] = Field(..., description="对话历史")
    taskContext: dict = Field(..., description="任务上下文 (title, details)")
    provider: Optional[str] = Field(None, description="指定 AI 提供商")


class FormatRequest(BaseModel):
    """格式化请求"""
    text: str = Field(..., description="要格式化的文本")
    provider: Optional[str] = Field(None, description="指定 AI 提供商")


class DailyInsightRequest(BaseModel):
    """每日洞察请求"""
    tasksSummary: str = Field(..., description="任务概况文本")
    provider: Optional[str] = Field(None, description="指定 AI 提供商")


class SimpleResponse(BaseModel):
    """通用简单响应"""
    success: bool
    result: str


class ProviderInfo(BaseModel):
    """AI 提供商信息"""
    id: str
    name: str
    model: str
    available: bool
    supportsAudio: bool


class ProvidersResponse(BaseModel):
    """提供商列表响应"""
    providers: List[ProviderInfo]
    current: str


# ==================== API 端点 ====================

def get_today_info():
    """获取今天的日期信息"""
    today = datetime.now()
    today_iso = today.strftime("%Y-%m-%d")
    today_str = today.strftime("%Y年%m月%d日 %A")
    return today_iso, today_str


@router.post("/parse-text", response_model=ParseResponse)
async def parse_text(request: ParseTextRequest):
    """
    解析文本中的任务
    
    从输入的文本中提取任务，识别日期和时间信息，
    返回结构化的任务列表。
    """
    try:
        today_iso, today_str = get_today_info()
        items = await parse_tasks_from_text(request.text, today_iso, today_str, request.provider)
        
        return ParseResponse(
            success=True,
            items=[TaskItem(**item) for item in items]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 解析失败: {str(e)}"
        )


@router.post("/parse-audio", response_model=ParseResponse)
async def parse_audio(request: ParseAudioRequest):
    """
    解析音频中的任务
    
    从音频输入中识别语音内容，提取任务和日期信息，
    返回结构化的任务列表。
    """
    try:
        today_iso, today_str = get_today_info()
        items = await parse_tasks_from_audio(
            request.audio, 
            request.mimeType, 
            today_iso, 
            today_str,
            request.provider
        )
        
        return ParseResponse(
            success=True,
            items=[TaskItem(**item) for item in items]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"语音解析失败: {str(e)}"
        )


@router.post("/plan", response_model=PlanResponse)
async def create_plan(request: PlanRequest):
    """
    AI 智能规划
    
    根据用户输入的规划需求，生成结构化的任务计划。
    """
    try:
        today_iso, today_str = get_today_info()
        result = await plan_tasks(request.input, today_iso, today_str, request.provider)
        
        return PlanResponse(
            success=True,
            analysis=result.get("analysis", ""),
            items=[TaskItem(**item) for item in result.get("items", [])]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 规划失败: {str(e)}"
        )


@router.post("/chat", response_model=SimpleResponse)
async def chat(request: ChatRequest):
    """与 AI 助手聊天"""
    try:
        result = await chat_with_ai(request.messages, request.taskContext, request.provider)
        return SimpleResponse(success=True, result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/format", response_model=SimpleResponse)
async def format_text(request: FormatRequest):
    """格式化并美化文本"""
    try:
        result = await format_notes(request.text, request.provider)
        return SimpleResponse(success=True, result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe", response_model=SimpleResponse)
async def transcribe(request: ParseAudioRequest):
    """简单的语音转文字"""
    try:
        result = await transcribe_audio_simple(request.audio, request.mimeType, request.provider)
        return SimpleResponse(success=True, result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/daily-insight", response_model=SimpleResponse)
async def daily_insight(request: DailyInsightRequest):
    """获取 AI 每日复盘洞察"""
    try:
        result = await generate_daily_insight(request.tasksSummary, request.provider)
        return SimpleResponse(success=True, result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 平台显示名称映射
PROVIDER_NAMES = {
    "gemini": "Google Gemini",
    "openai": "OpenAI",
    "siliconflow": "硅基流动",
    "deepseek": "DeepSeek",
}


@router.get("/providers", response_model=ProvidersResponse)
async def get_providers():
    """
    获取可用的 AI 提供商列表
    
    返回所有 AI 提供商及其配置状态。
    """
    from services.ai_service import get_available_providers
    
    providers_status = get_available_providers()
    providers = []
    
    for p in providers_status:
        providers.append(ProviderInfo(
            id=p["id"],
            name=PROVIDER_NAMES.get(p["id"], p["id"]),
            model=p["model"],
            available=p["available"],
            supportsAudio=(p["id"] == "gemini")
        ))
    
    return ProvidersResponse(
        providers=providers,
        current=settings.AI_DEFAULT_PROVIDER
    )
