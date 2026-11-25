import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Shield, User, LogOut, ChevronDown, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchPersona } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
          SR
        </div>
        <div>
          <h1 className="font-semibold text-slate-800 text-sm leading-tight">Smart Roster Engine</h1>
          <p className="text-xs text-slate-500">D2C Operations Multi-Brand System</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Quick persona switcher for reviewer demo */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
          <span className="text-xs font-medium text-slate-500 px-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Demo Persona:
          </span>
          <button
            onClick={() => switchPersona('manager@ops.com')}
            className={`text-xs px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'manager'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => switchPersona('lead.pod1@ops.com')}
            className={`text-xs px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'pod_lead'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            Pod Lead
          </button>
          <button
            onClick={() => switchPersona('riya.sharma@ops.com')}
            className={`text-xs px-2.5 py-1 rounded font-medium transition ${
              user?.role === 'viewer'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            Viewer (Riya)
          </button>
        </div>

        {/* Current user badge */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800 leading-tight">{user?.name || 'User'}</p>
            <span
              className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                user?.role === 'manager'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : user?.role === 'pod_lead'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {user?.role?.replace('_', ' ') || 'viewer'}
            </span>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
