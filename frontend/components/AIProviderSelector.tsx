/**
 * AI Provider 选择器组件
 * 支持动态切换 AI 模型
 */

import React, { useState, useEffect } from 'react';

interface Provider {
    id: string;
    name: string;
    model: string;
    available: boolean;
    supportsAudio: boolean;
}

interface AIProviderSelectorProps {
    onClose: () => void;
}

// 获取保存的 provider
export function getSelectedProvider(): string | null {
    return localStorage.getItem('aiProvider');
}

// 保存选择的 provider
export function setSelectedProvider(provider: string): void {
    localStorage.setItem('aiProvider', provider);
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ onClose }) => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(getSelectedProvider());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const API_BASE = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api';
                const response = await fetch(`${API_BASE}/ai/providers`);
                if (response.ok) {
                    const data = await response.json();
                    setProviders(data.providers);
                    // 如果没有选择过，使用后端默认
                    if (!selectedId) {
                        setSelectedId(data.current);
                    }
                } else {
                    setError('无法获取 AI 配置');
                }
            } catch (e) {
                setError('连接后端失败');
            } finally {
                setLoading(false);
            }
        };
        fetchProviders();
    }, []);

    // 选择 provider
    const handleSelect = (id: string) => {
        const provider = providers.find(p => p.id === id);
        if (provider?.available) {
            setSelectedId(id);
            setSelectedProvider(id);
        }
    };

    // Provider 图标
    const getIcon = (id: string) => {
        switch (id) {
            case 'gemini': return '✨';
            case 'openai': return '🤖';
            case 'siliconflow': return '💎';
            case 'deepseek': return '🌊';
            default: return '🔮';
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5 bg-[#F2F0E6]/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="nm-raised rounded-[32px] w-full max-w-sm p-6 flex flex-col gap-5">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 nm-inset rounded-lg flex items-center justify-center text-indigo-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">AI 模型</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 nm-raised-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                        title="关闭"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="py-10 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="py-10 text-center">
                        <p className="text-xs text-red-400 font-medium">{error}</p>
                        <p className="text-[10px] text-gray-400 mt-2">请检查后端服务是否运行</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {providers.map((provider) => (
                            <button
                                key={provider.id}
                                onClick={() => handleSelect(provider.id)}
                                disabled={!provider.available}
                                className={`w-full nm-raised-sm rounded-2xl p-4 flex items-center gap-4 transition-all text-left ${provider.id === selectedId ? 'ring-2 ring-indigo-400 nm-inset-sm' : ''
                                    } ${!provider.available ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02] active:nm-inset'}`}
                            >
                                {/* Icon */}
                                <div className="text-2xl">{getIcon(provider.id)}</div>

                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-600">{provider.name}</span>
                                        {provider.id === selectedId && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-bold uppercase">
                                                使用中
                                            </span>
                                        )}
                                        {!provider.available && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">
                                                未配置
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-400">{provider.model}</span>
                                        {provider.supportsAudio && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-bold">
                                                🎤 语音
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status indicator */}
                                <div className={`w-3 h-3 rounded-full ${provider.id === selectedId ? 'bg-indigo-500' :
                                    provider.available ? 'bg-green-400' : 'bg-gray-300'
                                    }`} />
                            </button>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pt-2 space-y-2">
                    <p className="text-[9px] text-gray-400">
                        点击切换模型，选择立即生效
                    </p>
                    {providers.some(p => !p.available) && (
                        <p className="text-[8px] text-gray-300">
                            未配置的模型请在 <code className="px-1 py-0.5 bg-gray-100 rounded text-gray-500">backend/.env</code> 添加 API Key
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIProviderSelector;
