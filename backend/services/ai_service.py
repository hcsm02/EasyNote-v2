"""
AI 服务
支持多平台动态切换：Google Gemini、OpenAI、硅基流动、DeepSeek
"""

from config import get_settings
from typing import Optional, List
import json
from datetime import datetime

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


def clean_json_response(text: str) -> str:
    """清理 AI 返回的 JSON 字符串，特别是去除 Markdown 标记"""
    text = text.strip()
    if '```' in text:
        # 尝试提取 ```json ... ``` 或 ``` ... ``` 之间的内容
        import re
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            return match.group(1).strip()
    return text

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

# ==================== Gemini 客户端 (原生 REST 避坑版) ====================

def call_gemini(prompt: str, config: dict) -> str:
    """直接使用 HTTP 请求调用 Gemini，绕过 SDK 的 gRPC/HTTP2 403 坑"""
    import httpx
    
    api_key = config["api_key"]
    model_name = config["model"]
    base_url = config.get("base_url") or "https://generativelanguage.googleapis.com"
    
    # 规范化 base_url
    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"
    base_url = base_url.rstrip("/")
    
    # 构建请求 URL (支持官方及常见代理路径)
    url = f"{base_url}/v1beta/models/{model_name}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json"
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            # 提取文本内容
            return result['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        print(f"Gemini 原生请求异常: {e}")
        # 尝试备选 URL 格式 (针对某些 v1 路径代理)
        if "v1beta" in url:
            try:
                url_v1 = url.replace("v1beta", "v1")
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(url_v1, json=payload)
                    return response.json()['candidates'][0]['content']['parts'][0]['text']
            except: pass
        raise e


def call_gemini_with_audio(audio_base64: str, mime_type: str, prompt: str, config: dict) -> str:
    """音频版也尝试原生 REST (目前先保持 SDK 或简化逻辑)"""
    # 由于音频处理 Payload 较复杂，暂时沿用 SDK 但加强配置
    import google.generativeai as genai
    client_kwargs = {"api_key": config["api_key"]}
    if config.get("base_url"):
        endpoint = config["base_url"].replace("https://", "").replace("http://", "").split("/")[0]
        from google.api_core import client_options
        client_kwargs["client_options"] = client_options.ClientOptions(api_endpoint=endpoint)
    
    genai.configure(**client_kwargs, transport='rest')
    model = genai.GenerativeModel(config["model"])
    
    response = model.generate_content(
        [{"mime_type": mime_type, "data": audio_base64}, prompt],
        generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
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

def get_calendar_context(today_iso: str) -> str:
    """生成未来 14 天及昨天 (-1) 的日历参考，消除偏移"""
    from datetime import datetime, timedelta
    today = datetime.strptime(today_iso, "%Y-%m-%d")
    
    current_weekday = today.weekday()
    next_monday = today + timedelta(days=(7 - current_weekday))
    next_next_monday = next_monday + timedelta(days=7)
    
    calendar_ref = []
    weekdays_cn = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    
    # 增加昨天作为参考
    yesterday = today - timedelta(days=1)
    calendar_ref.append(f"- {yesterday.strftime('%Y-%m-%d')} 是 {weekdays_cn[yesterday.weekday()]} (昨天, {yesterday.day}号, 历史)")

    for i in range(15):
        d = today + timedelta(days=i)
        tags = []
        if i == 0: tags.append("今天")
        elif i == 1: tags.append("明天")
        elif i == 2: tags.append("后天")
        
        if d < next_monday:
            tags.append("本周")
            tags.append(f"本{weekdays_cn[d.weekday()]}")
        elif d < next_next_monday:
            tags.append("下周")
            tags.append(f"下{weekdays_cn[d.weekday()]}")
        else:
            tags.append("下下周")
        
        tags.append(f"{d.day}号")
        
        tag_str = f"({', '.join(tags)})"
        calendar_ref.append(f"- {d.strftime('%Y-%m-%d')} 是 {weekdays_cn[d.weekday()]} {tag_str}")
    return "\n".join(calendar_ref)


async def parse_tasks_from_text(text: str, today_iso: str, today_str: str, provider: Optional[str] = None) -> List[dict]:
    """解析文本中的任务"""
    calendar_str = get_calendar_context(today_iso)

    # 针对 Gemini 这种对英文指令遵循性更好的模型，使用中英双语 Prompt 增强
    prompt = f"""You are a task extraction assistant. Today is {today_iso} ({today_str}).

USER INPUT: "{text}"

TASK: Extract all tasks and parse dates. Follow these rules STRICTLY:

1. ABSOLUTE CLEANING (CRITICAL):
- The "text" field MUST NOT contain any time words, dates, or logical connectives (e.g., today, yesterday, tomorrow, next week, Monday, 2nd, from..to, or, and).
- text MUST BE pure action.

2. STATE & CATEGORY (CRITICAL):
- IS_ARCHIVED: If the input uses past tense or markers like "了", "已完成", "做完了" (e.g., "昨天部署了"), set isArchived to true.
- CATEGORY: 
  - Date is in the past: "history"
  - Date is today: "today"
  - Date is in next 2 days: "future2"
  - Others: "later"

3. DATE LOOKUP:
{calendar_str}
- "Yesterday": Match the tag "历史" or "昨天" in the table above.
- "A or B": Set startDate to A, dueDate to B.

4. RESPONSE FORMAT (STRICT JSON):
Return ONLY a JSON object with this structure:
{{
  "items": [
    {{
      "text": "Task Content",
      "startDate": "YYYY-MM-DD",
      "dueDate": "YYYY-MM-DD",
      "category": "history|today|future2|later",
      "isArchived": false
    }}
  ]
}}
"""

    try:
        response_text = call_ai(prompt, provider)
        raw_result = json.loads(clean_json_response(response_text))
        
        # 兼容处理：如果 AI 返回的是列表直接作为 items
        raw_items = raw_result.get("items", []) if isinstance(raw_result, dict) else (raw_result if isinstance(raw_result, list) else [])
        
        # 键名规范化映射
        processed_items = []
        for item in raw_items:
            processed = {
                "text": item.get("text") or item.get("content") or "未命名任务",
                "startDate": item.get("startDate") or item.get("start_date") or item.get("dueDate") or item.get("due_date") or today_iso,
                "dueDate": item.get("dueDate") or item.get("due_date") or today_iso,
                "category": item.get("category") or item.get("timeframe") or "today",
                "isArchived": item.get("isArchived") or item.get("archived") or item.get("is_archived") or False
            }
            processed_items.append(processed)
            
        return processed_items
    except Exception as e:
        print(f"AI 解析任务崩溃: {e}")
        return [{"text": text, "startDate": today_iso, "dueDate": today_iso, "category": "today", "isArchived": False}]


async def parse_tasks_from_audio(audio_base64: str, mime_type: str, today_iso: str, today_str: str, provider: Optional[str] = None) -> List[dict]:
    """从音频中解析任务"""
    calendar_str = get_calendar_context(today_iso)
    
    prompt = f"""Current Time: {today_str} ({today_iso}). Analyze the spoken input.
Calendar Reference (Lookup dates/tags here):
{calendar_str}

Task Processor Rules:
1. **text**: Task content only, MANDATORY: Remove ALL time-related words (e.g., "today", "yesterday", "tomorrow", "from...to...").
2. **startDate** and **dueDate**: YYYY-MM-DD. Map terms like 'yesterday' or 'next week' to the tags in the calendar table above.
3. **Archive & Category (CRITICAL)**: 
   - set isArchived to true if the input describes a completed action (e.g., using "了", "已做").
   - if date is in the past, set category to "history".

Return JSON: {{"items": [{{"text": "...", "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD", "category": "history|today|future2|later", "isArchived": false}}]}}"""

    try:
        response_text = call_ai_with_audio(audio_base64, mime_type, prompt, provider)
        raw_result = json.loads(clean_json_response(response_text))
        # 同样进行规范化处理... (复用逻辑或简单处理)
        items = raw_result.get("items", []) if isinstance(raw_result, dict) else []
        for item in items:
            if "startDate" not in item: item["startDate"] = item.get("start_date") or item.get("dueDate") or item.get("due_date") or today_iso
        return items
    except Exception as e:
        print(f"AI 语音解析失败: {e}")
        return [{"text": "语音任务", "startDate": today_iso, "dueDate": today_iso, "category": "today", "isArchived": False}]


async def plan_tasks(user_input: str, today_iso: str, today_str: str, provider: Optional[str] = None) -> dict:
    """AI 智能规划任务"""
    calendar_str = get_calendar_context(today_iso)
    
    prompt = f"""Today is {today_iso} ({today_str}).
Calendar Reference (Lookup dates/tags here, DO NOT calculate):
{calendar_str}

User's request: "{user_input}"

You are a productivity assistant. Create a structured task plan.
Rules:
1. **text (CRITICAL)**: Title MUST BE pure action. REMOVE ALL time words, dates, and logical connectives (e.g. today, yesterday, tomorrow, next week, Monday, 2nd, from..to, or, and).
2. **startDate** and **dueDate**: YYYY-MM-DD. Map terms like 'next week' or '2nd' directly to the labels/tags in the calendar table above.
3. **category**: history, today, future2, or later.
4. **isArchived**: set true for past actions.

Return JSON:
{{
    "analysis": "Brief analysis in Chinese",
    "items": [{{"text": "Clean action title", "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD", "category": "history|today|future2|later", "isArchived": false}}]
}}"""

    try:
        response_text = call_ai(prompt, provider)
        raw_result = json.loads(clean_json_response(response_text))
        
        # 规范化 items
        items = raw_result.get("items", [])
        processed_items = []
        for item in items:
            processed = {
                "text": item.get("text") or "规划任务",
                "startDate": item.get("startDate") or item.get("start_date") or item.get("dueDate") or item.get("due_date") or today_iso,
                "dueDate": item.get("dueDate") or item.get("due_date") or today_iso,
                "category": item.get("category") or "today",
                "isArchived": item.get("isArchived") or False
            }
            processed_items.append(processed)
            
        return {
            "analysis": raw_result.get("analysis", "已生成规划"),
            "items": processed_items
        }
    except Exception as e:
        print(f"AI 规划崩溃: {e}")
        return {"analysis": f"抱歉，规划处理出错: {str(e)}", "items": []}


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
    prompt = f"""你是一个高级、毒辣且贴心的效率教练。今天是 {datetime.now().strftime('%Y-%m-%d')}。
以下是用户最近的任务概况：
"{tasks_summary}"

请根据任务的完成情况、截止日期和内容，给出极其精炼的一句话（20字以内）。
风格要求：
1. 不要官话，要像一个懂我的朋友或者严厉的教练。
2. 可以是幽默的嘲讽、温暖的鼓励或精准的提醒。

严格返回以下 JSON 格式：
{{"insight": "评价内容"}}"""
    try:
        response_text = call_ai(prompt, provider)
        data = json.loads(clean_json_response(response_text))
        return data.get("insight", "保持节奏，今天也是新的一天。")
    except Exception as e:
        print(f"AI 生成洞察失败: {e}")
        return "保持节奏，今天也是新的一天。"
