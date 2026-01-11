
import React from 'react';
import { HeaderProps } from '../types';

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100 shadow-sm px-6 py-5">
      <div className="flex flex-col">
        <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight uppercase">
          {title}
        </h1>
        <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
          {subtitle}
        </p>
      </div>
    </header>
  );
};

export default Header;
