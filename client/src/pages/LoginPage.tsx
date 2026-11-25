import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Shield, Sparkles, User, Lock, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('manager@ops.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/roster');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
    try {
      await login(demoEmail, 'password123');
      navigate('/roster');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-lg shadow-indigo-600/30">
            SR
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Smart Roster System</h2>
          <p className="text-sm text-slate-400">
            D2C Multi-Brand Operations &amp; Constraint Scheduling Platform
          </p>
        </div>

        {/* Demo Persona Quick Select */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Select Demo Persona (1-Click Login):</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('manager@ops.com')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-indigo-500 text-left transition group"
            >
              <span className="block text-[10px] font-bold uppercase text-amber-400">Manager</span>
              <span className="block text-xs font-semibold text-white truncate">Aditya Mgr</span>
              <span className="block text-[10px] text-slate-400">Full Override</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('lead.pod1@ops.com')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-indigo-500 text-left transition group"
            >
              <span className="block text-[10px] font-bold uppercase text-blue-400">Pod Lead</span>
              <span className="block text-xs font-semibold text-white truncate">Vikram M.</span>
              <span className="block text-[10px] text-slate-400">Pod 1 Lead</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('riya.sharma@ops.com')}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-indigo-500 text-left transition group"
            >
              <span className="block text-[10px] font-bold uppercase text-emerald-400">Viewer</span>
              <span className="block text-xs font-semibold text-white truncate">Riya S.</span>
              <span className="block text-[10px] text-slate-400">Zing Demo Sole</span>
            </button>
          </div>
        </div>

        {/* Standard Credentials Form */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-xs text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 text-white text-sm border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 focus:border-indigo-500 focus:outline-none"
                  placeholder="manager@ops.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 text-white text-sm border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 focus:border-indigo-500 focus:outline-none"
                  placeholder="password123"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Operations'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
