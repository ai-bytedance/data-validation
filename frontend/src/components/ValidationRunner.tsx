
import React, { useState } from 'react';
import { Dataset, ExpectationSuite, ValidationResult } from '../types';
import { api } from '../api';
import { Play, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';

interface ValidationRunnerProps {
  dataset: Dataset | null;
  suites: ExpectationSuite[];
  onRun: (result: ValidationResult) => void;
}

const ValidationRunner: React.FC<ValidationRunnerProps> = ({ dataset, suites, onRun }) => {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>(suites[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const { t, language } = useLanguage();
  const { aiConfig } = useSettings();

  const handleRun = async () => {
    if (!dataset || !selectedSuiteId) return;
    setIsRunning(true);

    // Slight delay is natural, but we now await real async work
    try {
      const result = await api.runValidation(dataset.id, selectedSuiteId);
      onRun(result);
    } catch (e) {
      console.error("Validation failed", e);
      // Error handling visual (could add toast later)
      alert(t.runner.validationError || "Validation failed");
    } finally {
      setIsRunning(false);
    }
  };

  if (!dataset) {
    return <div className="text-center p-12 text-slate-500">{t.runner.noData}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">{t.runner.title}</h2>
        <p className="text-slate-500 mt-2">{t.runner.subtitle}</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-pink-500"></div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.runner.targetData}</label>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">CSV</div>
              <div>
                <p className="font-semibold text-slate-800">{dataset.name}</p>
                <p className="text-xs text-slate-500">{dataset.rows.length} {language === 'zh' ? '行' : 'rows'}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-slate-300">
            <ArrowRight className="rotate-90 md:rotate-0" size={24} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.runner.suite}</label>
            <select
              className="w-full p-4 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none font-medium text-slate-700"
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
            >
              {suites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.expectations.length} {language === 'zh' ? '条规则' : 'rules'})</option>)}
            </select>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning || suites.length === 0}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 ${isRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 hover:shadow-xl'
              }`}
          >
            {isRunning ? (
              <><Loader2 className="animate-spin" size={24} /> {t.runner.btnProcessing}</>
            ) : (
              <>
                <Play fill="currentColor" size={20} /> {t.runner.btnRun}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 text-blue-800 text-sm">
        <AlertTriangle size={20} className="shrink-0" />
        <p>
          {t.runner.note}
        </p>
      </div>
    </div>
  );
};

export default ValidationRunner;
