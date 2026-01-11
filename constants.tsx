
import React from 'react';
import { Receipt, LayoutGrid, ClipboardList, BarChart3, Wallet, BadgeIndianRupee } from 'lucide-react';
import { DashboardCardProps } from './types';

export const MAIN_MODULES: DashboardCardProps[] = [
  {
    id: 'invoice',
    title: 'Invoice',
    description: 'Create, view and manage invoices',
    icon: <Receipt size={32} />,
    color: 'bg-blue-50 text-blue-600',
    path: '/invoice'
  },
  {
    id: 'tiles-order',
    title: 'Tiles Order',
    description: 'Tiles order & quantity tracking',
    icon: <LayoutGrid size={32} />,
    color: 'bg-emerald-50 text-emerald-600',
    path: '/tiles-order'
  },
  {
    id: 'so-entry',
    title: 'SO Entry',
    description: 'Sales order entry management',
    icon: <ClipboardList size={32} />,
    color: 'bg-orange-50 text-orange-600',
    path: '/so-entry'
  },
  {
    id: 'reports',
    title: 'All Reports',
    description: 'Invoice, Order & SO reports',
    icon: <BarChart3 size={32} />,
    color: 'bg-indigo-50 text-indigo-600',
    path: '/reports'
  }
];

export const FINANCIAL_MODULES = [
  { 
    id: 'advance-list',
    name: 'Advance List', 
    subtitle: 'Track pre-payments',
    icon: <Wallet size={22} />, 
    color: 'text-emerald-600 bg-emerald-50',
    path: '/advance-due' 
  },
  { 
    id: 'due-entry',
    name: 'Due List Entry', 
    subtitle: 'Manage credit balances',
    icon: <BadgeIndianRupee size={22} />, 
    color: 'text-rose-600 bg-rose-50',
    path: '/advance-due' 
  },
  { name: 'Ledger', icon: 'BookOpen' },
  { name: 'Settings', icon: 'Settings' }
];
