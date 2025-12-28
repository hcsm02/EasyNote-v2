"""
AI 服务
支持多平台动态切换：Google Gemini、OpenAI、硅基流动、DeepSeek
"""

from config import get_settings
from typing import Optional, List
import json

# 获取配置
settings = get_settings()

# ==================== 默认配置 ====================

# 各平台默认配置
PROVIDER_DEFAULTS = {
    "gemini": {
        "base_url": None,
        "model": "gemini-2.0-flash",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    },
    "siliconflow": {
        "base_url": "https://api.siliconflow.cn/v1",
        "model": "Qwen/Qwen2.5-7B-Instruct",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
    },
}

# API Key 映射
API_KEY_MAP = {
    "gemini": lambda: settings.GEMINI_API_KEY,
    "openai": lambda: settings.OPENAI_API_KEY,
    "siliconflow": lambda: settings.SILICONFLOW_API_KEY,
    "deepseek": lambda: settings.DEEPSEEK_API_KEY,
}


def get_ai_config(provider: Optional[str] = None) -> dict:
    """
    获取指定提供商的 AI 配置
    
    Args:
        provider: 指定的提供商，如果为 None 则使用默认
    """
    # 使用指定的或默认的提供商
    provider = (provider or settings.AI_DEFAULT_PROVIDER).lower()
    
    # 获取该提供商的 API Key
    api_key_getter = API_KEY_MAP.get(provider)
    api_key = api_key_getter() if api_key_getter else ""
    
    # 获取默认配置
    defaults = PROVIDER_DEFAULTS.get(provider, PROVIDER_DEFAULTS["gemini"])
    
    return {
        "provider": provider,
        "api_key": api_key,
        "model": defaults["model"],
        "base_url": defaults["base_url"],
    }


def get_available_providers() -> List[dict]:
    """获取所有已配置 API Key 的可用提供商"""
    available = []
    for provider_id in PROVIDER_DEFAULTS.keys():
        config = get_ai_config(provider_id)
        available.append({
            "id": provider_id,
            "available": bool(config["api_key"]),
            "model": config["model"],
        })
    return available


# ==================== Gemini 客户端 ====================

def call_gemini(prompt: str, config: dict) -> str:
    """调用 Google Gemini API"""
    import google.generativeai as genai
    
    genai.configure(api_key=config["api_key"])
    model = genai.GenerativeModel(config["model"])
    
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            response_mime_type="application/json"
        )
    )
    return response.text


def call_gemini_with_audio(audio_base64: str, mime_type: str, prompt: str, config: dict) -> str:
    """调用 Gemini API 处理音频"""
    import google.generativeai as genai
    
    genai.configure(api_key=config["api_key"])
    model = genai.GenerativeModel(config["model"])
    
    response = model.generate_content(
        [
            {"mime_type": mime_type, "data": audio_base64},
            prompt
        ],
        generation_config=genai.types.GenerationConfig(
            response_mime_type="application/json"
        )
    )
    return response.text


# ==================== OpenAI 兼容客户端 ====================

