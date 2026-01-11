
import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay for UX
    setTimeout(() => {
      if (username === 'nur6624' && password === 'nur662466') {
        onLogin();
      } else {
        setError('Invalid username or password');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-blue-600 rounded-b-[50%] z-0 shadow-2xl"></div>
      
      <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tiles ERP</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Secure Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-3">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                placeholder="Enter ID"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-3">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl text-center animate-pulse">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center mt-4 disabled:opacity-70"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                Login Access <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
      
      <p className="absolute bottom-6 text-[10px] font-black text-slate-300 uppercase tracking-widest z-0">
        Restricted System • v1.3.0
      </p>
    </div>
  );
};

export default LoginView;
