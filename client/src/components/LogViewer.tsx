import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertCircle, CheckCircle, Info, AlertTriangle, Bug, 
  RefreshCw, Filter, Search, Trash2, Download, X,
  ChevronDown, ChevronUp
} from 'lucide-react';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
}

interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<string, number>;
  recentErrors: LogEntry[];
}

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch logs
  const logsQuery = useQuery({
    queryKey: ['/api/logs', selectedLevel, selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLevel) params.append('level', selectedLevel);
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '200');
      
      const response = await fetch(`/api/logs?${params}`);
      if (!response.ok) throw new Error('Error fetching logs');
      return response.json() as Promise<{ logs: LogEntry[]; total: number }>;
    },
    refetchInterval: autoRefresh ? 3000 : false,
  });

  // Fetch stats
  const statsQuery = useQuery({
    queryKey: ['/api/logs/stats'],
    queryFn: async () => {
      const response = await fetch('/api/logs/stats');
      if (!response.ok) throw new Error('Error fetching stats');
      return response.json() as Promise<LogStats>;
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['/api/logs/categories'],
    queryFn: async () => {
      const response = await fetch('/api/logs/categories');
      if (!response.ok) throw new Error('Error fetching categories');
      return response.json() as Promise<string[]>;
    },
  });

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'debug': return <Bug className="w-4 h-4 text-purple-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warn': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'debug': return 'bg-purple-50 border-purple-200 text-purple-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  const downloadLogs = () => {
    if (!logsQuery.data) return;
    const content = logsQuery.data.logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.details ? '\n  Details: ' + JSON.stringify(log.details) : ''}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Bug className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Sistema de Logs</h2>
              <p className="text-sm text-gray-500">
                {logsQuery.data?.total || 0} registros totales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        {statsQuery.data && (
          <div className="flex gap-4 p-3 bg-gray-100 border-b overflow-x-auto">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full text-sm">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{statsQuery.data.byLevel.info}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium">{statsQuery.data.byLevel.success}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium">{statsQuery.data.byLevel.warn}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full text-sm">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="font-medium">{statsQuery.data.byLevel.error}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-full text-sm">
              <Bug className="w-4 h-4 text-purple-600" />
              <span className="font-medium">{statsQuery.data.byLevel.debug}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-4 border-b bg-white">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as LogLevel | '')}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los niveles</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las categorías</option>
            {categoriesQuery.data?.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Actions */}
          <button
            onClick={() => logsQuery.refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${logsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refrescar
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {autoRefresh ? '⏸ Auto' : '▶ Auto'}
          </button>

          <button
            onClick={downloadLogs}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        {/* Logs List */}
        <div 
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50"
        >
          {logsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : logsQuery.data?.logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron logs con los filtros seleccionados
            </div>
          ) : (
            logsQuery.data?.logs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg p-3 ${getLevelColor(log.level)} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="px-2 py-0.5 bg-white bg-opacity-50 rounded text-xs font-medium">
                        {log.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        log.level === 'error' ? 'bg-red-200 text-red-800' :
                        log.level === 'warn' ? 'bg-yellow-200 text-yellow-800' :
                        log.level === 'success' ? 'bg-green-200 text-green-800' :
                        log.level === 'debug' ? 'bg-purple-200 text-purple-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {log.level}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium break-words">
                      {log.message}
                    </p>
                    {log.details && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                        >
                          {expandedLogs.has(log.id) ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          Detalles
                        </button>
                        {expandedLogs.has(log.id) && (
                          <pre className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 rounded-b-xl text-center text-sm text-gray-500">
          Mostrando {logsQuery.data?.logs.length || 0} de {logsQuery.data?.total || 0} logs
          {autoRefresh && <span className="ml-2 text-green-600">• Auto-refresh activo</span>}
        </div>
      </div>
    </div>
  );
}

