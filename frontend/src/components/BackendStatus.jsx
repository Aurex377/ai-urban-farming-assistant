import { useState, useEffect } from 'react';
import { checkBackendHealth, checkDatabaseHealth } from '../services/api';
import { Server, Database, RefreshCw } from 'lucide-react';

export default function BackendStatus() {
  const [loading, setLoading] = useState(true);
  const [backendState, setBackendState] = useState({
    status: 'checking', // 'checking' | 'connected' | 'offline'
    message: '',
  });
  const [dbState, setDbState] = useState({
    status: 'checking', // 'checking' | 'connected' | 'failed'
    message: '',
  });

  const verifyConnection = async () => {
    setLoading(true);

    // Test Backend Health
    try {
      const backendRes = await checkBackendHealth();
      if (backendRes && backendRes.status === 'healthy') {
        setBackendState({
          status: 'connected',
          message: 'FastAPI server is running',
        });
      } else {
        setBackendState({
          status: 'offline',
          message: 'Unexpected backend response',
        });
      }
    } catch {
      setBackendState({
        status: 'offline',
        message: 'Please make sure the FastAPI server is running on port 8000.',
      });
    }

    // Test Database Health
    try {
      const dbRes = await checkDatabaseHealth();
      if (dbRes && dbRes.status === 'connected') {
        setDbState({
          status: 'connected',
          message: 'Supabase reachable',
        });
      } else {
        setDbState({
          status: 'failed',
          message: dbRes?.message || 'Database unreachable',
        });
      }
    } catch {
      setDbState({
        status: 'failed',
        message: 'Database connection failed',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyConnection();
  }, []);

  return (
    <div className="mb-8 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-all">
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-gray-400" />
          System Status:
        </span>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="text-xs font-medium">Checking connection...</span>
          </div>
        ) : (
          <>
            {/* Backend Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
                backendState.status === 'connected'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span className="text-xs">
                {backendState.status === 'connected' ? '🟢' : '🔴'}
              </span>
              <span>
                {backendState.status === 'connected'
                  ? 'Backend Connected'
                  : 'Backend Offline'}
              </span>
              <span className="text-[11px] opacity-80 hidden sm:inline">
                • {backendState.message}
              </span>
            </div>

            {/* Database Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
                dbState.status === 'connected'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span className="text-xs">
                {dbState.status === 'connected' ? '🟢' : '🔴'}
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 opacity-70" />
                {dbState.status === 'connected'
                  ? 'Database Connected'
                  : 'Database Connection Failed'}
              </span>
            </div>
          </>
        )}
      </div>

      <button
        onClick={verifyConnection}
        disabled={loading}
        title="Recheck backend and database status"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span>Recheck</span>
      </button>
    </div>
  );
}
