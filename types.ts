
import { ReactNode } from 'react';

export interface DashboardCardProps {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  path: string;
}

export interface HeaderProps {
  title: string;
  subtitle: string;
}
