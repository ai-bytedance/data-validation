
import React, { useState } from 'react';
import { ValidationResult } from '../types';
import { CheckCircle, XCircle, Search, Calendar, AlertOctagon, Download, FileJson, FileCode } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../translations';

interface ReportsProps {
  history: ValidationResult[];
}

const Reports: React.FC<ReportsProps> = ({ history }) => {
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
    
    // Determine language code for HTML tag
    const langCode = t === translations.zh ? 'zh-CN' : 'en';

    const htmlContent = `
<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8">
  <title>${t.reports.reportTitle}: ${selectedRun.suiteName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #333; }
    h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .badge { padding: 5px 12px; border-radius: 4px; font-weight: bold; color: white; }
    .success { background-color: #22c55e; }
    .failed { background-color: #ef4444; }
    .stats { display: flex; gap: 20px; margin-bottom: 30px; }
    .stat-card { flex: 1; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; display: block; margin-top: 5px; }
    .exp-item { border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 10px; border-radius: 6px; }
    .exp-header { display: flex; justify-content: space-between; font-weight: 500; }
    .exp-status { font-weight: bold; }
    .text-green { color: #16a34a; }
    .text-red { color: #dc2626; }
    .obs-value { margin-top: 8px; font-size: 14px; color: #64748b; }
    .error-samples { margin-top: 10px; background: #fef2f2; border: 1px solid #fee2e2; padding: 10px; border-radius: 4px; font-size: 12px; }
    .sample-tag { display: inline-block; background: white; border: 1px solid #fecaca; padding: 2px 6px; margin: 2px; border-radius: 3px; color: #b91c1c; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${t.reports.reportTitle}</h1>
      <p style="color: #666;">${t.reports.suite}: <strong>${selectedRun.suiteName}</strong> | ${t.reports.time}: ${selectedRun.runTime}</p>
    </div>
    <div class="badge ${selectedRun.success ? 'success' : 'failed'}">
      ${selectedRun.success ? (t.reports.success as string).toUpperCase() : (t.reports.fail as string).toUpperCase()} (${Math.round(selectedRun.score)}%)
    </div>
  </div>

  <div class="stats">
     <div class="stat-card">
       <span>${t.reports.totalExp}</span>
       <span class="stat-value">${selectedRun.results.length}</span>
     </div>
     <div class="stat-card" style="background-color: #f0fdf4; border-color: #dcfce7;">
       <span>${t.reports.passed}</span>
       <span class="stat-value" style="color: #166534;">${selectedRun.results.filter(r => r.success).length}</span>
     </div>
     <div class="stat-card" style="background-color: #fef2f2; border-color: #fee2e2;">
       <span>${t.reports.failed}</span>
       <span class="stat-value" style="color: #991b1b;">${selectedRun.results.filter(r => !r.success).length}</span>
     </div>
  </div>

  <h2>${t.reports.detailBreakdown}</h2>
  ${selectedRun.results.map(res => `
    <div class="exp-item" style="border-left: 4px solid ${res.success ? '#22c55e' : '#ef4444'}">
      <div class="exp-header">
         <span>${t.reports.expId}: ${res.expectationId}</span>
         <span class="exp-status ${res.success ? 'text-green' : 'text-red'}">${res.success ? t.reports.success : t.reports.fail}</span>
      </div>
      <div class="obs-value">
        ${t.reports.obsLabel}: ${res.observedValue}
      </div>
      ${!res.success && res.unexpectedList && res.unexpectedList.length > 0 ? `
         <div class="error-samples">
           <strong>${t.reports.sampleValues}:</strong><br/>
           ${res.unexpectedList.map(v => `<span class="sample-tag">${v}</span>`).join('')}
           ${res.unexpectedCount > res.unexpectedList.length ? `<i>(+${res.unexpectedCount - res.unexpectedList.length} more)</i>` : ''}
         </div>
      ` : ''}
    </div>
  `).join('')}
  
  <p style="text-align: center; margin-top: 40px; color: #999; font-size: 12px;">${t.reports.generatedBy}</p>
</body>
</html>
    `;

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
          {history.length === 0 && <p className="p-4 text-center text-slate-400 text-sm">{t.reports.noHistory}</p>}
          {history.map(run => (
            <div 
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedRunId === run.id 
                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' 
                  : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
               <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-slate-900">{run.suiteName}</span>
                  {run.success ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-500"/>}
               </div>
               <div className="flex justify-between items-end">
                 <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={10}/> {run.runTime}</span>
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
                   <p className="text-sm text-slate-500 mt-1">{t.runner.suite}: {selectedRun.suiteName} • {selectedRun.runTime}</p>
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
                        {selectedRun.success ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                        {selectedRun.success ? t.reports.success : t.reports.fail}
                    </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6">
               <div className="grid grid-cols-3 gap-4 mb-8">
                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">{t.reports.totalExp}</p>
                    <p className="text-2xl font-bold text-slate-800">{selectedRun.results.length}</p>
                 </div>
                 <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                    <p className="text-xs text-green-600 uppercase font-bold">{t.reports.passed}</p>
                    <p className="text-2xl font-bold text-green-700">{selectedRun.results.filter(r => r.success).length}</p>
                 </div>
                 <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                    <p className="text-xs text-red-600 uppercase font-bold">{t.reports.failed}</p>
                    <p className="text-2xl font-bold text-red-700">{selectedRun.results.filter(r => !r.success).length}</p>
                 </div>
               </div>

               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Search size={18} className="text-slate-400"/> {t.reports.detailBreakdown}
               </h3>
               
               <div className="space-y-3">
                 {selectedRun.results.map((res, idx) => (
                   <div key={idx} className="border border-slate-200 rounded-lg p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                      <div className={`mt-1 flex-shrink-0 ${res.success ? 'text-green-500' : 'text-red-500'}`}>
                         {res.success ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                           <p className="font-mono text-sm font-medium text-slate-700 truncate">ID: {res.expectationId.substring(0,8)}...</p>
                           <span className={`text-xs font-bold ${res.success ? 'text-green-600' : 'text-red-600'}`}>
                             {res.success ? t.reports.success : t.reports.fail}
                           </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                           {res.observedValue}
                        </p>
                        
                        {!res.success && (
                            <div className="mt-3">
                                {res.unexpectedList && res.unexpectedList.length > 0 && (
                                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                        <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                                            <AlertOctagon size={12}/> {t.reports.sampleValues}:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {res.unexpectedList.map((val, i) => (
                                                <span key={i} className="text-xs font-mono bg-white border border-red-200 text-red-600 px-2 py-1 rounded shadow-sm">
                                                    {String(val)}
                                                </span>
                                            ))}
                                            {res.unexpectedCount > res.unexpectedList.length && (
                                                <span className="text-xs text-red-500 italic px-1">
                                                    (+{res.unexpectedCount - res.unexpectedList.length} more)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                      </div>
                   </div>
                 ))}
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
