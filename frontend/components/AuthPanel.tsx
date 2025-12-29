import React, { useState } from 'react';
import { login, register, User, setAuthToken } from '../services/api';

interface AuthPanelProps {
    onClose: () => void;
    onSuccess: (user: User) => void;
}

const AuthPanel: React.FC<AuthPanelProps> = ({ onClose, onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                const response = await login(email, password);
                setAuthToken(response.access_token);
                onSuccess(response.user);
            } else {
                const response = await register(email, password, nickname);
                setAuthToken(response.access_token);
                onSuccess(response.user);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-5 bg-[#F2F0E6]/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="nm-raised rounded-[32px] w-full max-w-sm p-8 flex flex-col gap-6 animate-in zoom-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 nm-inset rounded-lg flex items-center justify-center text-indigo-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 nm-raised-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex nm-inset rounded-2xl p-1">
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'nm-raised text-indigo-600' : 'text-gray-400'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'nm-raised text-indigo-600' : 'text-gray-400'
                            }`}
                    >
                        Register
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLogin && (
                        <div className="nm-inset rounded-2xl px-4 py-3">
                            <input
                                type="text"
                                placeholder="Nickname (Optional)"
                                className="w-full bg-transparent text-sm font-medium text-gray-600 focus:outline-none placeholder-gray-300"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="nm-inset rounded-2xl px-4 py-3">
                        <input
                            type="email"
                            required
                            placeholder="Email Address"
                            className="w-full bg-transparent text-sm font-medium text-gray-600 focus:outline-none placeholder-gray-300"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="nm-inset rounded-2xl px-4 py-3 flex items-center gap-2">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Password"
                            className="w-full bg-transparent text-sm font-medium text-gray-600 focus:outline-none placeholder-gray-300"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-300 hover:text-indigo-400 transition-colors"
                        >
                            {showPassword ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="px-2">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter italic">
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="h-14 mt-2 nm-raised rounded-2xl flex items-center justify-center text-xs font-black text-indigo-500 active:nm-inset transition-all disabled:opacity-50 tracking-[0.2em] uppercase"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            isLogin ? 'Sign In' : 'Sign Up'
                        )}
                    </button>
                </form>

                <p className="text-[9px] text-center text-gray-300 font-bold uppercase tracking-widest">
                    Cloud Sync Encryption Enabled
                </p>
            </div>
        </div>
    );
};

export default AuthPanel;
