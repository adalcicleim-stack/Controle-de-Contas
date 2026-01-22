import React from 'react';
import { 
  Zap, 
  Droplets, 
  Map, 
  Sun, 
  Fuel, 
  ShoppingCart, 
  PlusCircle,
  TrendingUp,
  Wallet,
  AlertCircle,
  Utensils,
  Plane,
  Smartphone,
  Wifi,
  Phone,
  Baby,
  Layers,
  Tag,
  Banknote
} from 'lucide-react';
import { BillCategory } from './types';

export const CATEGORY_METADATA: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  [BillCategory.ENERGIA]: { icon: <Zap size={18} />, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  [BillCategory.AGUA]: { icon: <Droplets size={18} />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  [BillCategory.TERRENO]: { icon: <Map size={18} />, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  [BillCategory.PLACA_SOLAR]: { icon: <Sun size={18} />, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  [BillCategory.GASOLINA]: { icon: <Fuel size={18} />, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  [BillCategory.FEIRA]: { icon: <ShoppingCart size={18} />, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  [BillCategory.RESTAURANTE]: { icon: <Utensils size={18} />, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  [BillCategory.VIAGEM]: { icon: <Plane size={18} />, color: 'text-sky-600', bgColor: 'bg-sky-100' },
  [BillCategory.TELEFONE_MOVEL]: { icon: <Smartphone size={18} />, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  [BillCategory.INTERNET]: { icon: <Wifi size={18} />, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  [BillCategory.VIVO]: { icon: <Phone size={18} />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  [BillCategory.PENSAO_ERIC]: { icon: <Baby size={18} />, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  [BillCategory.EMPRESTIMO]: { icon: <Banknote size={18} />, color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  [BillCategory.EXTRAS]: { icon: <Layers size={18} />, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  [BillCategory.OUTROS]: { icon: <PlusCircle size={18} />, color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

export const getCategoryMeta = (category: string) => {
  return CATEGORY_METADATA[category] || { 
    icon: <Tag size={18} />, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-50' 
  };
};

export const UI_ICONS = {
  Income: <Wallet size={24} />,
  Expense: <TrendingUp size={24} />,
  Balance: <AlertCircle size={24} />
};