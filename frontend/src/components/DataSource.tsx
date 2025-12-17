import React, { useRef, useState } from 'react';
import { Dataset, DbConnectionConfig } from '../types';
import { api } from '../api'; // Ensure api.ts has previewDataset method or we use ad-hoc fetch
import { Upload, FileSpreadsheet, Table, Database, Server, Network, HardDrive, X, Loader2, Info, FileJson, File as FileIcon, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DataSourceProps {
  onDataLoaded: (dataset: Dataset) => void;
  currentDataset: Dataset | null;
  allDatasets?: Dataset[];
  onDelete?: (id: string) => void;
  onSelect?: (dataset: Dataset) => void;
}

const DataSource: React.FC<DataSourceProps> = ({ onDataLoaded, currentDataset, allDatasets, onDelete, onSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // DB Modal State
  const [showDbModal, setShowDbModal] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testError, setTestError] = useState<string | null>(null); // Separate error for test connection
  const [showPassword, setShowPassword] = useState(false);

  // DB Form State
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPass, setDbPass] = useState('');
  const [dbName, setDbName] = useState('');
  const [dbTable, setDbTable] = useState('');

  const { t, language } = useLanguage();

  // Simple UUID generator for non-secure contexts
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Upload File & Get Preview from Backend
      const { file_path, headers, sample_rows } = await api.uploadFile(file);

      // 2. Create Dataset record
      const newDataset: Partial<Dataset> = {
        id: generateId(),
        name: file.name,
        headers: headers || [],
        rows: sample_rows || [],
        file_path,
        rawCsv: ""
      };

      // 3. Save to Backend
      try {
        const saved = await api.createDataset(newDataset);
        onDataLoaded({ ...saved, rows: newDataset.rows || [], headers: newDataset.headers || [] });
      } catch (err) {
        setError("Failed to save dataset to backend");
      }

    } catch (err) {
      console.error("Upload error:", err);
      setError(t.dataSource.parseError);
    }
  };

  const openDbModal = (type: string) => {
    setShowDbModal(type);
    setTestSuccess(null);
    setTestError(null);
    setError(null);
    setShowPassword(false);

    // Set database-specific defaults
    if (type === 'SQLite') {
      setDbHost('./data/database.db'); // SQLite file path
      setDbPort('');
      setDbUser('');
      setDbPass('');
      setDbName('');
      setDbTable('');
    } else if (type === 'MySQL') {
      setDbHost('127.0.0.1');
      setDbPort('3306');
      setDbUser('root');
      setDbPass('');
      setDbName('');
      setDbTable('');
    } else if (type === 'PostgreSQL') {
      setDbHost('127.0.0.1');
      setDbPort('5432');
      setDbUser('postgres');
      setDbPass('');
      setDbName('');
      setDbTable('');
    } else if (type === 'SQL Server') {
      setDbHost('127.0.0.1');
      setDbPort('1433');
      setDbUser('sa');
      setDbPass('');
      setDbName('');
      setDbTable('');
    } else if (type === 'Oracle') {
      setDbHost('127.0.0.1');
      setDbPort('1521');
      setDbUser('system');
      setDbPass('');
      setDbName('');
      setDbTable('');
    } else {
      // MongoDB, Neo4j, Hive - generic defaults
      setDbHost('127.0.0.1');
      setDbPort('');
      setDbUser('');
      setDbPass('');
      setDbName('');
      setDbTable('');
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestError(null); // Use testError instead of error
    setTestSuccess(null);

    try {
      const dbConfig: DbConnectionConfig = {
        type: showDbModal as any,
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: dbUser,
        password: dbPass,
        table: dbTable
      };

      const tempDatasetForPreview: Partial<Dataset> = {
        db_config: dbConfig
      } as any;

      await api.previewDataset(tempDatasetForPreview);
      setTestSuccess(true);
    } catch (e: any) {
      setTestSuccess(false);
      // Parse and translate common database errors
      let errorMessage = e.message || t.dataSource.connectionFailed;

      // Common error patterns and their translations
      if (errorMessage.includes('Connection refused') || errorMessage.includes('Errno 111')) {
        errorMessage = language === 'zh'
          ? '连接被拒绝：无法连接到数据库服务器，请检查主机地址、端口和防火墙设置'
          : 'Connection refused: Cannot connect to database server. Please check host, port, and firewall settings';
      } else if (errorMessage.includes('Name or service not known') || errorMessage.includes('Errno -2')) {
        errorMessage = language === 'zh'
          ? '主机名无法解析：请检查主机地址是否正确'
          : 'Hostname cannot be resolved: Please check if the host address is correct';
      } else if (errorMessage.includes('Access denied')) {
        errorMessage = language === 'zh'
          ? '访问被拒绝：用户名或密码错误'
          : 'Access denied: Incorrect username or password';
      } else if (errorMessage.includes('Unknown database')) {
        errorMessage = language === 'zh'
          ? '数据库不存在：请检查数据库名称是否正确'
          : 'Unknown database: Please check if the database name is correct';
      } else if (errorMessage.includes('driver') || errorMessage.includes('not installed')) {
        errorMessage = language === 'zh'
          ? '数据库驱动未安装：' + errorMessage
          : 'Database driver not installed: ' + errorMessage;
      } else if (errorMessage.includes('syntax error')) {
        errorMessage = language === 'zh'
          ? 'SQL 语法错误：请检查表名和数据库配置是否正确'
          : 'SQL syntax error: Please check if table name and database configuration are correct';
      } else if (errorMessage.includes('no such table')) {
        errorMessage = language === 'zh'
          ? '表不存在：请检查表名是否正确'
          : 'Table does not exist: Please check if the table name is correct';
      } else if (errorMessage.includes('SQLite requires a database file path')) {
        errorMessage = language === 'zh'
          ? 'SQLite 需要数据库文件路径：请在"主机地址"或"数据库名"字段中指定 .db 文件的路径'
          : 'SQLite requires a database file path: Please specify the .db file path in the "Host" or "Database" field';
      } else if (errorMessage.includes('SQLite database file is invalid')) {
        errorMessage = language === 'zh'
          ? 'SQLite 数据库文件无效：请检查文件路径是否正确且文件可访问'
          : 'SQLite database file is invalid: Please check if the file path is correct and accessible';
      }

      setTestError(errorMessage); // Use testError instead of error
    } finally {
      setIsTesting(false);
    }
  };

  const handleDbConnect = () => {
    setIsConnecting(true);
    setError(null);

    // Validate inputs
    if (!dbHost || !dbUser || !dbTable) {
      setError(t.dataSource.validationError);
      setIsConnecting(false);
      return;
    }

    // Simulate "Checking connection"
    // Verify Connection and Get Preview
    // We can't rely on setTimeout logic anymore. We need a real API call.
    // However, existing createDataset now does a connection check on backend.

    (async () => {
      try {
        const dbConfig: DbConnectionConfig = {
          type: showDbModal as any,
          host: dbHost,
          port: dbPort,
          database: dbName,
          username: dbUser,
          password: dbPass,
          table: dbTable
        };

        const tempDatasetForPreview: Partial<Dataset> = {
          db_config: dbConfig // Use lower case to match SQLModel
        } as any;

        // We need a preview endpoint or rely on createDataset throwing error
        // Previously we used logic "simulate connection".
        // Since we updated create_dataset to check connection, we can just try creating it.
        // AND we need schema headers.

        // For better UX, let's call the new preview endpoint first

        const previewData = await api.previewDataset(tempDatasetForPreview);

        const newDataset: Partial<Dataset> = {
          id: generateId(),
          name: `${showDbModal}: ${dbTable}`,
          headers: previewData.headers || [],
          rows: previewData.rows || [],
          dbConfig
        };

        const saved = await api.createDataset(newDataset);
        onDataLoaded({ ...saved, rows: newDataset.rows || [], headers: newDataset.headers || [] });

        setIsConnecting(false);
        setShowDbModal(null);
      } catch (e) {
        console.error(e);
        setIsConnecting(false);
        setError("Failed to connect to database or invalid configuration.");
      }
    })();
  };

  const dbOptions = [
    { id: 'MySQL', icon: <Database className="text-blue-600" size={32} />, label: t.dataSource.dbMysql },
    { id: 'PostgreSQL', icon: <Server className="text-indigo-600" size={32} />, label: t.dataSource.dbPostgres },
    { id: 'SQL Server', icon: <Server className="text-blue-800" size={32} />, label: t.dataSource.dbSqlServer },
    { id: 'Oracle', icon: <Database className="text-red-600" size={32} />, label: t.dataSource.dbOracle },
    { id: 'MongoDB', icon: <FileJson className="text-green-600" size={32} />, label: t.dataSource.dbMongo },
    { id: 'Neo4j', icon: <Network className="text-green-600" size={32} />, label: t.dataSource.dbNeo4j },
    { id: 'Hive', icon: <HardDrive className="text-yellow-600" size={32} />, label: t.dataSource.dbHive },
    { id: 'SQLite', icon: <FileIcon className="text-slate-600" size={32} />, label: t.dataSource.dbSqlite },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.dataSource.title}</h2>
        <p className="text-slate-500 mb-8">{t.dataSource.subtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all h-64"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv"
            />
            <div className="bg-orange-100 p-4 rounded-full text-orange-600 mb-4">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{t.dataSource.uploadTitle}</h3>
            <p className="text-sm text-slate-500 mt-2">{t.dataSource.uploadDesc}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 h-64 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="text-slate-400" size={24} />
              <h3 className="font-semibold text-slate-700">{t.dataSource.supportedTitle}</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>{t.dataSource.formatCsv}</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>{t.dataSource.formatHeader}</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>{t.dataSource.formatSize}</li>
            </ul>
          </div>
        </div>

        {/* Database Section */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Database size={20} className="text-slate-400" />
            {t.dataSource.connectDatabase}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dbOptions.map(db => (
              <div
                key={db.id}
                onClick={() => openDbModal(db.id)}
                className="border border-slate-200 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="transform group-hover:scale-110 transition-transform duration-300">
                  {db.icon}
                </div>
                <span className="font-medium text-slate-700">{db.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {/* Recent Datasets List */}
        {allDatasets && allDatasets.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><div className="w-2 h-8 bg-orange-500 rounded-full"></div>{t.dataSource['recent']}</h3>
            <div className="grid grid-cols-1 gap-3">
              {(showAll ? allDatasets : allDatasets.slice(0, 5)).map(ds => (
                <div key={ds.id} className={`p-4 rounded-lg border flex justify-between items-center transition-all ${currentDataset?.id === ds.id ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                  <div className="flex-1 cursor-pointer" onClick={async () => {
                    if (onSelect) {
                      try {
                        // Hydrate data (fetch preview rows)
                        const fullDs = await api.getDataset(ds.id);
                        onSelect(fullDs);
                      } catch (e) {
                        console.error("Failed to load dataset details", e);
                        onSelect(ds);
                      }
                    }
                  }}>
                    <div className="font-bold text-slate-700">{ds.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{ds.created_at ? new Date(ds.created_at).toLocaleString() : 'Just now'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {currentDataset?.id === ds.id && <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">{t.dataSource['active']}</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete && onDelete(ds.id); }}
                      className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title={t.dataSource['deleteTitle']}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {allDatasets.length > 5 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-slate-500 hover:text-orange-600 font-medium flex items-center gap-1 px-4 py-2 hover:bg-slate-50 rounded-full transition-colors"
                >
                  {showAll ? t.dataSource.showLess : t.dataSource.showMore}
                  {showAll ? <div className="rotate-180 transition-transform">^</div> : <div className="transition-transform">v</div>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {currentDataset && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-center sm:justify-between flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Table size={20} className="text-slate-500" />
              {t.dataSource.previewTitle}: {currentDataset.name}
            </h3>
            <div className="flex items-center gap-2">
              {currentDataset.dbConfig && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 font-medium">
                  DB: {currentDataset.dbConfig.host} / {currentDataset.dbConfig.database}
                </span>
              )}
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {t.dataSource.rowsCols
                  .replace('{rows}', String(currentDataset.rows.length))
                  .replace('{cols}', String(currentDataset.headers.length))}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  {currentDataset.headers.map(h => (
                    <th key={h} className="px-6 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentDataset.rows.length === 0 ? (
                  <tr>
                    <td colSpan={currentDataset.headers.length} className="px-6 py-8 text-center text-slate-400 italic">
                      No data available to preview
                    </td>
                  </tr>
                ) : (
                  currentDataset.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      {currentDataset.headers.map((h, j) => {
                        const val = row[h];
                        // Safely handle null/undefined and convert to string to prevent rendering crash
                        const displayVal = val !== null && val !== undefined ? String(val) : '';
                        return (
                          <td key={`${i}-${j}`} className="px-6 py-3 text-slate-700 whitespace-nowrap">
                            {displayVal.substring(0, 30)}
                            {displayVal.length > 30 ? '...' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-200">
            {t.dataSource.previewNote}
          </div>
        </div>
      )}

      {/* DB Connection Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {dbOptions.find(d => d.id === showDbModal)?.icon}
                {t.dataSource.dbModalTitle.replace('{type}', showDbModal)}
              </h3>
              <button onClick={() => setShowDbModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm mb-8 flex gap-3">
                <Info size={20} className="shrink-0 mt-0.5" />
                <div>
                  {t.dataSource.dbDisclaimer}
                </div>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="space-y-5">
                  <h4 className="font-bold text-slate-700 text-base border-b pb-3">{t.dataSource.configSection}</h4>

                  {/* SQLite-specific configuration */}
                  {showDbModal === 'SQLite' ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.sqliteFilePath}</label>
                        <input
                          value={dbHost}
                          onChange={e => setDbHost(e.target.value)}
                          type="text"
                          placeholder={t.dataSource.sqliteFilePathPlaceholder}
                          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-2">{t.dataSource.sqliteFilePathDesc}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.dbTable}</label>
                        <input value={dbTable} onChange={e => setDbTable(e.target.value)} type="text" placeholder="users" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </>
                  ) : (
                    /* Network database configuration */
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.dbHost}</label>
                        <input value={dbHost} onChange={e => setDbHost(e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.dbPort}</label>
                          <input value={dbPort} onChange={e => setDbPort(e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.dbUser}</label>
                          <input value={dbUser} onChange={e => setDbUser(e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.dbName}</label>
                          <input value={dbName} onChange={e => setDbName(e.target.value)} type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.dbPass}</label>
                          <div className="relative">
                            <input
                              value={dbPass}
                              onChange={e => setDbPass(e.target.value)}
                              type={showPassword ? "text" : "password"}
                              placeholder={t.dataSource.passwordPlaceholder}
                              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              title={showPassword ? t.dataSource.hidePassword : t.dataSource.showPassword}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-2">{t.dataSource.dbTable}</label>
                        <input value={dbTable} onChange={e => setDbTable(e.target.value)} type="text" placeholder="users" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </>
                  )}

                  {/* Test Connection Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="w-full bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed font-medium border border-slate-300 transition-colors"
                    >
                      {isTesting ? <Loader2 className="animate-spin" size={18} /> : null}
                      {isTesting ? t.dataSource.connecting : t.dataSource.testConnection}
                    </button>
                    {testSuccess === true && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
                        <CheckCircle size={16} />
                        {t.dataSource.connectionSuccess}
                      </div>
                    )}
                    {testSuccess === false && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {testError || t.dataSource.connectionFailed}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-4">
              <button onClick={() => setShowDbModal(null)} className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors">
                {t.builder.btnClose}
              </button>
              <button
                onClick={handleDbConnect}
                disabled={isConnecting}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
              >
                {isConnecting ? <Loader2 className="animate-spin" size={18} /> : null}
                {isConnecting ? t.dataSource.connecting : t.dataSource.btnConnect}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSource;