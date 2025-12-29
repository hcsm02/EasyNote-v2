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

# ==================== 动态配置 ====================
# 使用 settings 中的配置，支持环境变量覆盖
def get_ai_config(provider: Optional[str] = None) -> dict:
    """
    获取指定提供商的 AI 配置
    """
    # 使用指定的或默认的提供商
    provider = (provider or settings.AI_DEFAULT_PROVIDER).lower()
    
    # 根据提供商获取配置
    if provider == "gemini":
        return {
            "provider": "gemini",
            "api_key": settings.GEMINI_API_KEY,
            "model": settings.GEMINI_MODEL,
            "base_url": settings.GEMINI_BASE_URL,
        }
    elif provider == "openai":
        return {
            "provider": "openai",
            "api_key": settings.OPENAI_API_KEY,
            "model": settings.OPENAI_MODEL,
            "base_url": settings.OPENAI_BASE_URL,
        }
    elif provider == "siliconflow":
        return {
            "provider": "siliconflow",
            "api_key": settings.SILICONFLOW_API_KEY,
            "model": settings.SILICONFLOW_MODEL,
            "base_url": settings.SILICONFLOW_BASE_URL,
        }
    elif provider == "deepseek":
        return {
            "provider": "deepseek",
            "api_key": settings.DEEPSEEK_API_KEY,
            "model": settings.DEEPSEEK_MODEL,
            "base_url": settings.DEEPSEEK_BASE_URL,
        }
    
    # 兜底返回 (默认 Gemini)
    return {
        "provider": "gemini",
        "api_key": settings.GEMINI_API_KEY,
        "model": settings.GEMINI_MODEL,
        "base_url": settings.GEMINI_BASE_URL,
    }


def get_available_providers() -> List[dict]:
    """获取所有已配置 API Key 的可用提供商"""
    # 统一列表
    providers = ["gemini", "openai", "siliconflow", "deepseek"]
    available = []
    for p_id in providers:
        config = get_ai_config(p_id)
        available.append({
            "id": p_id,
            "available": bool(config["api_key"]),
            "model": config["model"],
        })
    return available


# ==================== Gemini 客户端 ====================

def call_gemini(prompt: str, config: dict) -> str:
    """调用 Google Gemini API"""
    import google.generativeai as genai
    
    # 如果配置了 base_url，则使用 client_options 配置端点
    # 注意：google-generativeai 库的 api_endpoint 通常不需要 https://
    client_kwargs = {"api_key": config["api_key"]}
    if config.get("base_url"):
        endpoint = config["base_url"].replace("https://", "").replace("http://", "").split("/")[0]
        from google.api_core import client_options
        client_kwargs["client_options"] = client_options.ClientOptions(api_endpoint=endpoint)
    
    genai.configure(**client_kwargs)
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
    
    client_kwargs = {"api_key": config["api_key"]}
    if config.get("base_url"):
        endpoint = config["base_url"].replace("https://", "").replace("http://", "").split("/")[0]
        from google.api_core import client_options
        client_kwargs["client_options"] = client_options.ClientOptions(api_endpoint=endpoint)
    
    genai.configure(**client_kwargs)
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
4. isArchived: 状态识别。仅当任务描述明确表示已完成（如使用了“了”、“过”、“完成”、“Done”）时设为 true。注意：即使 dueDate 是过去的时间（如“前天”），如果描述是“打算”、“还没做”、“要做”，isArchived 仍应为 false（表示逾期未完成）。

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
4. Set 'isArchived': true ONLY if the input describes a completed action. Past dates (e.g., "Two days ago I planned to...") do NOT automatically mean isArchived is true if the action itself wasn't finished.

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


async def chat_with_ai(messages: List[dict], task_context: dict, provider: Optional[str] = None) -> str:
    """与 AI 助手聊天"""
    
    # 构建上下文 Prompt
    title = task_context.get("title", "未命名任务")
    details = task_context.get("details", "")
    
    system_instruction = f"""你是一个高效的任务管理助手。
当前任务标题: "{title}"
当前任务详情: "{details}"
请根据以上上下文，简洁、专业地回答用户的提问。保持与用户相同的语言。"""

    # 简单处理：将对话历史拼接为单个 Prompt
    history_str = ""
    for msg in messages:
        role = "用户" if msg["role"] == "user" else "AI"
        history_str += f"{role}: {msg['text']}\n"
    
    full_prompt = f"{system_instruction}\n\n当前对话历史：\n{history_str}\n请回答用户的最新问题。"
    
    try:
        return call_ai(full_prompt, provider)
    except Exception as e:
        print(f"AI 聊天失败: {e}")
        return f"Error: {str(e)}"


async def format_notes(text: str, provider: Optional[str] = None) -> str:
    """美化并结构化笔记内容"""
    if not text.strip():
        return ""
        
    prompt = f"""请美化并结构化以下笔记内容。
核心规则：
1. 保持原语言：输入是中文则输出中文，输入是英文则输出英文。绝对不要进行翻译。
2. 结构化：使用 Markdown（粗体、列表、标题）使其清晰易读。
3. 简洁专业：去除冗余，保持逻辑清晰。

笔记内容：
"{text}"
"""
    try:
        return call_ai(prompt, provider)
    except Exception as e:
        print(f"AI 格式化失败: {e}")
        return text


    try:
        return call_ai_with_audio(audio_base64, mime_type, prompt, provider)
    except Exception as e:
        print(f"AI 语音转录失败: {e}")
        return ""


async def transcribe_audio_simple(audio_base64: str, mime_type: str, provider: Optional[str] = None) -> str:
    """简单的语音转文字（不进行任务解析）"""
    prompt = "准确地转录这段音频内容。只返回转录出的文本，不要有任何多余的解释或开头。"
    try:
        return call_ai_with_audio(audio_base64, mime_type, prompt, provider)
    except Exception as e:
        print(f"AI 语音转录失败: {e}")
        return ""


async def generate_daily_insight(tasks_summary: str, provider: Optional[str] = None) -> str:
    """生成每日 AI 复盘洞察"""
    prompt = f"""你是一个高级、毒辣且贴心的效率教练。
以下是用户最近的任务概况：
"{tasks_summary}"

请根据任务的完成情况、截止日期和内容，给出极其精炼的一句话（20字以内）。
风格要求：
1. 不要官话，要像一个懂我的朋友或者严厉的教练。
2. 可以是幽默的嘲讽、温暖的鼓励或精准的提醒。
3. 必须是一句话。

只返回这一句话的内容，不要有引号。"""
    try:
        response_text = call_ai(prompt, provider)
        # 移除可能的引号和多余空白
        import re
        clean_text = re.sub(r'^["\'\s]+|["\'\s]+$', '', response_text)
        return clean_text
    except Exception as e:
        print(f"AI 生成洞察失败: {e}")
        return "保持节奏，今天也是新的一天。"
