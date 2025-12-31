
import React, { useState, useRef, useEffect } from 'react';
import { planTasks, parseTasksFromAudio, TaskItem } from '../services/api';
import { TimeView } from '../types';

interface ProposedTask {
  text: string;
  dueDate: string;
  category: string;
  isArchived: boolean;
}

interface AIPlanningPanelProps {
  onClose: () => void;
  onAddTasks: (items: Array<{ text: string, dueDate: string, category: string, isArchived: boolean }>) => void;
}

const sentimentEmojiMap: Record<string, string> = {
  'Anxious': '😰',
  'Overwhelmed': '🌊',
  'Determined': '😤',
  'Calm': '🧘',
  'Excited': '✨',
  'Tired': '😴',
  'Stressed': '😫',
  'Productive': '🐝',
  'Confused': '🤔',
  'Default': '💭'
};

const AIPlanningPanel: React.FC<AIPlanningPanelProps> = ({ onClose, onAddTasks }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{
    sentiment: string;
    analysis: string;
    tasks: ProposedTask[];
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // 检查是否为安全上下文 (HTTPS 或 localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        alert('⚠️ 语音录制需要 HTTPS 环境。由于当前使用的是 HTTP 连接，浏览器禁用了麦克风权限。建议使用域名并配置 SSL 证书。');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('⚠️ 您的浏览器不支持或禁用了麦克风访问。');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioChunksRef.current.length > 0) {
            await processInput(blob);
          }
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.name === 'NotAllowedError'
          ? '麦克风权限被拒绝，请在浏览器设置中允许访问。'
          : err.name === 'NotFoundError'
            ? '未检测到麦克风。'
            : `无法访问麦克风 (${err.name})`;
        alert(errorMsg);
      }
    }
  };

  const processInput = async (audioBlob?: Blob) => {
    if (!input.trim() && !audioBlob) return;
    setIsProcessing(true);
    setResult(null);

    try {
      if (audioBlob) {
        // 语音输入 - 调用音频解析 API
        const base64 = await blobToBase64(audioBlob);
        const items = await parseTasksFromAudio(base64, 'audio/webm');
        setResult({
          sentiment: 'Productive',
          analysis: '从语音中识别出的任务',
          tasks: items.map(item => ({
            text: item.text,
            dueDate: item.dueDate,
            category: item.category,
            isArchived: item.isArchived
          }))
        });
      } else {
        // 文本输入 - 调用 AI 规划 API
        const planResult = await planTasks(input);
        setResult({
          sentiment: 'Productive',
          analysis: planResult.analysis,
          tasks: planResult.items.map(item => ({
            text: item.text,
            dueDate: item.dueDate,
            category: item.category,
            isArchived: item.isArchived
          }))
        });
      }
    } catch (e) {
      console.error("Planning failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const updateTaskText = (index: number, newText: string) => {
    if (!result) return;
    const newTasks = [...result.tasks];
    newTasks[index].text = newText;
    setResult({ ...result, tasks: newTasks });
  };

  const removeTask = (index: number) => {
    if (!result) return;
    const newTasks = result.tasks.filter((_, i) => i !== index);
    setResult({ ...result, tasks: newTasks });
  };

  const addNewTaskToProposal = () => {
    if (!result) return;
    setResult({
      ...result,
      tasks: [...result.tasks, { text: '', dueDate: new Date().toISOString().split('T')[0], category: 'today', isArchived: false }]
    });
  };

  const getEmoji = (sentiment: string) => {
    return sentimentEmojiMap[sentiment] || sentimentEmojiMap['Default'];
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-[#F2F0E6]/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="nm-raised rounded-[32px] w-full max-w-sm p-6 flex flex-col gap-5 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 nm-inset rounded-lg flex items-center justify-center text-indigo-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeWidth="2.5" />
              </svg>
            </div>
            <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">AI Organization</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 nm-raised-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!result ? (
          <div className="flex flex-col gap-5">
            <div className="nm-inset rounded-2xl p-5">
              <textarea
                className="w-full bg-transparent text-sm font-medium text-gray-600 focus:outline-none placeholder-gray-400 min-h-[160px] resize-none leading-relaxed"
                placeholder="Describe your situation or tasks. AI will identify specific dates for History/Today/Later and check if they are already done."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={toggleRecording}
                className={`w-14 h-14 nm-raised rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'text-red-500 nm-inset' : 'text-indigo-500'}`}
              >
                {isRecording ? (
                  <div className="w-5 h-5 bg-red-500 rounded-sm animate-pulse" />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => processInput()}
                disabled={isProcessing || (!input.trim() && !isRecording)}
                className="flex-1 h-14 nm-raised rounded-2xl flex items-center justify-center text-xs font-bold text-indigo-500 active:nm-inset transition-all disabled:opacity-30 tracking-widest uppercase"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : "Submit Request"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden animate-in zoom-in duration-300">
            {/* Sentiment Card */}
            <div className="nm-raised-sm rounded-2xl p-4 border-l-4 border-indigo-400 flex gap-4 items-start">
              <div className="text-3xl filter grayscale-[0.5] flex-shrink-0">
                {getEmoji(result.sentiment)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 uppercase tracking-widest">
                    {result.sentiment}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-500 leading-tight italic">
                  "{result.analysis}"
                </p>
              </div>
            </div>

            {/* Editable Proposed Tasks */}
            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-4 py-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan Proposal</h3>
                <button
                  onClick={addNewTaskToProposal}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1"
                >
                  <span className="text-lg leading-none">+</span> Add Item
                </button>
              </div>
              {result.tasks.map((task, idx) => (
                <div key={idx} className="nm-inset-sm rounded-2xl p-3 flex items-start gap-3 group animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="mt-1 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${task.isArchived ? 'bg-gray-300' :
                      task.category === 'history' ? 'bg-gray-500' :
                        task.category === 'today' ? 'bg-orange-400' :
                          task.category === 'future2' ? 'bg-blue-400' : 'bg-indigo-400'
                      }`} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <textarea
                      rows={1}
                      className="w-full bg-transparent text-xs font-bold text-gray-600 focus:outline-none resize-none leading-normal"
                      value={task.text}
                      placeholder="Enter task..."
                      onChange={(e) => updateTaskText(idx, e.target.value)}
                    />
                    <div className="flex gap-2 mt-1">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-white/50 text-gray-400 tracking-tighter uppercase">
                        {task.dueDate}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${task.isArchived ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                        {task.isArchived ? 'Done' : 'Pending'}
                      </span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-400 uppercase tracking-tighter">
                        {task.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTask(idx)}
                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" />
                    </svg>
                  </button>
                </div>
              ))}
              {result.tasks.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-300 font-bold tracking-widest uppercase">No tasks in plan</div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setResult(null)}
                className="flex-1 h-12 nm-raised-sm rounded-2xl text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => onAddTasks(result.tasks)}
                disabled={result.tasks.length === 0}
                className="flex-2 h-12 nm-raised rounded-2xl text-[9px] font-bold text-indigo-500 uppercase tracking-widest active:nm-inset transition-all disabled:opacity-30 px-6"
              >
                Accept Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPlanningPanel;
