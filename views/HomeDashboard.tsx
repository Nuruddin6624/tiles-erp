
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import DashboardCard from '../components/DashboardCard';
import { MAIN_MODULES, FINANCIAL_MODULES } from '../constants';
import { BookOpen, Settings, ChevronRight } from 'lucide-react';

const HomeDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      <Header 
        title="Tiles ERP" 
        subtitle="Operations & Accounts" 
      />

      <main className="px-5 py-8">
        {/* Main Grid */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {MAIN_MODULES.map((module) => (
            <div key={module.id} className="h-40">
              <DashboardCard {...module} />
            </div>
          ))}
        </div>

        {/* Financial & Accounts Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Accounts & Lists
            </h2>
            <div className="flex items-center">
               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-2"></div>
               <span className="text-[9px] text-blue-600 font-black uppercase tracking-wider">
                Financials Active
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {FINANCIAL_MODULES.map((module, idx) => {
              if ('path' in module) {
                return (
                  <button 
                    key={idx}
                    onClick={() => navigate(module.path!)}
                    className="flex items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] active:bg-slate-50 transition-all text-left"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-inner ${module.color}`}>
                      {module.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{module.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{module.subtitle}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                );
              }

              return (
                <div 
                  key={idx}
                  className="flex items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm opacity-60 grayscale"
                >
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mr-4 shadow-inner">
                    {module.name === 'Ledger' && <BookOpen size={22} />}
                    {module.name === 'Settings' && <Settings size={22} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800">{module.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Planned Module</p>
                  </div>
                  <div className="bg-slate-50 text-[8px] font-black text-slate-300 px-2 py-1 rounded-md uppercase">Locked</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer info */}
        <footer className="mt-8 py-6 text-center border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Tiles ERP • v1.3.0 Financial Update
          </p>
          <div className="mt-3 flex justify-center space-x-3">
            <span className="text-[9px] text-blue-600 font-black">EN</span>
            <span className="text-[9px] text-slate-300">|</span>
            <span className="text-[9px] text-slate-400 font-bold">BN</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HomeDashboard;
