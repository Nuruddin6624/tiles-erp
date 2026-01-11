
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface PlaceholderProps {
  title: string;
}

const PlaceholderScreen: React.FC<PlaceholderProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 py-4 border-b border-gray-100 flex items-center shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-full active:bg-gray-100"
        >
          <ChevronLeft size={24} className="text-slate-800" />
        </button>
        <h1 className="ml-2 text-lg font-semibold text-slate-800">{title}</h1>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Module Under Development</h2>
        <p className="text-slate-500">
          The <span className="font-semibold text-blue-600">{title}</span> module is currently being built. 
          Please check back soon for the full functional experience.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-8 px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl active:scale-95 transition-transform"
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
};

export default PlaceholderScreen;
