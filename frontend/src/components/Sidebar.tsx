import React from 'react';
import { LayoutDashboard, Database, ShieldCheck, Play, FileText } from 'lucide-react';
import { ViewState } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { t } = useLanguage();
  
  const menuItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'DASHBOARD', label: t.sidebar.dashboard, icon: <LayoutDashboard size={20} /> },
    { id: 'DATA_SOURCE', label: t.sidebar.dataSource, icon: <Database size={20} /> },
    { id: 'SUITE_BUILDER', label: t.sidebar.builder, icon: <ShieldCheck size={20} /> },
    { id: 'VALIDATION_RUNNER', label: t.sidebar.runner, icon: <Play size={20} /> },
    { id: 'REPORTS', label: t.sidebar.reports, icon: <FileText size={20} /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-6">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4">{t.sidebar.coreProcess}</p>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                currentView === item.id 
                  ? 'bg-orange-600 text-white font-medium shadow-md' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="text-xs text-slate-500 whitespace-pre-line">
          {t.sidebar.footer}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
