
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { TimeView, Task, InputMode, AppView } from './types';
import TimeSwitcher from './components/TimeSwitcher';
import MainCard from './components/MainCard';
import BottomBar from './components/BottomBar';
import ArchiveButton from './components/ArchiveButton';
import RevertButton from './components/RevertButton';
import DeleteButton from './components/DeleteButton';
import AIPlanningPanel from './components/AIPlanningPanel';
import TaskDetailPanel from './components/TaskDetailPanel';
import CalendarView from './components/CalendarView';
import AIProviderSelector from './components/AIProviderSelector';
import AuthPanel from './components/AuthPanel';
import {
  parseTasksFromText,
  parseTasksFromAudio,
  getCurrentUser,
  setAuthToken,
  syncTasksBatch,
  getCloudTasks,
  createCloudTask,
  updateCloudTask,
  deleteCloudTask,
  TaskResponse
} from './services/api';
import { User } from './services/api';
import { getAllTasks, saveAllTasks, isIndexedDBAvailable } from './services/storage';

const App: React.FC = () => {
  // 任务状态 - 初始为空，从本地存储加载
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [waterCount, setWaterCount] = useState(1);
  const waterTarget = 8;

  const [currentTimeView, setCurrentTimeView] = useState<TimeView>(TimeView.TODAY);
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [currentAppView, setCurrentAppView] = useState<AppView>('active');
  const [isAIPlanningOpen, setIsAIPlanningOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draftTask, setDraftTask] = useState<Task | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // AI 每日洞察状态
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [hasUnreadInsight, setHasUnreadInsight] = useState(false);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const fetchDailyInsight = useCallback(async () => {
    if (!isAIAvailable || tasks.length === 0) return;

    setIsInsightLoading(true);
    try {
      // 准备任务简报
      const activeCount = tasks.filter(t => !t.archived).length;
      const todayISO = new Date().toISOString().split('T')[0];
      const archivedToday = tasks.filter(t => t.archived && t.dueDate === todayISO).length;
      const topTasks = tasks.filter(t => !t.archived).slice(0, 5).map(t => t.text).join(', ');

      const summary = `当前有 ${activeCount} 个待办任务，今天已完成 ${archivedToday} 个。前几个任务包含: ${topTasks}`;

      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
      const response = await fetch(`${API_BASE}/ai/daily-insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasksSummary: summary })
      });

      if (response.ok) {
        const data = await response.json();
        setDailyInsight(data.result);
        setHasUnreadInsight(true);
        // 持久化今天的复盘，避免重复获取
        localStorage.setItem('lastInsightDate', todayISO);
        localStorage.setItem('lastInsightContent', data.result);
      }
    } catch (err) {
      console.error('获取每日洞察失败:', err);
    } finally {
      setIsInsightLoading(false);
    }
  }, [isAIAvailable, tasks]);

  // 检查每日洞察
  useEffect(() => {
    if (!isDataLoaded || !isAIAvailable) return;

    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('lastInsightDate');
    const lastContent = localStorage.getItem('lastInsightContent');

    if (lastDate === today && lastContent) {
      setDailyInsight(lastContent);
      const seen = localStorage.getItem('lastInsightSeen') === today;
      setHasUnreadInsight(!seen);
    } else {
      if (tasks.length > 0) {
        fetchDailyInsight();
      }
    }
  }, [isDataLoaded, isAIAvailable, tasks.length]);

  const handleShowInsight = () => {
    if (dailyInsight) {
      if ('vibrate' in navigator) navigator.vibrate(10);
      alert(`🤖 AI 每日复盘：\n\n"${dailyInsight}"`);
      setHasUnreadInsight(false);
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('lastInsightSeen', today);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 从本地存储加载任务
  useEffect(() => {
    const loadTasks = async () => {
      // 检查 Token 并获取用户信息
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          // 如果已登录，尝试从云端拉取最新数据（或者在此决定同步策略）
        } catch (err) {
          console.error('自动登录失败:', err);
          setAuthToken(null);
        }
      }

      if (!isIndexedDBAvailable()) {
        console.warn('IndexedDB 不可用，数据将无法持久化');
        setIsDataLoaded(true);
        return;
      }
      try {
        const storedTasks = await getAllTasks();
        if (storedTasks.length > 0) {
          setTasks(storedTasks);
        }
      } catch (error) {
        console.error('加载任务失败:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadTasks();
  }, []);

  // 数据变化时自动保存
  useEffect(() => {
    // 只有在数据加载完成后才保存，避免覆盖本地数据
    if (!isDataLoaded) return;

    const saveTasks = async () => {
      try {
        await saveAllTasks(tasks);
      } catch (error) {
        console.error('保存任务失败:', error);
      }
    };
    saveTasks();
  }, [tasks, isDataLoaded]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 检测 AI 是否可用
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const response = await fetch(`${API_BASE}/ai/providers`);
        if (response.ok) {
          const data = await response.json();
          const selectedProvider = localStorage.getItem('aiProvider') || data.current;
          const provider = data.providers.find((p: any) => p.id === selectedProvider);
          setIsAIAvailable(provider?.available || false);
        }
      } catch {
        setIsAIAvailable(false);
      }
    };
    checkAIStatus();
    // 每30秒检查一次
    const interval = setInterval(checkAIStatus, 30000);
    return () => clearInterval(interval);
  }, [isAISettingsOpen]); // 在设置面板关闭后重新检查

  useEffect(() => {
    if (inputMode === 'voice' && !isAIPlanningOpen && !editingTaskId) {
      startRecording();
    } else if (inputMode !== 'voice' && isRecording) {
      stopRecording(false);
    }
  }, [inputMode, isAIPlanningOpen, editingTaskId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioChunksRef.current.length > 0) {
          await handleVoiceUpload(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setInputMode('none');
    }
  };

  const stopRecording = (process: boolean = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!process) audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const filteredTasks = useMemo(() => {
    if (currentAppView === 'archived') {
      return tasks.filter(t => t.archived);
    }
    return tasks.filter(t => !t.archived && t.timeframe === currentTimeView);
  }, [tasks, currentTimeView, currentAppView]);

  const toggleTaskSelection = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const calculateTimeframe = (dateISO: string): TimeView => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateISO);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return TimeView.HISTORY;
    if (diffDays === 0) return TimeView.TODAY;
    if (diffDays <= 2) return TimeView.FUTURE2;
    return TimeView.LATER;
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        if (updates.dueDate) {
          updated.timeframe = calculateTimeframe(updates.dueDate);
        }
        return updated;
      }
      return t;
    }));

    // 同步到云端
    if (user) {
      try {
        const backendUpdates: any = {};
        if (updates.text !== undefined) backendUpdates.text = updates.text;
        if (updates.details !== undefined) backendUpdates.details = updates.details;
        if (updates.dueDate !== undefined) backendUpdates.due_date = updates.dueDate;
        if (updates.archived !== undefined) backendUpdates.archived = updates.archived;

        const taskToUpdate = tasks.find(t => t.id === id);
        if (taskToUpdate && updates.dueDate) {
          backendUpdates.timeframe = calculateTimeframe(updates.dueDate);
        }

        await updateCloudTask(id, backendUpdates);
      } catch (err) {
        console.error('云端更新失败:', err);
      }
    }
  };

  const handleArchiveSelected = async () => {
    const selectedIds = tasks.filter(t => t.selected).map(t => t.id);
    setTasks(prev => prev.map(t => t.selected ? { ...t, archived: true, selected: false } : t));

    if (user) {
      try {
        await Promise.all(selectedIds.map(id => updateCloudTask(id, { archived: true })));
      } catch (err) {
        console.error('批量归档失败:', err);
      }
    }
  };

  const handleRevertSelected = async () => {
    const selectedIds = tasks.filter(t => t.selected).map(t => t.id);
    setTasks(prev => prev.map(t => t.selected && t.archived ? { ...t, archived: false, selected: false } : t));
    setCurrentAppView('active');

    if (user) {
      try {
        await Promise.all(selectedIds.map(id => updateCloudTask(id, { archived: false })));
      } catch (err) {
        console.error('批量撤销归档失败:', err);
      }
    }
  };

  const handleDeleteSelected = async () => {
    const selectedIds = tasks.filter(t => t.selected).map(t => t.id);
    setTasks(prev => prev.filter(t => !t.selected));

    if (user) {
      try {
        await Promise.all(selectedIds.map(id => deleteCloudTask(id)));
      } catch (err) {
        console.error('批量删除失败:', err);
      }
    }
  };

  const handleDirectAddTask = async (text: string, dateISO: string) => {
    const timeframe = calculateTimeframe(dateISO);

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      details: '',
      createdAt: Date.now(),
      dueDate: dateISO,
      timeframe,
      selected: false,
      archived: false
    };

    setTasks(prev => [...prev, newTask]);

    if (user) {
      try {
        const response = await createCloudTask({
          text: newTask.text,
          details: newTask.details,
          due_date: newTask.dueDate,
          timeframe: newTask.timeframe,
          archived: newTask.archived
        });
        // 更新本地 ID 为云端生成的 ID
        setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, id: response.id } : t));
      } catch (err) {
        console.error('云端创建失败:', err);
      }
    }
  };

  const handleCreateNew = () => {
    const today = new Date().toISOString().split('T')[0];
    const newDraft: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      details: '',
      createdAt: Date.now(),
      dueDate: today,
      timeframe: TimeView.TODAY,
      selected: false,
      archived: false
    };
    setDraftTask(newDraft);
  };

  const handleAuthSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsAuthOpen(false);

    // 登录后同步本地数据到云端
    setIsSyncing(true);
    try {
      const localTasks = await getAllTasks();
      if (localTasks.length > 0) {
        // 简单策略：将本地数据合并到云端
        await syncTasksBatch(localTasks, 'merge');
      }

      // 同步完成后从云端重新拉取完整列表
      const cloudTasks = await getCloudTasks();
      const unifiedTasks: Task[] = cloudTasks.map(ct => ({
        id: ct.id,
        text: ct.text,
        details: ct.details || '',
        createdAt: new Date(ct.created_at).getTime(),
        dueDate: ct.due_date || new Date().toISOString().split('T')[0],
        timeframe: (ct.timeframe as TimeView) || TimeView.TODAY,
        selected: false,
        archived: ct.archived
      }));
      setTasks(unifiedTasks);
    } catch (err) {
      console.error('同步失败:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    // 登出后保留本地数据，不做额外处理
  };

  const handleVoiceUpload = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      const base64Audio = await blobToBase64(audioBlob);
      // 调用后端 AI API
      const items = await parseTasksFromAudio(base64Audio, 'audio/webm');
      if (items.length > 0) {
        addMultipleTasks(items);
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
      setInputMode('none');
    }
  };

  const handleAddTask = async (text: string) => {
    if (!text.trim() || isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      // 调用后端 AI API
      const items = await parseTasksFromText(text);
      if (items.length > 0) {
        addMultipleTasks(items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
      setInputValue('');
      setInputMode('none');
    }
  };

  const addMultipleTasks = async (items: Array<{ text: string, dueDate: string, category: string, isArchived: boolean }>) => {
    const newTasks: Task[] = items.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      text: item.text,
      details: '',
      createdAt: Date.now(),
      dueDate: item.dueDate,
      timeframe: item.category as TimeView,
      selected: false,
      archived: item.isArchived
    }));

    setTasks(prev => [...prev, ...newTasks]);

    if (user) {
      try {
        await syncTasksBatch(newTasks, 'merge');
        // 为了方便，批量添加后直接重新拉取云端数据，确保 ID 同步
        const cloudTasks = await getCloudTasks();
        const unifiedTasks: Task[] = cloudTasks.map(ct => ({
          id: ct.id,
          text: ct.text,
          details: ct.details || '',
          createdAt: new Date(ct.created_at).getTime(),
          dueDate: ct.due_date || new Date().toISOString().split('T')[0],
          timeframe: (ct.timeframe as TimeView) || TimeView.TODAY,
          selected: false,
          archived: ct.archived
        }));
        setTasks(unifiedTasks);
      } catch (err) {
        console.error('批量同步失败:', err);
      }
    }

    const pendingItems = items.filter(i => !i.isArchived);
    if (pendingItems.length > 0) {
      setCurrentTimeView(pendingItems[0].category as TimeView);
      setCurrentAppView('active');
    } else if (items.length > 0) {
      setCurrentAppView('archived');
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
  const weekday = currentTime.toLocaleDateString('en-US', { weekday: 'short' });

  const activeEditingTask = tasks.find(t => t.id === editingTaskId);

  return (
    <div className="h-screen max-w-xl mx-auto flex flex-col px-5 pt-5 pb-24 transition-all duration-300 overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.05)]">

      {/* Header Widgets */}
      <div className="flex gap-4 mb-5">
        <div className="nm-raised rounded-[24px] p-4 flex-1 flex flex-col items-center justify-center relative group">
          {/* AI Planning */}
          <button
            onClick={() => setIsAIPlanningOpen(true)}
            disabled={!isAIAvailable}
            className={`absolute top-2 right-2 w-8 h-8 nm-raised-sm rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 active:nm-inset ${isAIAvailable
              ? 'text-indigo-400 hover:text-indigo-600'
              : 'text-gray-300 cursor-not-allowed'
              }`}
            title={isAIAvailable ? 'AI 智能规划' : 'AI 未配置，请点击下侧设置'}
          >
            <svg className={`w-4 h-4 ${isAIAvailable ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </button>

          {/* AI Provider Settings */}
          <button
            onClick={() => setIsAISettingsOpen(true)}
            className="absolute top-2 left-2 w-8 h-8 nm-raised-sm rounded-full flex items-center justify-center text-gray-400 hover:text-indigo-500 transition-all z-10 hover:scale-110 active:nm-inset"
            title="AI 模型设置"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* User Profile / Login Button */}
          <button
            onClick={() => user ? handleLogout() : setIsAuthOpen(true)}
            className={`absolute bottom-2 right-2 w-8 h-8 nm-raised-sm rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 active:nm-inset overflow-hidden ${user ? 'text-indigo-500 bg-indigo-50/30' : 'text-gray-300'
              }`}
            title={user ? `已登录: ${user.nickname || user.email} (点击登出)` : '登录以同步云端备份'}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </button>

          <div className="text-3xl font-light text-gray-700 mb-1">{formattedTime}</div>
          <div className="text-[10px] text-gray-400 font-bold tracking-tight flex items-center justify-center gap-2">
            {isSyncing ? (
              <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full animate-ping"></span>
            ) : user ? (
              <span
                onClick={handleShowInsight}
                className={`inline-block w-2 h-2 rounded-full cursor-pointer transition-all duration-700 ${hasUnreadInsight
                  ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse'
                  : 'bg-green-400 opacity-80'
                  }`}
                title={hasUnreadInsight ? "点击查看 AI 每日复盘" : "系统就绪"}
              ></span>
            ) : null}
            {user && (
              <span className="text-gray-400 uppercase tracking-widest">
                {user.nickname || user.email.split('@')[0]}
              </span>
            )}
            <span>{formattedDate} {weekday}</span>
          </div>
        </div>
        <div className="nm-raised rounded-[24px] p-4 w-32 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <svg className={`w-4 h-4 transition-colors duration-500 ${waterCount >= waterTarget ? 'text-green-500' : 'text-[#34749D]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a6 6 0 006-6c0-4-6-11-6-11s-6 7-6 11a6 6 0 006 6z" />
            </svg>
            <div className="text-[10px] font-bold text-gray-500">
              <span className="text-gray-700">{waterCount}</span>/{waterTarget}
            </div>
          </div>
          <div className="flex gap-2 mt-auto">
            <button onClick={() => setWaterCount(Math.max(0, waterCount - 1))} className="nm-inset-sm w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 active:nm-inset-active transition-all">-</button>
            <button onClick={() => setWaterCount(Math.min(waterTarget, waterCount + 1))} className="nm-inset-sm w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 active:nm-inset-active transition-all">+</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col overflow-hidden mb-4 min-h-0">
        {currentAppView === 'active' ? (
          <MainCard
            tasks={filteredTasks}
            onToggle={toggleTaskSelection}
            onEdit={setEditingTaskId}
            switcher={<TimeSwitcher active={currentTimeView} onSwitch={setCurrentTimeView} />}
          />
        ) : currentAppView === 'archived' ? (
          <MainCard
            tasks={filteredTasks}
            onToggle={toggleTaskSelection}
            onEdit={setEditingTaskId}
            title="存档历史"
          />
        ) : (
          <CalendarView
            tasks={tasks}
            onToggle={toggleTaskSelection}
            onEdit={setEditingTaskId}
            onAddTask={handleDirectAddTask}
            onArchive={handleArchiveSelected}
            onRevert={handleRevertSelected}
            onDelete={handleDeleteSelected}
          />
        )}

        {/* Floating action buttons */}
        <div className="absolute bottom-6 right-4 animate-in zoom-in duration-300 z-10 flex flex-col gap-3">
          {filteredTasks.some(t => t.selected) && (
            <>
              {currentAppView === 'active' && <ArchiveButton onClick={handleArchiveSelected} />}
              {currentAppView === 'archived' && <RevertButton onClick={handleRevertSelected} />}
              <DeleteButton onClick={handleDeleteSelected} />
            </>
          )}
        </div>
      </div>

      {/* Input Overlay */}
      {inputMode !== 'none' && !isAIPlanningOpen && !editingTaskId && (
        <div className="fixed inset-x-0 bottom-24 px-5 mb-2 animate-in slide-in-from-bottom-2 duration-300 z-[60] max-w-xl mx-auto">
          <div className="nm-raised rounded-[24px] p-5 flex items-center gap-4">
            <div className="flex-grow flex items-center">
              {inputMode === 'voice' ? (
                <div className="flex items-center gap-3 text-gray-500">
                  <div className={`w-3 h-3 rounded-full bg-red-400 ${isRecording ? 'animate-pulse' : ''} shadow-[0_0_10px_rgba(248,113,113,0.5)]`}></div>
                  <span className="text-sm font-semibold tracking-tight text-gray-600">
                    {isAnalyzing ? "AI 正在理解..." : "请说话..."}
                  </span>
                </div>
              ) : (
                <div className="flex items-start w-full gap-2">
                  <textarea
                    autoFocus
                    rows={1}
                    className="flex-grow bg-transparent text-gray-700 placeholder-gray-400 text-sm font-medium resize-none overflow-hidden leading-relaxed focus:outline-none"
                    style={{ minHeight: '24px', maxHeight: '120px' }}
                    placeholder={isAnalyzing ? "正在记录..." : "输入新事项..."}
                    value={inputValue}
                    disabled={isAnalyzing}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      // 自动调整高度
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddTask(inputValue);
                      }
                    }}
                  />
                  {!isAnalyzing && (
                    <button
                      onClick={() => setInputMode('voice')}
                      className="nm-raised-sm w-8 h-8 rounded-lg flex items-center justify-center text-[#34749D] opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => inputMode === 'voice' ? (mediaRecorderRef.current ? stopRecording() : setInputMode('none')) : handleAddTask(inputValue)}
              disabled={isAnalyzing}
              className={`nm-raised-sm w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isAnalyzing ? 'opacity-50' : 'text-[#34749D] active:nm-inset-active'
                }`}
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : inputMode === 'voice' ? (
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modals & Panels */}
      {isAuthOpen && (
        <AuthPanel
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {isSyncing && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] nm-raised px-4 py-2 rounded-full flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">正在同步云端...</span>
        </div>
      )}

      {isAIPlanningOpen && (
        <AIPlanningPanel
          onClose={() => setIsAIPlanningOpen(false)}
          onAddTasks={(items) => {
            addMultipleTasks(items);
            setIsAIPlanningOpen(false);
          }}
        />
      )}

      {(activeEditingTask || draftTask) && (
        <TaskDetailPanel
          task={activeEditingTask || draftTask!}
          onClose={() => {
            setEditingTaskId(null);
            setDraftTask(null);
          }}
          onUpdate={(updates) => {
            if (activeEditingTask) {
              handleUpdateTask(activeEditingTask.id, updates);
            } else if (draftTask) {
              if (updates.text?.trim()) {
                const newTask: Task = {
                  ...draftTask,
                  ...updates!,
                  timeframe: calculateTimeframe(updates.dueDate || draftTask.dueDate)
                };
                setTasks(prev => [newTask, ...prev]);
                setCurrentTimeView(newTask.timeframe);
                setCurrentAppView('active');

                // 同步到云端
                if (user) {
                  createCloudTask({
                    text: newTask.text,
                    details: newTask.details,
                    due_date: newTask.dueDate,
                    timeframe: newTask.timeframe,
                    archived: newTask.archived
                  })
                    .then(response => {
                      setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, id: response.id } : t));
                    })
                    .catch(err => console.error('云端创建失败:', err));
                }
              }
              setDraftTask(null);
            }
          }}
        />
      )}

      {isAISettingsOpen && (
        <AIProviderSelector onClose={() => setIsAISettingsOpen(false)} />
      )}

      <BottomBar
        activeMode={inputMode}
        onModeSwitch={setInputMode}
        activeAppView={currentAppView}
        onAppViewSwitch={setCurrentAppView}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
};

export default App;
