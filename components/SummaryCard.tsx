
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant: 'success' | 'danger' | 'info' | 'primary';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, variant }) => {
  const variants = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    danger: 'bg-rose-50 border-rose-100 text-rose-700',
    info: 'bg-sky-50 border-sky-100 text-sky-700',
    primary: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  };

  return (
    <div className={`p-6 rounded-2xl border-2 shadow-sm transition-all hover:shadow-md ${variants[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold uppercase tracking-wider opacity-80">{title}</span>
        <div className="p-2 rounded-lg bg-white bg-opacity-50">{icon}</div>
      </div>
      <div className="text-2xl font-bold">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </div>
    </div>
  );
};

export default SummaryCard;
