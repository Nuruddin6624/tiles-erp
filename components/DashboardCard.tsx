
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardCardProps } from '../types';

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, color, path }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-start p-5 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-200 active:scale-95 active:bg-gray-50 text-left h-full"
    >
      <div className={`p-3 rounded-xl mb-4 ${color}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-snug">
        {description}
      </p>
    </button>
  );
};

export default DashboardCard;
