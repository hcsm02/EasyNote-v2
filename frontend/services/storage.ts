/**
 * IndexedDB 本地存储服务
 * 用于在浏览器本地持久化存储任务数据（游客模式）
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, TimeView } from '../types';

// 数据库名称和版本
const DB_NAME = 'easynote-db';
const DB_VERSION = 1;

// 数据库表结构定义
interface EasyNoteDB extends DBSchema {
  // 任务表
  tasks: {
    key: string;           // 任务 ID
    value: Task;           // 任务对象
    indexes: {
      'by-timeframe': TimeView;     // 按时间分类索引
      'by-archived': number;        // 按归档状态索引（0 或 1）
      'by-dueDate': string;         // 按截止日期索引
    };
  };
  // 设置表（存储用户偏好设置）
  settings: {
    key: string;           // 设置项名称
    value: {
      key: string;
      value: unknown;      // 设置值
    };
  };
}

// 数据库实例缓存
let dbInstance: IDBPDatabase<EasyNoteDB> | null = null;

/**
 * 获取数据库实例（单例模式）
 * 如果数据库不存在会自动创建
 */
export async function getDB(): Promise<IDBPDatabase<EasyNoteDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<EasyNoteDB>(DB_NAME, DB_VERSION, {
    // 数据库升级回调（首次创建或版本升级时执行）
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`升级数据库: v${oldVersion} -> v${newVersion}`);

      // 创建任务表
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        // 创建索引以支持高效查询
        taskStore.createIndex('by-timeframe', 'timeframe');
        taskStore.createIndex('by-archived', 'archived');
        taskStore.createIndex('by-dueDate', 'dueDate');
      }

      // 创建设置表
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
    // 数据库被其他标签页阻止时的回调
    blocked() {
      console.warn('数据库被其他标签页阻止，请关闭其他标签页');
    },
    // 数据库阻止其他标签页时的回调
    blocking() {
      console.warn('当前标签页阻止了数据库升级');
      // 关闭当前连接以允许升级
      dbInstance?.close();
      dbInstance = null;
    },
  });

  return dbInstance;
}

// ==================== 任务操作 ====================

/**
 * 获取所有任务
 */
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDB();
  return db.getAll('tasks');
}

/**
 * 根据时间分类获取任务
 */
export async function getTasksByTimeframe(timeframe: TimeView): Promise<Task[]> {
  const db = await getDB();
  return db.getAllFromIndex('tasks', 'by-timeframe', timeframe);
}

/**
 * 获取未归档的任务
 */
export async function getActiveTasks(): Promise<Task[]> {
  const db = await getDB();
  const allTasks = await db.getAll('tasks');
  return allTasks.filter(task => !task.archived);
}

/**
 * 获取已归档的任务
 */
export async function getArchivedTasks(): Promise<Task[]> {
  const db = await getDB();
  const allTasks = await db.getAll('tasks');
  return allTasks.filter(task => task.archived);
}

/**
 * 根据 ID 获取单个任务
 */
export async function getTaskById(id: string): Promise<Task | undefined> {
  const db = await getDB();
  return db.get('tasks', id);
}

/**
 * 添加单个任务
 */
export async function addTask(task: Task): Promise<string> {
  const db = await getDB();
  await db.add('tasks', task);
  return task.id;
}

/**
 * 批量添加任务
 */
export async function addTasks(tasks: Task[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  await Promise.all([
    ...tasks.map(task => tx.store.add(task)),
    tx.done
  ]);
}

/**
 * 更新任务
 */
export async function updateTask(task: Task): Promise<void> {
  const db = await getDB();
  await db.put('tasks', task);
}

/**
 * 批量更新任务
 */
export async function updateTasks(tasks: Task[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  await Promise.all([
    ...tasks.map(task => tx.store.put(task)),
    tx.done
  ]);
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tasks', id);
}

/**
 * 批量删除任务
 */
export async function deleteTasks(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  await Promise.all([
    ...ids.map(id => tx.store.delete(id)),
    tx.done
  ]);
}

/**
 * 清空所有任务
 */
export async function clearAllTasks(): Promise<void> {
  const db = await getDB();
  await db.clear('tasks');
}

/**
 * 保存所有任务（覆盖模式）
 * 先清空再批量插入
 */
export async function saveAllTasks(tasks: Task[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  await tx.store.clear();
  await Promise.all([
    ...tasks.map(task => tx.store.add(task)),
    tx.done
  ]);
}

// ==================== 设置操作 ====================

/**
 * 获取设置项
 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value as T | undefined;
}

/**
 * 保存设置项
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

/**
 * 删除设置项
 */
export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', key);
}

// ==================== 工具函数 ====================

/**
 * 检查 IndexedDB 是否可用
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * 获取数据库存储使用情况
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return null;
}

/**
 * 导出所有数据（用于备份）
 */
export async function exportAllData(): Promise<{ tasks: Task[]; settings: Record<string, unknown> }> {
  const db = await getDB();
  const tasks = await db.getAll('tasks');
  const settingsArray = await db.getAll('settings');
  
  const settings: Record<string, unknown> = {};
  settingsArray.forEach(item => {
    settings[item.key] = item.value;
  });

  return { tasks, settings };
}

/**
 * 导入数据（用于恢复）
 */
export async function importData(data: { tasks: Task[]; settings?: Record<string, unknown> }): Promise<void> {
  const db = await getDB();
  
  // 导入任务
  if (data.tasks && data.tasks.length > 0) {
    const tx = db.transaction('tasks', 'readwrite');
    await Promise.all([
      ...data.tasks.map(task => tx.store.put(task)),
      tx.done
    ]);
  }

  // 导入设置
  if (data.settings) {
    const tx = db.transaction('settings', 'readwrite');
    await Promise.all([
      ...Object.entries(data.settings).map(([key, value]) => 
        tx.store.put({ key, value })
      ),
      tx.done
    ]);
  }
}
