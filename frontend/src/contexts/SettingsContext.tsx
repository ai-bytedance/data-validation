
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AiConfig } from '../types';

interface SettingsContextType {
  aiConfig: AiConfig;
  updateAiConfig: (config: Partial<AiConfig>) => void;
  resetAiConfig: () => void;
}

const DEFAULT_CONFIG: AiConfig = {
  provider: 'gemini',
  apiKey: '',
  modelName: 'gemini-2.5-flash',
  baseUrl: ''
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aiConfig, setAiConfig] = useState<AiConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const stored = localStorage.getItem('gx_ui_ai_settings');
    if (stored) {
      try {
        setAiConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const updateAiConfig = (updates: Partial<AiConfig>) => {
    setAiConfig(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('gx_ui_ai_settings', JSON.stringify(next));
      return next;
    });
  };

  const resetAiConfig = () => {
    setAiConfig(DEFAULT_CONFIG);
    localStorage.removeItem('gx_ui_ai_settings');
  };

  return (
    <SettingsContext.Provider value={{ aiConfig, updateAiConfig, resetAiConfig }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
