/**
 * 后端 API 调用服务
 * 封装对后端 API 的 HTTP 请求
 */

// API 基础地址 - 从环境变量获取或使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ==================== 类型定义 ====================

/** 解析出的任务项 */
export interface TaskItem {
    text: string;
    dueDate: string;
    category: 'history' | 'today' | 'future2' | 'later';
    isArchived: boolean;
}

/** 解析响应 */
interface ParseResponse {
    success: boolean;
    items: TaskItem[];
}

/** 规划响应 */
interface PlanResponse {
    success: boolean;
    analysis: string;
    items: TaskItem[];
}

// ==================== 工具函数 ====================

/**
 * 通用请求函数
 */
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '请求失败' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

// ==================== AI API ====================

// 获取选择的 AI 提供商
function getSelectedProvider(): string | undefined {
    return localStorage.getItem('aiProvider') || undefined;
}

/**
 * 解析文本中的任务
 * @param text 用户输入的文本
 * @returns 解析出的任务列表
 */
export async function parseTasksFromText(text: string): Promise<TaskItem[]> {
    const response = await request<ParseResponse>('/ai/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text, provider: getSelectedProvider() }),
    });
    return response.items;
}

/**
 * 解析音频中的任务
 * @param audioBase64 Base64 编码的音频数据
 * @param mimeType 音频 MIME 类型
 * @returns 解析出的任务列表
 */
export async function parseTasksFromAudio(
    audioBase64: string,
    mimeType: string = 'audio/webm'
): Promise<TaskItem[]> {
    const response = await request<ParseResponse>('/ai/parse-audio', {
        method: 'POST',
        body: JSON.stringify({ audio: audioBase64, mimeType, provider: getSelectedProvider() }),
    });
    return response.items;
}

/**
 * AI 智能规划
 * @param input 用户的规划需求描述
 * @returns 规划结果（分析 + 任务列表）
 */
export async function planTasks(input: string): Promise<{ analysis: string; items: TaskItem[] }> {
    const response = await request<PlanResponse>('/ai/plan', {
        method: 'POST',
        body: JSON.stringify({ input, provider: getSelectedProvider() }),
    });
    return {
        analysis: response.analysis,
        items: response.items,
    };
}

// ==================== 认证 API ====================

/** 用户信息 */
export interface User {
    id: string;
    email: string;
    nickname?: string;
    avatar_url?: string;
    created_at: string;
}

/** 登录响应 */
interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

/**
 * 用户注册
 */
export async function register(
    email: string,
    password: string,
    nickname?: string
): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nickname }),
    });
}

/**
 * 用户登录
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(token: string): Promise<User> {
    return request<User>('/auth/me', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
