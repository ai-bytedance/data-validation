
import React, { useState } from 'react';
import { Layout, Globe, Settings as SettingsIcon } from 'lucide-react';
import { ViewState, Dataset, ExpectationSuite, ValidationResult } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DataSource from './components/DataSource';
import SuiteBuilder from './components/SuiteBuilder';
import ValidationRunner from './components/ValidationRunner';
import Reports from './components/Reports';
import SettingsModal from './components/SettingsModal';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';

import { api } from './api';

const MainApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  // App State
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [allDatasets, setAllDatasets] = useState<Dataset[]>([]);
  const [suites, setSuites] = useState<ExpectationSuite[]>([]);
  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { language, setLanguage, t } = useLanguage();

  // Polyfill for randomUUID
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Load Initial Data
  React.useEffect(() => {
    const load = async () => {
      try {
        const ds = await api.getDatasets();
        setAllDatasets(ds || []);
        // Removed auto-select to respect user request ("clear cache display")
        // if (ds && ds.length > 0) setDataset(ds[0]); 

        const s = await api.getSuites();
        setSuites(s || []); // Guard against null
        const h = await api.getHistory();
        setValidationHistory(h || []); // Guard against null
      } catch (err) {
        console.warn("Failed to load initial data", err);
      }
    };
    load();
  }, []);

  const handleNav = (view: ViewState) => setCurrentView(view);

  const handleDatasetLoaded = (newDataset: Dataset) => {
    setDataset(newDataset);
    setAllDatasets(prev => [...prev, newDataset]); // Add to list
    // Auto-create a default suite container for convenience
    if (suites.length === 0) {
      setSuites([{ id: generateId(), name: 'Default Suite', dataset_id: newDataset.id, expectations: [] }]);
    }
  };

  const handleDatasetDelete = async (id: string) => {
    if (confirm(t.dataSource['deleteConfirm'])) {
      try {
        await api.deleteDataset(id);
        setAllDatasets(prev => prev.filter(d => d.id !== id));
        if (dataset?.id === id) setDataset(null); // Clear current if deleted
      } catch (e) {
        alert("Delete failed");
      }
    }
  };

  const handleDatasetSelect = (ds: Dataset) => {
    setDataset(ds);
  };

  const handleSaveSuite = async (suite: ExpectationSuite) => {
    try {
      const saved = await api.createSuite(suite);
      // Refresh or Optimistic Update
      setSuites(prev => {
        const existing = prev.findIndex(s => s.id === saved.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = saved;
          return copy;
        }
        return [...prev, saved];
      });
    } catch (e) {
      console.error(e);
      alert("Failed to save suite");
    }
  };

  const handleValidationRun = (result: ValidationResult) => {
    setValidationHistory(prev => [result, ...prev]);
    setCurrentView('REPORTS');
  };

  const handleRunDelete = async (id: string) => {
    if (confirm(t.reports.deleteRunConfirm)) {
      try {
        await api.deleteRun(id);
        setValidationHistory(prev => prev.filter(r => r.id !== id));
      } catch (e) {
        alert("Failed to delete run");
      }
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard history={validationHistory} dataset={dataset} onNavigate={handleNav} />;
      case 'DATA_SOURCE':
        return <DataSource
          onDataLoaded={handleDatasetLoaded}
          currentDataset={dataset}
          allDatasets={allDatasets}
          onDelete={handleDatasetDelete}
          onSelect={handleDatasetSelect}
        />;
      case 'SUITE_BUILDER':
        return <SuiteBuilder dataset={dataset} suites={suites} onSave={handleSaveSuite} />;
      case 'VALIDATION_RUNNER':
        return <ValidationRunner dataset={dataset} suites={suites} onRun={handleValidationRun} />;
      case 'REPORTS':
        return <Reports history={validationHistory} onDelete={handleRunDelete} />;
      default:
        return <Dashboard history={validationHistory} dataset={dataset} onNavigate={handleNav} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={handleNav} />
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-orange-600 text-white p-1.5 rounded-md font-bold text-lg">GX</div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">{t.app.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 mr-2">
              {dataset ? `${t.app.dataset}: ${dataset.name}` : t.app.noDataset}
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Globe size={16} />
              {language === 'zh' ? 'EN' : 'ZH'}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title={t.app.settings}
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <MainApp />
      </SettingsProvider>
    </LanguageProvider>
  );
};

export default App;
