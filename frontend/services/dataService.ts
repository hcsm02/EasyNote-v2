/**
 * 统一数据服务层
 * 根据用户登录状态自动选择存储位置（本地 IndexedDB 或云端 API）
 */

import { Task } from '../types';
import * as localStorage from './storage';

// ==================== 类型定义 ====================

/**
 * 存储模式枚举
 */
export enum StorageMode {
    LOCAL = 'local',   // 本地存储（IndexedDB）
    CLOUD = 'cloud',   // 云端存储（API）
}

/**
 * 用户认证状态
 */
export interface AuthState {
    isLoggedIn: boolean;
    userId?: string;
    token?: string;
}

// ==================== 状态管理 ====================

// 当前存储模式（默认本地）
let currentMode: StorageMode = StorageMode.LOCAL;

// 当前认证状态
let authState: AuthState = {
    isLoggedIn: false,
};

/**
 * 获取当前存储模式
 */
export function getStorageMode(): StorageMode {
    return currentMode;
}

/**
 * 设置存储模式
 */
export function setStorageMode(mode: StorageMode): void {
    currentMode = mode;
}

/**
 * 获取认证状态
 */
export function getAuthState(): AuthState {
    return authState;
}

/**
 * 设置认证状态
 */
export function setAuthState(state: AuthState): void {
    authState = state;
    // 根据登录状态自动切换存储模式
    currentMode = state.isLoggedIn ? StorageMode.CLOUD : StorageMode.LOCAL;
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
    return authState.isLoggedIn;
}

// ==================== 任务操作（统一接口） ====================

/**
 * 获取所有任务
 */
export async function getAllTasks(): Promise<Task[]> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.getAllTasks();
    } else {
        // TODO: 实现云端 API 调用
        // return api.getAllTasks();
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.getAllTasks();
    }
}

/**
 * 添加单个任务
 */
export async function addTask(task: Task): Promise<string> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.addTask(task);
    } else {
        // TODO: 实现云端 API 调用
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.addTask(task);
    }
}

/**
 * 批量添加任务
 */
export async function addTasks(tasks: Task[]): Promise<void> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.addTasks(tasks);
    } else {
        // TODO: 实现云端 API 调用
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.addTasks(tasks);
    }
}

/**
 * 更新任务
 */
export async function updateTask(task: Task): Promise<void> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.updateTask(task);
    } else {
        // TODO: 实现云端 API 调用
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.updateTask(task);
    }
}

/**
 * 批量更新任务
 */
export async function updateTasks(tasks: Task[]): Promise<void> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.updateTasks(tasks);
    } else {
        // TODO: 实现云端 API 调用
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.updateTasks(tasks);
    }
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<void> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.deleteTask(id);
    } else {
        // TODO: 实现云端 API 调用
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.deleteTask(id);
    }
}

/**
 * 批量删除任务
 */
export async function deleteTasks(ids: string[]): Promise<void> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.deleteTasks(ids);
    } else {
        // TODO: 实现云端 API 调用
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.deleteTasks(ids);
    }
}

/**
 * 保存所有任务（覆盖模式）
 */
export async function saveAllTasks(tasks: Task[]): Promise<void> {
    if (currentMode === StorageMode.LOCAL) {
        return localStorage.saveAllTasks(tasks);
    } else {
        // TODO: 实现云端 API 调用
        console.warn('云端 API 尚未实现，使用本地存储');
        return localStorage.saveAllTasks(tasks);
    }
}

// ==================== 设置操作 ====================

/**
 * 获取设置项
 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
    // 设置始终存储在本地
    return localStorage.getSetting<T>(key);
}

/**
 * 保存设置项
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
    // 设置始终存储在本地
    return localStorage.setSetting(key, value);
}

// ==================== 数据迁移 ====================

/**
 * 获取本地所有数据（用于登录后上传到云端）
 */
export async function getLocalDataForSync(): Promise<Task[]> {
    return localStorage.getAllTasks();
}

/**
 * 清除本地任务数据（登录同步后可选择清除）
 */
export async function clearLocalTasks(): Promise<void> {
    return localStorage.clearAllTasks();
}

/**
 * 检查本地是否有数据
 */
export async function hasLocalData(): Promise<boolean> {
    const tasks = await localStorage.getAllTasks();
    return tasks.length > 0;
}

// ==================== 导入导出 ====================

/**
 * 导出所有本地数据
 */
export async function exportLocalData(): Promise<{ tasks: Task[]; settings: Record<string, unknown> }> {
    return localStorage.exportAllData();
}

/**
 * 导入数据到本地
 */
export async function importToLocal(data: { tasks: Task[]; settings?: Record<string, unknown> }): Promise<void> {
    return localStorage.importData(data);
}
