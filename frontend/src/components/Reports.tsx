
import React, { useState } from 'react';
import { ValidationResult } from '../types';
import { CheckCircle, XCircle, Search, Calendar, AlertOctagon, Download, FileJson, FileCode, Check, X, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../translations';
import { formatDate, parseExpectationId } from '../utils/formatters';

interface ReportsProps {
  history: ValidationResult[];
  onDelete?: (id: string) => Promise<void>;
}

// Helper to format expected values
const renderExpectedValue = (config: Record<string, any> | undefined, typeName: string, t: any) => {
  if (!config) return "---";

  // Special handling for Not Null based on typeName or if config is empty but it is a known type
  if (typeName.includes("Not Null") || typeName.includes("非空")) {
    return t.reports.notNull;
  }

  if (config.value_set) {
    return `[${config.value_set.join(', ')}]`;
  }
  if (config.min_value !== undefined && config.max_value !== undefined) {
    return `${config.min_value} ~ ${config.max_value}`;
  }
  if (config.min_value !== undefined) {
    return `> ${config.min_value}`;
  }
  if (config.max_value !== undefined) {
    return `< ${config.max_value}`;
  }
  if (config.regex) {
    return `Regex: ${config.regex}`;
  }
  if (config.strftime_format) {
    return `Format: ${config.strftime_format}`;
  }

  return t.reports.checkRule;
};

const Reports: React.FC<ReportsProps> = ({ history, onDelete }) => {
  const [selectedRunId, setSelectedRunId] = useState<string>(history[0]?.id || '');
  const { t } = useLanguage();

  const selectedRun = history.find(h => h.id === selectedRunId);

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  };

  const handleExportJson = () => {
    if (!selectedRun) return;
    const jsonString = JSON.stringify(selectedRun, null, 2);
    downloadFile(jsonString, `report-${selectedRun.suiteName}-${selectedRun.id}.json`, 'application/json');
  };

  const handleExportHtml = () => {
    if (!selectedRun) return;
    const langCode = t === translations.zh ? 'zh-CN' : 'en';

    // Simplified template for brevity, ideally could be a separate utility
    const htmlContent = `
<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8">
  <title>${t.reports.reportTitle}: ${selectedRun.suiteName}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; color: #333; }
    .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
    .badge { padding: 4px 10px; border-radius: 4px; color: white; font-weight: bold; }
    .success { background: #22c55e; }
    .failed { background: #ef4444; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
    .card-success { border-left: 5px solid #22c55e; }
    .card-failed { border-left: 5px solid #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t.reports.reportTitle}</h1>
    <p>Suite: <strong>${selectedRun.suiteName}</strong> | Time: ${formatDate(selectedRun.runTime)}</p>
    <span class="badge ${selectedRun.success ? 'success' : 'failed'}">
      ${selectedRun.success ? 'PASSED' : 'FAILED'} (${selectedRun.score}%)
    </span>
  </div>
  ${(selectedRun.results || []).map(res => {
      const { column, typeName } = parseExpectationId(res.expectationId, t);
      return `<div class="card ${res.success ? 'card-success' : 'card-failed'}">
        <h3>${column} - ${typeName}</h3>
        <p><strong>Status:</strong> ${res.success ? 'Passed' : 'Failed'}</p>
        <p><strong>Actual:</strong> ${res.observedValue}</p>
      </div>`;
    }).join('')}
</body>
</html>`;
    downloadFile(htmlContent, `report-${selectedRun.suiteName}.html`, 'text/html');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar List */}
      <div className="lg:col-span-4 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">{t.reports.historyTitle}</h3>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {(!history || history.length === 0) && <p className="p-4 text-center text-slate-400 text-sm">{t.reports.noHistory}</p>}
          {(history || []).map(run => (
            <div
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${selectedRunId === run.id
                ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-slate-900">{run.suiteName}</span>
                <div className="flex items-center gap-2">
                  {run.success ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                  {onDelete && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(run.id);
                      }}
                      title={t.dataSource.delete}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={10} /> {formatDate(run.runTime)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${run.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {Math.round(run.score)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {selectedRun ? (
          <>
            <div className="p-6 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t.reports.detailTitle}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <span className="font-medium bg-slate-200 px-2 py-0.5 rounded text-slate-700">{selectedRun.suiteName}</span>
                  <span>•</span>
                  <span>{formatDate(selectedRun.runTime)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-2 mr-2">
                  <button
                    onClick={handleExportJson}
                    title={t.reports.btnExportJson}
                    className="p-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-orange-600 transition-colors"
                  >
                    <FileJson size={18} />
                  </button>
                  <button
                    onClick={handleExportHtml}
                    title={t.reports.btnExportHtml}
                    className="p-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-orange-600 transition-colors"
                  >
                    <FileCode size={18} />
                  </button>
                </div>

                <div className={`px-4 py-2 rounded-lg border ${selectedRun.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} font-bold flex items-center gap-2`}>
                  {selectedRun.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  {selectedRun.success ? t.reports.success : t.reports.fail}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-slate-200 text-center shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold">{t.reports.totalExp}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{(selectedRun.results || []).length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center shadow-sm">
                  <p className="text-xs text-green-600 uppercase font-bold">{t.reports.passed}</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">{(selectedRun.results || []).filter(r => r.success).length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center shadow-sm">
                  <p className="text-xs text-red-600 uppercase font-bold">{t.reports.failed}</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{(selectedRun.results || []).filter(r => !r.success).length}</p>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Search size={18} className="text-slate-400" /> {t.reports.detailBreakdown}
              </h3>

              <div className="space-y-4">
                {(selectedRun.results || []).map((res, idx) => {
                  const { column, typeName } = parseExpectationId(res.expectationId, t);
                  return (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className={`px-4 py-3 border-b flex justify-between items-center ${res.success ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${res.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {res.success ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                          </div>
                          <span className="font-semibold text-slate-700">{typeName}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs uppercase font-bold text-slate-400 mb-1">{t.builder.labelColumn}</p>
                          <p className="font-mono text-sm bg-slate-100 px-2 py-1 rounded inline-block text-slate-700 border border-slate-200">
                            {column}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase font-bold text-slate-400 mb-1">{t.reports.expected}</p>
                          <div className="font-mono text-sm text-slate-700">
                            {renderExpectedValue(res.expectationConfig, typeName, t)}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs uppercase font-bold text-slate-400 mb-1">{t.reports.obsLabel} (Actual)</p>
                          <div className="font-mono text-sm text-slate-700">
                            {/* If there are specific failures, show them here instead of generic text */}
                            {!res.success && res.unexpectedList && res.unexpectedList.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {res.unexpectedList.slice(0, 5).map((val, i) => (
                                  <span key={i} className="text-xs font-mono bg-red-50 border border-red-200 text-red-600 px-1.5 py-0.5 rounded">
                                    {String(val)}
                                  </span>
                                ))}
                                {res.unexpectedList.length > 5 && (
                                  <span className="text-xs text-red-500 italic">
                                    +{res.unexpectedList.length - 5}
                                  </span>
                                )}
                              </div>
                            ) : (
                              // Otherwise show scalar observed value or generic fallback
                              <span>{String(res.observedValue !== "N/A" ? res.observedValue : (res.success ? t.reports.pass : "---"))}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Search size={48} className="mb-4 opacity-20" />
            <p>{t.reports.selectRun}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
