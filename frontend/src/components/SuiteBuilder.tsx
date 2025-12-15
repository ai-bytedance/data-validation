
import React, { useState } from 'react';
import { generateId } from '../utils';
import { Dataset, ExpectationSuite, Expectation, ExpectationType } from '../types';
import { api } from '../api';
import { Plus, Wand2, Trash2, Save, Download, Code, Loader2, ChevronDown, Table as TableIcon, BrainCircuit, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';

interface SuiteBuilderProps {
  dataset: Dataset | null;
  suites: ExpectationSuite[];
  onSave: (suite: ExpectationSuite) => void;
}

const SuiteBuilder: React.FC<SuiteBuilderProps> = ({ dataset, suites, onSave }) => {
  const [activeSuiteId, setActiveSuiteId] = useState<string>(suites[0]?.id || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  const { t, language } = useLanguage();
  const { aiConfig } = useSettings();

  const activeSuite = suites.find(s => s.id === activeSuiteId) || suites[0];

  const handleAddManual = () => {
    if (!activeSuite || !dataset) return;
    const newExp: Expectation = {
      id: crypto.randomUUID(),
      column: dataset.headers[0],
      type: ExpectationType.NOT_NULL,
      kwargs: {},
      description: t.builder.manualDesc as string
    };
    const updatedSuite = {
      ...activeSuite,
      expectations: [...activeSuite.expectations, newExp]
    };
    onSave(updatedSuite);
  };

  const handleUpdateExp = (id: string, updates: Partial<Expectation>) => {
    if (!activeSuite) return;
    const updated = activeSuite.expectations.map(e => e.id === id ? { ...e, ...updates } : e);
    onSave({ ...activeSuite, expectations: updated });
  };

  const handleDeleteExp = (id: string) => {
    if (!activeSuite) return;
    const updated = activeSuite.expectations.filter(e => e.id !== id);
    onSave({ ...activeSuite, expectations: updated });
  };

  const handleAiSuggest = async () => {
    if (!dataset) return;
    setAiLoading(true);
    try {
      const suggestions = await api.suggestExpectations(dataset.id);
      if (activeSuite) {
        const newExps = suggestions.map((s: any) => ({ ...s, id: generateId() }));
        onSave({
          ...activeSuite,
          expectations: [...activeSuite.expectations, ...newExps]
        });
      }
    } catch (e) {
      console.error(e);
      alert("AI Suggestion failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportCode = async () => {
    if (!activeSuite) return;
    setCodeLoading(true);
    try {
      const { code } = await api.generateCode(activeSuite.id);
      setGeneratedCode(code);
      setShowCode(true);
    } catch {
      alert("Code generation failed");
    } finally {
      setCodeLoading(false);
    }
  };

  if (!dataset) {
    return (
      <div className="text-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
          <Wand2 size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">{t.builder.noDataTitle}</h3>
        <p className="text-slate-500 mt-2">{t.builder.noDataDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t.builder.title}</h2>
          <p className="text-slate-500">{t.builder.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCode}
            disabled={aiLoading || codeLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${codeLoading
              ? 'bg-slate-800 text-white cursor-wait opacity-100'
              : aiLoading
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
              }`}
          >
            {codeLoading ? <Loader2 className="animate-spin" size={18} /> : <Code size={18} />}
            {t.builder.btnExport}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Clean Header Layout */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center rounded-t-xl gap-4">

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <TableIcon size={20} className="text-slate-500" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.builder.currentSuite}</label>
              <input
                value={activeSuite?.name}
                onChange={(e) => onSave({ ...activeSuite, name: e.target.value })}
                className="bg-transparent border-none p-0 text-slate-800 font-bold focus:ring-0 text-lg placeholder-slate-300 w-full sm:w-64"
                placeholder="Suite Name"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading || codeLoading}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg transition-all shadow-sm text-sm font-bold whitespace-nowrap ${aiLoading
                ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white cursor-wait opacity-80'
                : 'bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:shadow-md hover:scale-[1.02] active:scale-95'
                }`}
            >
              {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {t.builder.btnAi}
            </button>

            <button
              onClick={handleAddManual}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-orange-600 font-medium transition-colors shadow-sm"
            >
              <Plus size={18} /> {t.builder.btnAddRule}
            </button>
          </div>
        </div>

        {activeSuite?.expectations.length === 0 ? (
          <div className="p-16 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Sparkles size={40} />
            </div>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">{t.builder.noRules}</p>
            <button onClick={handleAiSuggest} disabled={aiLoading || codeLoading} className="text-orange-600 font-bold hover:underline disabled:opacity-50">
              {t.builder.aiCheck}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeSuite.expectations.map((exp, idx) => (
              <div key={exp.id} className="p-4 hover:bg-slate-50 transition-colors group">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start md:items-center">
                  <div className="col-span-1 text-slate-400 font-mono text-sm hidden md:block">#{idx + 1}</div>

                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs text-slate-500 mb-1">{t.builder.labelColumn}</label>
                    {exp.type === ExpectationType.TABLE_ROW_COUNT ? (
                      <div className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded px-3 py-2 flex items-center gap-2">
                        <TableIcon size={14} /> Table Check
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={exp.column}
                          onChange={(e) => handleUpdateExp(exp.id, { column: e.target.value })}
                          className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded px-3 py-2 pr-8 focus:outline-none focus:border-orange-500"
                        >
                          {dataset.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    )}
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs text-slate-500 mb-1">{t.builder.labelType}</label>
                    <div className="relative">
                      <select
                        value={exp.type}
                        onChange={(e) => handleUpdateExp(exp.id, { type: e.target.value as ExpectationType })}
                        className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded px-3 py-2 pr-8 focus:outline-none focus:border-orange-500"
                      >
                        {Object.values(ExpectationType).map(tType => (
                          <option key={tType} value={tType}>
                            {t.expectations[tType] as string || tType}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-3">
                    {/* Contextual Inputs based on Type */}
                    <label className="block text-xs text-slate-500 mb-1">{t.builder.labelParams}</label>
                    {[
                      ExpectationType.BETWEEN,
                      ExpectationType.LENGTH_BETWEEN,
                      ExpectationType.TABLE_ROW_COUNT,
                      ExpectationType.MEAN_BETWEEN,
                      ExpectationType.MIN_BETWEEN,
                      ExpectationType.MAX_BETWEEN
                    ].includes(exp.type) && (
                        <div className="flex gap-2">
                          <input
                            placeholder={t.builder.placeholderMin as string}
                            type="number"
                            className="w-1/2 border border-slate-300 rounded px-2 py-2 text-sm"
                            value={exp.kwargs.min_value !== undefined ? exp.kwargs.min_value : ''}
                            onChange={(e) => handleUpdateExp(exp.id, { kwargs: { ...exp.kwargs, min_value: e.target.value === '' ? undefined : parseFloat(e.target.value) } })}
                          />
                          <input
                            placeholder={t.builder.placeholderMax as string}
                            type="number"
                            className="w-1/2 border border-slate-300 rounded px-2 py-2 text-sm"
                            value={exp.kwargs.max_value !== undefined ? exp.kwargs.max_value : ''}
                            onChange={(e) => handleUpdateExp(exp.id, { kwargs: { ...exp.kwargs, max_value: e.target.value === '' ? undefined : parseFloat(e.target.value) } })}
                          />
                        </div>
                      )}
                    {exp.type === ExpectationType.IN_SET && (
                      <input
                        placeholder="A, B, C"
                        className="w-full border border-slate-300 rounded px-2 py-2 text-sm"
                        value={exp.kwargs.value_set?.join(', ') || ''}
                        onChange={(e) => handleUpdateExp(exp.id, { kwargs: { ...exp.kwargs, value_set: e.target.value.split(',').map(s => s.trim()) } })}
                      />
                    )}
                    {exp.type === ExpectationType.OF_TYPE && (
                      <div className="relative">
                        <select
                          value={exp.kwargs.type || 'string'}
                          onChange={(e) => handleUpdateExp(exp.id, { kwargs: { ...exp.kwargs, type: e.target.value } })}
                          className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded px-3 py-2 pr-8 focus:outline-none focus:border-orange-500"
                        >
                          <option value="string">String</option>
                          <option value="int">Integer</option>
                          <option value="float">Float</option>
                          <option value="bool">Boolean</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    )}
                    {exp.type === ExpectationType.DATE_FORMAT && (
                      <input
                        placeholder={t.builder.placeholderFormat as string}
                        className="w-full border border-slate-300 rounded px-2 py-2 text-sm"
                        value={exp.kwargs.strftime_format || ''}
                        onChange={(e) => handleUpdateExp(exp.id, { kwargs: { ...exp.kwargs, strftime_format: e.target.value } })}
                      />
                    )}
                    {exp.type === ExpectationType.REGEX && (
                      <input
                        placeholder={t.builder.placeholderRegex as string}
                        className="w-full border border-slate-300 rounded px-2 py-2 text-sm"
                        value={exp.kwargs.regex || ''}
                        onChange={(e) => handleUpdateExp(exp.id, { kwargs: { ...exp.kwargs, regex: e.target.value } })}
                      />
                    )}
                    {exp.type === ExpectationType.AI_SEMANTIC && (
                      <div className="relative w-full">
                        <textarea
                          placeholder={t.builder.placeholderPrompt as string}
                          className="w-full border border-orange-200 bg-orange-50/50 rounded-lg px-3 py-2 pr-9 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-y"
                          rows={3}
                          value={exp.kwargs.prompt || ''}
                          onChange={(e) => handleUpdateExp(exp.id, { kwargs: { ...exp.kwargs, prompt: e.target.value } })}
                        />
                        <BrainCircuit size={16} className="absolute right-3 top-3 text-orange-500 pointer-events-none" />
                      </div>
                    )}
                    {[ExpectationType.NOT_NULL, ExpectationType.UNIQUE].includes(exp.type) && (
                      <span className="text-xs text-slate-400 italic py-2 block">{t.builder.noParams}</span>
                    )}
                  </div>

                  <div className="col-span-12 md:col-span-1 text-right">
                    <button onClick={() => handleDeleteExp(exp.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Code size={20} /> {t.builder.generatedTitle}</h3>
              <button onClick={() => setShowCode(false)} className="text-slate-500 hover:text-slate-800">{t.builder.btnClose}</button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-900 p-4">
              <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">{generatedCode}</pre>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => { navigator.clipboard.writeText(generatedCode); alert(t.builder.copied); }}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                {t.builder.btnCopy}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiteBuilder;
