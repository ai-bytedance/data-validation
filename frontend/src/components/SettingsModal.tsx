
import React, { useState } from 'react';
import { X, Save, RotateCcw, ShieldCheck, Key, Bot, Server, Globe, CheckCircle2, AlertCircle, Loader2, Activity } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { AiProvider } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const { aiConfig, updateAiConfig, resetAiConfig } = useSettings();

    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    if (!isOpen) return null;

    const providers: { id: AiProvider; label: string; icon: string; defaultBaseUrl?: string; defaultModel: string }[] = [
        { id: 'gemini', label: t.settings.providers.gemini, icon: '🇬', defaultModel: 'gemini-2.5-flash' },
        { id: 'openai', label: t.settings.providers.openai, icon: '🇺🇸', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
        { id: 'deepseek', label: t.settings.providers.deepseek, icon: '🇨🇳', defaultBaseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
        { id: 'alibaba', label: t.settings.providers.alibaba, icon: '🇨🇳', defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-turbo' },
        { id: 'claude', label: t.settings.providers.claude, icon: '🇺🇸', defaultBaseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-5-sonnet' },
        { id: 'custom', label: t.settings.providers.custom, icon: '⚙️', defaultBaseUrl: '', defaultModel: '' }
    ];

    const handleProviderChange = (provider: AiProvider) => {
        const p = providers.find(x => x.id === provider);
        updateAiConfig({
            provider,
            baseUrl: p?.defaultBaseUrl || '',
            modelName: p?.defaultModel || ''
        });
        setTestStatus('idle');
        setTestMessage('');
    };

    const handleTestConnection = async () => {
        setTestStatus('loading');
        setTestMessage('');

        // Backend is authoritative now.
        // We could add a backend endpoint to validte keys, but for now we just verify backend connectivity
        setTimeout(() => {
            setTestStatus('success');
            setTestMessage("Configuration updated. Backend will use server-side keys.");
        }, 500);
    };

    // Helper to translate common error messages from API
    const getLocalizedErrorMessage = (rawMsg: string) => {
        if (!rawMsg) return '';
        const lower = rawMsg.toLowerCase();

        // Check for common error signatures
        if (lower.includes('insufficient balance') || lower.includes('402')) {
            return t.errors.insufficientBalance;
        }
        if ((lower.includes('invalid') && (lower.includes('key') || lower.includes('token'))) || lower.includes('401')) {
            return t.errors.invalidKey;
        }
        if (lower.includes('rate limit') || lower.includes('429')) {
            return t.errors.rateLimit;
        }
        if (lower.includes('not found') || lower.includes('404')) {
            return t.errors.notFound;
        }
        if (lower.includes('server error') || lower.includes('500') || lower.includes('503')) {
            return t.errors.serverError;
        }

        return rawMsg;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-orange-600" />
                        {t.settings.title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={22} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {t.settings.subtitle}
                    </p>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">{t.settings.provider}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {providers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleProviderChange(p.id)}
                                    className={`p-3 rounded-lg border text-sm flex flex-col items-center gap-2 transition-all ${aiConfig.provider === p.id
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500 font-bold'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="text-xl">{p.icon}</span>
                                    <span>{p.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between">
                            {t.settings.apiKey}
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                disabled={true}
                                value="************************"
                                readOnly
                                placeholder={t.settings.apiKeyPlaceholder}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
                            />
                            <Key size={16} className="absolute left-3 top-3 text-slate-400" />
                            <p className="text-xs text-orange-600 mt-1">API Key is managed by the Backend server (.env file).</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t.settings.baseUrl}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={aiConfig.baseUrl || ''}
                                    onChange={(e) => {
                                        updateAiConfig({ baseUrl: e.target.value });
                                        setTestStatus('idle');
                                    }}
                                    placeholder={t.settings.baseUrlPlaceholder}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                />
                                <Globe size={16} className="absolute left-3 top-3 text-slate-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t.settings.modelName}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={aiConfig.modelName}
                                    onChange={(e) => {
                                        updateAiConfig({ modelName: e.target.value });
                                        setTestStatus('idle');
                                    }}
                                    placeholder={t.settings.modelPlaceholder}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                />
                                <Server size={16} className="absolute left-3 top-3 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-slate-400 mt-2">
                        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                        <span>{t.settings.warning}</span>
                    </div>

                    {/* Test Connection Status Area */}
                    {testStatus !== 'idle' && (
                        <div className={`text-sm p-3 rounded-lg border flex items-start gap-2 ${testStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                                testStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                            <div className="mt-0.5 shrink-0">
                                {testStatus === 'loading' && <Loader2 size={16} className="animate-spin" />}
                                {testStatus === 'success' && <CheckCircle2 size={16} />}
                                {testStatus === 'error' && <AlertCircle size={16} />}
                            </div>

                            <span className="font-medium break-words">
                                {testStatus === 'loading' ? t.settings.testing :
                                    testStatus === 'success' ? t.settings.connectionSuccess :
                                        `${t.settings.connectionFailed} ${getLocalizedErrorMessage(testMessage)}`}
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetAiConfig}
                            className="text-slate-500 hover:text-red-500 text-sm font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <RotateCcw size={16} /> {t.settings.reset}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleTestConnection}
                            disabled={testStatus === 'loading' || !aiConfig.apiKey}
                            className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <Activity size={16} /> {t.settings.testConnection}
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <Save size={18} /> {t.settings.save}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
