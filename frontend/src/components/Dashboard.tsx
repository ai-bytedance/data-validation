import React from 'react';
import { ValidationResult, Dataset, ViewState } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { CheckCircle, XCircle, FileInput, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  history: ValidationResult[];
  dataset: Dataset | null;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ history, dataset, onNavigate }) => {
  const { t } = useLanguage();
  const totalRuns = history.length;
  const passedRuns = history.filter(h => h.success).length;
  const failedRuns = totalRuns - passedRuns;
  const avgScore = totalRuns > 0 ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / totalRuns) : 0;

  const chartData = history.slice(0, 10).reverse().map((h, i) => ({
    name: `Run ${history.length - i}`,
    score: h.score,
    status: h.success ? 'Success' : 'Failed'
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">{t.dashboard.totalRuns}</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalRuns}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ShieldAlert size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">{t.dashboard.passRate}</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">
                {totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0}%
              </h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">{t.dashboard.avgScore}</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{avgScore}%</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">{t.dashboard.currentDataset}</p>
              <h3 className="text-lg font-bold text-slate-900 mt-2 truncate max-w-[150px]">
                {dataset ? dataset.name : t.dashboard.none}
              </h3>
              {!dataset && (
                 <button onClick={() => onNavigate('DATA_SOURCE')} className="text-xs text-orange-600 font-medium hover:underline mt-1">{t.dashboard.connectData} &rarr;</button>
              )}
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <FileInput size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">{t.dashboard.trendTitle}</h3>
          {history.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <ShieldAlert size={48} className="mb-2 opacity-50" />
               <p>{t.dashboard.noData}</p>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value, name) => [value, name === 'score' ? t.dashboard.score : name]} labelStyle={{ color: '#475569' }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score === 100 ? '#22c55e' : entry.score > 70 ? '#eab308' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 overflow-y-auto">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">{t.dashboard.recentActivity}</h3>
          {history.length === 0 ? (
            <p className="text-slate-400 text-sm italic">{t.dashboard.noActivity}</p>
          ) : (
            <div className="space-y-4">
              {history.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    {run.success ? (
                      <CheckCircle className="text-green-500" size={18} />
                    ) : (
                      <XCircle className="text-red-500" size={18} />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{run.suiteName}</p>
                      <p className="text-xs text-slate-500">{run.runTime}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${run.score === 100 ? 'text-green-600' : run.score > 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {Math.round(run.score)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