def call_openai_compatible(prompt: str, config: dict) -> str:
    """调用 OpenAI 兼容接口"""
    from openai import OpenAI
    
    client = OpenAI(
        api_key=config["api_key"],
        base_url=config["base_url"]
    )
    
    response = client.chat.completions.create(
        model=config["model"],
        messages=[
            {"role": "system", "content": "你是一个任务管理助手。请严格返回 JSON 格式。"},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    return response.choices[0].message.content


def call_openai_compatible_with_audio(audio_base64: str, mime_type: str, prompt: str, config: dict) -> str:
    """OpenAI 兼容接口暂不支持音频"""
    print(f"警告：{config['provider']} 暂不支持音频输入")
    return '{"items": []}'


# ==================== 统一调用接口 ====================

def call_ai(prompt: str, provider: Optional[str] = None) -> str:
    """统一 AI 调用接口"""
    config = get_ai_config(provider)
    
    if not config["api_key"]:
        raise ValueError(f"未配置 {config['provider']} 的 API Key")
    
    if config["provider"] == "gemini":
        return call_gemini(prompt, config)
    else:
        return call_openai_compatible(prompt, config)


def call_ai_with_audio(audio_base64: str, mime_type: str, prompt: str, provider: Optional[str] = None) -> str:
    """统一 AI 音频调用接口"""
    config = get_ai_config(provider)
    
    if not config["api_key"]:
        raise ValueError(f"未配置 {config['provider']} 的 API Key")
    
    if config["provider"] == "gemini":
        return call_gemini_with_audio(audio_base64, mime_type, prompt, config)
    else:
        return call_openai_compatible_with_audio(audio_base64, mime_type, prompt, config)


# ==================== 业务函数 ====================

async def parse_tasks_from_text(text: str, today_iso: str, today_str: str, provider: Optional[str] = None) -> List[dict]:
    """解析文本中的任务"""
    
    # 计算相对日期示例
    from datetime import datetime, timedelta
    today = datetime.strptime(today_iso, "%Y-%m-%d")
    tomorrow = (today + timedelta(days=1)).strftime("%Y-%m-%d")
    day_after = (today + timedelta(days=2)).strftime("%Y-%m-%d")
    
    prompt = f"""你是一个任务提取助手。今天是 {today_str}（{today_iso}）。

用户输入: "{text}"

请从输入中提取任务，并解析日期词语为具体日期：
- "今天"、"今日" → {today_iso}
- "明天"、"明日" → {tomorrow}
- "后天" → {day_after}
- 如有具体日期，如"12月30日"，转换为 YYYY-MM-DD
- 如果没有提到时间，默认为今天

规则：
1. text: 只保留任务内容，移除时间词语（如"今天开发应用" → "开发应用"）
2. dueDate: 必须是 YYYY-MM-DD 格式
3. category: 根据 dueDate 判断 - 'today'(今天) / 'future2'(1-2天内) / 'later'(更远) / 'history'(过去)
4. isArchived: 任务是否已完成，默认 false

严格返回 JSON:
{{"items": [{{"text": "任务内容", "dueDate": "YYYY-MM-DD", "category": "today", "isArchived": false}}]}}"""

    try:
        response_text = call_ai(prompt, provider)
        result = json.loads(response_text)
        return result.get("items", [])
    except Exception as e:
        print(f"AI 解析任务失败: {e}")
        return [{"text": text, "dueDate": today_iso, "category": "today", "isArchived": False}]


async def parse_tasks_from_audio(audio_base64: str, mime_type: str, today_iso: str, today_str: str, provider: Optional[str] = None) -> List[dict]:
    """从音频中解析任务"""
    
    prompt = f"""Current Time: {today_str} ({today_iso}). Analyze the spoken input.

Task Processor Rules:
1. Extract 'text': Task content only, remove temporal markers.
2. Extract 'dueDate': YYYY-MM-DD, calculate relative to today.
3. Determine 'category': 'history'/'today'/'future2'/'later'.
4. Set 'isArchived': true if stated as finished.

Return JSON: {{"items": [{{"text": "...", "dueDate": "YYYY-MM-DD", "category": "today|future2|later|history", "isArchived": false}}]}}"""

    try:
        response_text = call_ai_with_audio(audio_base64, mime_type, prompt, provider)
        result = json.loads(response_text)
        return result.get("items", [])
    except Exception as e:
        print(f"AI 语音解析失败: {e}")
        return []


async def plan_tasks(user_input: str, today_iso: str, today_str: str, provider: Optional[str] = None) -> dict:
    """AI 智能规划任务"""
    
    prompt = f"""Today: {today_str} ({today_iso}).

User's request: "{user_input}"

You are a productivity assistant. Create a structured task plan.

Return JSON:
{{
    "analysis": "Brief analysis in Chinese",
    "items": [{{"text": "Task", "dueDate": "YYYY-MM-DD", "category": "today|future2|later", "isArchived": false}}]
}}"""

    try:
        response_text = call_ai(prompt, provider)
        return json.loads(response_text)
    except Exception as e:
        print(f"AI 规划失败: {e}")
        return {"analysis": f"抱歉，AI 处理出错: {str(e)}", "items": []}
