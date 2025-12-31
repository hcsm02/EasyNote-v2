/**
 * 后端 API 调用服务
 * 封装对后端 API 的 HTTP 请求
 */

// API 基础地址 - 生产环境使用相对路径（前后端同源），开发环境使用完整地址
const API_BASE_URL = import.meta.env.DEV
    ? 'http://localhost:8000/api'
    : '/api';

/** 获取本地存储的 Token */
function getAuthToken(): string | null {
    return localStorage.getItem('token');
}

/** 设置本地存储的 Token */
export function setAuthToken(token: string | null) {
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

// ==================== 类型定义 ====================

/** 解析出的任务项 */
export interface TaskItem {
    text: string;
    startDate?: string;
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
    const token = getAuthToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '请求失败' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

// ==================== AI API ====================

// 获取选择的 AI 提供商
function getSelectedTextProvider(): string | undefined {
    return localStorage.getItem('aiTextProvider') || localStorage.getItem('aiProvider') || undefined;
}

function getSelectedVoiceProvider(): string | undefined {
    return localStorage.getItem('aiVoiceProvider') || localStorage.getItem('aiProvider') || undefined;
}

/**
 * 解析文本中的任务
 * @param text 用户输入的文本
 * @returns 解析出的任务列表
 */
export async function parseTasksFromText(text: string): Promise<TaskItem[]> {
    const response = await request<ParseResponse>('/ai/parse-text', {
        method: 'POST',
        body: JSON.stringify({ text, provider: getSelectedTextProvider() }),
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
        body: JSON.stringify({ audio: audioBase64, mimeType, provider: getSelectedVoiceProvider() }),
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
        body: JSON.stringify({ input, provider: getSelectedTextProvider() }),
    });
    return {
        analysis: response.analysis,
        items: response.items,
    };
}

/**
 * AI 聊天助手
 * @param messages 对话历史
 * @param taskContext 任务上下文
 */
export async function chatWithAI(
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    taskContext: { title: string; details: string }
): Promise<string> {
    const response = await request<{ success: boolean; result: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
            messages,
            taskContext,
            provider: getSelectedTextProvider()
        }),
    });
    return response.result;
}

/**
 * AI 文本格式化
 * @param text 原始内容
 */
export async function formatText(text: string): Promise<string> {
    const response = await request<{ success: boolean; result: string }>('/ai/format', {
        method: 'POST',
        body: JSON.stringify({ text, provider: getSelectedTextProvider() }),
    });
    return response.result;
}

/**
 * 语音转文字（简单转录）
 * @param audioBase64 音频 Base64
 * @param mimeType MIME 类型
 */
export async function transcribeAudioSimple(
    audioBase64: string,
    mimeType: string = 'audio/webm'
): Promise<string> {
    const response = await request<{ success: boolean; result: string }>('/ai/transcribe', {
        method: 'POST',
        body: JSON.stringify({
            audio: audioBase64,
            mimeType,
            provider: getSelectedVoiceProvider()
        }),
    });
    return response.result;
}

// ==================== 认证 API ====================

/** 用户信息 */
export interface User {
    id: string;
    email: string;
    nickname?: string;
    avatar_url?: string;
    settings_json?: string;
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
export async function getCurrentUser(): Promise<User> {
    return request<User>('/auth/me');
}

/**
 * 更新当前用户信息
 */
export async function updateCurrentUser(updates: Partial<User>): Promise<User> {
    return request<User>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

// ==================== 任务管理 API ====================

/** 任务响应对象 */
export interface TaskResponse {
    id: string;
    text: string;
    details?: string;
    start_date?: string;
    due_date?: string;
    timeframe?: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
}

/** 任务列表响应 */
interface TaskListResponse {
    tasks: TaskResponse[];
    total: number;
}

/**
 * 获取云端任务列表
 */
export async function getCloudTasks(params?: { timeframe?: string, archived?: boolean }): Promise<TaskResponse[]> {
    let query = '';
    if (params) {
        const q = new URLSearchParams();
        if (params.timeframe) q.append('timeframe', params.timeframe);
        if (params.archived !== undefined) q.append('archived', String(params.archived));
        query = `?${q.toString()}`;
    }
    const response = await request<TaskListResponse>(`/tasks${query}`);
    return response.tasks;
}

/**
 * 创建云端任务
 */
export async function createCloudTask(task: {
    text: string;
    details?: string;
    start_date?: string;
    due_date?: string;
    timeframe?: string;
    archived?: boolean;
}): Promise<TaskResponse> {
    return request<TaskResponse>('/tasks', {
        method: 'POST',
        body: JSON.stringify(task),
    });
}

/**
 * 更新云端任务
 */
export async function updateCloudTask(id: string, updates: Partial<TaskResponse>): Promise<TaskResponse> {
    return request<TaskResponse>(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

/**
 * 删除云端任务
 */
export async function deleteCloudTask(id: string): Promise<void> {
    await request(`/tasks/${id}`, {
        method: 'DELETE',
    });
}

/**
 * 批量同步本地任务到云端
 */
export async function syncTasksBatch(tasks: any[], strategy: 'merge' | 'replace' = 'merge'): Promise<void> {
    await request('/tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
            tasks: tasks.map(t => ({
                id: t.id,
                text: t.text,
                details: t.details,
                start_date: t.startDate,
                due_date: t.dueDate,
                timeframe: t.timeframe,
                archived: t.archived
            })),
            merge_strategy: strategy
        }),
    });
}

/**
 * 删除所有云端任务
 */
export async function deleteAllCloudTasks(): Promise<void> {
    await request('/tasks', {
        method: 'DELETE',
    });
}
