import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { chatWithAI, formatText, transcribeAudioSimple } from '../services/api';
import { marked } from "marked";

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, onClose, onUpdate }) => {
  const [title, setTitle] = useState(task.text);
  const [details, setDetails] = useState(task.details || '');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [isArchived, setIsArchived] = useState(task.archived);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isEditingDetails && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditingDetails]);

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
          if (isChatOpen) {
            await transcribeAudioForChat(audioBlob);
          } else {
            await transcribeAudio(audioBlob);
          }
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const base64 = await blobToBase64(blob);
      const text = await transcribeAudioSimple(base64, 'audio/webm');
      if (text) {
        setDetails(prev => prev + (prev ? '\n' : '') + text);
        setIsEditingDetails(true);
      }
    } catch (e) {
      console.error("Transcription failed", e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const transcribeAudioForChat = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const base64 = await blobToBase64(blob);
      const text = await transcribeAudioSimple(base64, 'audio/webm');
      if (text) sendChatMessage(text);
    } catch (e) {
      console.error("Transcription failed", e);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAIFormat = async () => {
    if (!details.trim() || isFormatting) return;
    setIsFormatting(true);
    setIsFormatMenuOpen(false);
    try {
      const formatted = await formatText(details);
      if (formatted) {
        setDetails(formatted);
        setIsEditingDetails(false);
      }
    } catch (e) {
      console.error("Formatting failed", e);
    } finally {
      setIsFormatting(false);
    }
  };

  const cleanSpacing = () => {
    const cleaned = details.replace(/\n\s*\n/g, '\n\n').trim();
    setDetails(cleaned);
    setIsFormatMenuOpen(false);
  };

  const sendChatMessage = async (text?: string) => {
    const messageToSend = text || chatInput;
    if (!messageToSend.trim()) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', text: messageToSend }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await chatWithAI(newMessages, { title, details });
      setChatMessages([...newMessages, { role: 'model', text: response }]);
    } catch (e) {
      console.error("Chat failed", e);
      setChatMessages([...newMessages, { role: 'model', text: "Error: Could not reach AI." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const appendToDetails = (text: string) => {
    setDetails(prev => prev + (prev ? '\n\n' : '') + text);
    setIsEditingDetails(false);
  };

  const handleSave = () => {
    onUpdate({ text: title, details, dueDate, archived: isArchived });
    onClose();
  };

  const renderMarkdown = (text: string) => {
    try {
      return { __html: marked.parse(text) };
    } catch (e) {
      return { __html: text };
    }
  };

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-[120] bg-[#F2F0E6] animate-in slide-in-from-right duration-500 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.1)]">
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 nm-raised rounded-full flex items-center justify-center text-gray-400 active:nm-inset transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Item Detail</h2>
        <button
          onClick={handleSave}
          className="w-10 h-10 nm-raised rounded-full flex items-center justify-center text-teal-600 active:nm-inset transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col px-6 overflow-hidden pb-6">
        <div className="nm-inset rounded-[20px] px-4 py-2.5 mb-4 flex-shrink-0">
          <input
            autoFocus={!task.text}
            className="w-full bg-transparent text-base font-bold text-gray-700 focus:outline-none"
            placeholder="Item title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Metadata Controls: Date and Status */}
        <div className="flex gap-4 mb-5 flex-shrink-0">
          {/* Date Picker */}
          <div className="flex-1 nm-inset rounded-[20px] px-4 py-2.5 flex items-center gap-3">
            <svg className="w-4 h-4 text-[#4D886D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="date"
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none flex-grow"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Status Toggle */}
          <button
            onClick={() => setIsArchived(!isArchived)}
            className={`flex-1 nm-raised rounded-[20px] px-4 py-2.5 flex items-center justify-center gap-3 transition-all ${isArchived ? 'text-teal-600 nm-inset' : 'text-gray-400'
              }`}
          >
            <div className={`w-2 h-2 rounded-full transition-colors ${isArchived ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-gray-300'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isArchived ? 'Done' : 'Active'}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className={`nm-inset rounded-[32px] p-6 flex flex-col relative overflow-hidden transition-all duration-500 ${isChatOpen ? 'h-1/3' : 'flex-1'}`}>
            {isFormatting && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Conditional Rendering: Edit Mode vs Render Mode */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative">
              {isEditingDetails ? (
                <textarea
                  ref={textareaRef}
                  className="w-full h-full bg-transparent text-sm font-medium text-gray-600 focus:outline-none placeholder-gray-300 resize-none leading-relaxed"
                  placeholder="Add some details here..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  onBlur={() => !isRecording && !isFormatting && setIsEditingDetails(false)}
                />
              ) : (
                <div
                  className="w-full h-full text-sm font-medium text-gray-600 prose-custom cursor-text"
                  onClick={() => setIsEditingDetails(true)}
                  dangerouslySetInnerHTML={renderMarkdown(details || "*点击此处添加详情...*")}
                />
              )}
            </div>

            {!isChatOpen && (
              <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10">
                {/* Format Menu */}
                <div className="relative">
                  {isFormatMenuOpen && (
                    <div className="absolute bottom-16 right-0 w-40 nm-raised rounded-2xl p-2 flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-200">
                      <button onClick={handleAIFormat} className="w-full text-left px-3 py-2 text-[10px] font-bold text-gray-500 hover:text-indigo-500 uppercase tracking-widest transition-colors flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" /> 格式美化
                      </button>
                      <div className="h-px bg-gray-100 mx-2" />
                      <button onClick={cleanSpacing} className="w-full text-left px-3 py-2 text-[10px] font-bold text-gray-500 hover:text-gray-700 uppercase tracking-widest transition-colors flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" /> 优化间距
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setIsFormatMenuOpen(!isFormatMenuOpen)}
                    className={`w-12 h-12 nm-raised rounded-full flex items-center justify-center transition-all ${isFormatMenuOpen ? 'nm-inset text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Formatting Options"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => { setIsChatOpen(true); setIsFormatMenuOpen(false); }}
                  className="w-12 h-12 nm-raised rounded-full flex items-center justify-center text-indigo-400 hover:text-indigo-600 transition-all"
                  title="Ask AI Assistant"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-14 h-14 nm-raised rounded-full flex items-center justify-center transition-all ${isRecording ? 'text-red-500 nm-inset' : 'text-indigo-400'
                    }`}
                >
                  {isRecording ? (
                    <div className="w-5 h-5 bg-red-500 rounded-sm animate-pulse" />
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          {isChatOpen && (
            <div className="flex-1 flex flex-col nm-raised rounded-[32px] overflow-hidden animate-in slide-in-from-bottom duration-500">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">AI Assistant</span>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-300 hover:text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 px-8 text-center">
                    <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-loose">Need help with steps, brainstorming, or research?</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-[18px] text-xs font-medium leading-relaxed relative ${msg.role === 'user'
                      ? 'nm-inset-sm text-gray-700 rounded-tr-none'
                      : 'nm-raised-sm text-gray-600 rounded-tl-none bg-white/50'
                      }`}>
                      <div dangerouslySetInnerHTML={renderMarkdown(msg.text)} className="prose-custom text-xs" />
                      {msg.role === 'model' && (
                        <button
                          onClick={() => appendToDetails(msg.text)}
                          className="absolute -right-3 -bottom-3 w-8 h-8 nm-raised rounded-full flex items-center justify-center text-teal-500 hover:text-teal-600 hover:scale-110 transition-all z-10"
                          title="Add to details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-10 h-10 nm-raised rounded-full flex items-center justify-center flex-shrink-0 ${isRecording ? 'text-red-500 nm-inset' : 'text-indigo-400'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <div className="flex-1 nm-inset rounded-2xl flex items-center px-4 overflow-hidden">
                  <input
                    className="flex-1 bg-transparent py-3 text-xs font-semibold text-gray-600 focus:outline-none placeholder-gray-300"
                    placeholder="Message AI..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  />
                  <button
                    onClick={() => sendChatMessage()}
                    className="text-indigo-400 hover:text-indigo-600 disabled:opacity-30"
                    disabled={!chatInput.trim() || isChatLoading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-8 pb-8 text-center flex-shrink-0">
        <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
          <span>Created {new Date(task.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
          <span>iOS Style Minimal Flow</span>
        </p>
      </div>
    </div>
  );
};

export default TaskDetailPanel;