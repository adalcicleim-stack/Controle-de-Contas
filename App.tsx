
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  LayoutDashboard, 
  History, 
  Sparkles,
  ChevronRight,
  RefreshCw,
  Eraser,
  Tag,
  PlusCircle,
  ListPlus,
  CheckSquare,
  Square,
  Calendar,
  BarChart3,
  Printer,
  TrendingUp,
  ArrowRight,
  FileDown,
  ArrowDownCircle,
  ArrowUpCircle,
  Smartphone,
  Download,
  ShieldCheck,
  Check,
  Share,
  PlusSquare,
  Info
} from 'lucide-react';
import { Bill, BillCategory, FinancialSummary } from './types';
import { getCategoryMeta, UI_ICONS } from './constants';
import SummaryCard from './components/SummaryCard';
import { getFinancialAdvice } from './services/geminiService';

const App: React.FC = () => {
  const [income, setIncome] = useState<number>(0);
  const [bills, setBills] = useState<Bill[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [formCategory, setFormCategory] = useState<string>(BillCategory.ENERGIA);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState('');

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const savedBills = localStorage.getItem('bills');
    const savedIncome = localStorage.getItem('income');
    const savedCustomCats = localStorage.getItem('customCategories');
    if (savedBills) setBills(JSON.parse(savedBills));
    if (savedIncome) setIncome(parseFloat(savedIncome));
    if (savedCustomCats) setCustomCategories(JSON.parse(savedCustomCats));

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('BillControl: Pronto para instalação');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detecta se já está rodando como App
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      setShowInstallBanner(false);
    }

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('income', income.toString());
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
  }, [bills, income, customCategories]);

  const allCategories = useMemo(() => {
    const defaults = Object.values(BillCategory);
    return Array.from(new Set([...defaults, ...customCategories]));
  }, [customCategories]);

  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => b.createdAt - a.createdAt);
  }, [bills]);

  const pendingBills = useMemo(() => sortedBills.filter(b => !b.paid), [sortedBills]);
  
  const paidBillsThisYear = useMemo(() => {
    return sortedBills.filter(b => {
      if (!b.paid) return false;
      const dateToCompare = b.paidAt || b.createdAt;
      return new Date(dateToCompare).getFullYear() === currentYear;
    });
  }, [sortedBills, currentYear]);

  const monthlyReport = useMemo(() => {
    const months: Record<string, { key: string; amount: number; totalAmount: number; count: number; monthName: string; year: number; timestamp: number; monthIndex: number }> = {};
    
    bills.forEach(bill => {
      const date = new Date(bill.paidAt || bill.dueDate || bill.createdAt);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      const key = `${monthIndex}-${year}`;
      
      const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
      
      if (!months[key]) {
        months[key] = { 
          key,
          amount: 0, 
          totalAmount: 0, 
          count: 0, 
          monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), 
          year,
          timestamp: new Date(year, monthIndex, 1).getTime(),
          monthIndex
        };
      }
      
      if (bill.paid) {
        months[key].amount += bill.amount;
      }
      months[key].totalAmount += bill.amount;
      months[key].count += 1;
    });

    return Object.values(months).sort((a, b) => b.timestamp - a.timestamp);
  }, [bills]);

  const chartData = useMemo(() => {
    return [...monthlyReport].sort((a, b) => a.timestamp - b.timestamp).slice(-6);
  }, [monthlyReport]);

  const maxExpense = useMemo(() => {
    const values = chartData.map(d => d.totalAmount);
    return values.length > 0 ? Math.max(...values, 1000) * 1.1 : 1000;
  }, [chartData]);

  const summary = useMemo((): FinancialSummary => {
    const paid = bills.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const pending = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);
    return {
      income,
      totalPaid: paid,
      totalPending: pending,
      balance: income - paid
    };
  }, [income, bills]);

  const selectedMonthData = useMemo(() => {
    if (!selectedMonthKey) return null;
    const reportItem = monthlyReport.find(m => m.key === selectedMonthKey);
    if (!reportItem) return null;

    const monthBills = bills.filter(b => {
      const date = new Date(b.paidAt || b.dueDate || b.createdAt);
      return `${date.getMonth()}-${date.getFullYear()}` === selectedMonthKey;
    });

    return {
      ...reportItem,
      bills: monthBills.sort((a, b) => (a.paid === b.paid ? 0 : a.paid ? 1 : -1))
    };
  }, [selectedMonthKey, monthlyReport, bills]);

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || parseFloat(formAmount) <= 0) return;

    let finalCategory = formCategory;
    if (isAddingNewCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      if (!allCategories.includes(finalCategory)) {
        setCustomCategories(prev => [...prev, finalCategory]);
      }
    }

    const newBill: Bill = {
      id: crypto.randomUUID(),
      category: finalCategory,
      description: formDesc || finalCategory,
      amount: parseFloat(formAmount),
      dueDate: formDueDate || new Date().toISOString().split('T')[0],
      paid: false,
      createdAt: Date.now()
    };

    setBills([newBill, ...bills]);
    setFormDesc('');
    setFormAmount('');
    setNewCategoryName('');
    setIsAddingNewCategory(false);
    setShowAddForm(false);
  };

  const togglePaid = (id: string) => {
    setBills(prev => prev.map(b => b.id === id ? { 
      ...b, 
      paid: !b.paid,
      paidAt: !b.paid ? Date.now() : undefined
    } : b));
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const clearAllData = () => {
    if (window.confirm("Tem certeza que deseja apagar todos os dados?")) {
      setBills([]);
      setIncome(0);
      setAdvice('');
      setCustomCategories([]);
      localStorage.clear();
    }
  };

  const fetchAdvice = useCallback(async () => {
    setLoadingAdvice(true);
    const text = await getFinancialAdvice(summary, bills);
    setAdvice(text);
    setLoadingAdvice(false);
  }, [summary, bills]);

  const handlePrintChart = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const chartHtml = chartData.map(data => `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 15px;">
        <div style="width: 50px; height: ${(data.totalAmount / maxExpense) * 250}px; background: linear-gradient(to bottom, #4f46e5, #6366f1); border-radius: 8px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);"></div>
        <div style="font-weight: 800; font-size: 14px; color: #1e293b; text-transform: uppercase;">${data.monthName.slice(0, 3)}</div>
        <div style="font-size: 12px; font-weight: 600; color: #64748b;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalAmount)}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Evolução Financeira - BillControl AI</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 60px; color: #1e293b; }
            .header { border-bottom: 4px solid #4f46e5; padding-bottom: 30px; margin-bottom: 50px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; font-size: 32px; font-weight: 900; color: #4f46e5; }
            .chart-area { display: flex; align-items: flex-end; justify-content: space-around; height: 400px; margin-top: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; }
            .footer { margin-top: 60px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Evolução de Gastos</h1>
              <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <div class="chart-area">${chartHtml}</div>
          <div class="footer">BillControl AI - Gestão Financeira Inteligente</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCSV = () => {
    const headers = ['Mês', 'Ano', 'Total Gasto (R$)', 'Quantidade de Itens'];
    const rows = chartData.map(d => [d.monthName, d.year, d.totalAmount.toFixed(2), d.count]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `evolucao_financeira_billcontrol_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintMonthlyReport = (item: any) => {
    const monthBills = bills.filter(b => {
      const date = new Date(b.paidAt || b.dueDate || b.createdAt);
      return date.getMonth() === item.monthIndex && date.getFullYear() === item.year;
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const billsHtml = monthBills.map(b => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: center;">${b.paid ? '✅' : '⏳'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600;">${b.category}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">${b.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: center; color: #64748b;">${new Date(b.dueDate || b.createdAt).toLocaleDateString('pt-BR')}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; text-align: right; font-weight: bold; color: ${b.paid ? '#059669' : '#e11d48'};">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.amount)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Mensal Detalhado - ${item.monthName} ${item.year}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; margin: 0; }
            .header { border-bottom: 3px solid #4f46e5; padding-bottom: 24px; margin-bottom: 32px; }
            h1 { margin: 0; color: #4f46e5; font-size: 28px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { text-align: left; background: #f8fafc; padding: 14px 12px; border-bottom: 2px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .totals { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .box { padding: 20px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
            .box.highlight { background: #4f46e5; color: white; border: none; }
            .label { font-size: 12px; font-weight: 700; text-transform: uppercase; opacity: 0.8; }
            .value { font-size: 24px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Detalhado: ${item.monthName} / ${item.year}</h1>
            <p style="color: #64748b; font-weight: 500;">Listagem completa de todas as contas incluídas neste período.</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Status</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th style="text-align: center;">Vencimento</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${billsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="box">
              <div class="label">Total Geral Incluído</div>
              <div class="value" style="color: #1e293b;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalAmount)}</div>
            </div>
            <div class="box highlight">
              <div class="label">Total Efetivamente Pago</div>
              <div class="value">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}</div>
            </div>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleInstallApp = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isStandalone || isInstalled) {
      alert("O BillControl AI já está instalado no seu dispositivo.");
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch (err) {
        console.error('Erro ao processar instalação:', err);
      }
    } else if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      alert("Para instalar:\n1. Certifique-se de usar o Chrome.\n2. Clique nos 3 pontos e escolha 'Instalar aplicativo' ou 'Adicionar à tela inicial'.");
    }
  };

  const renderTable = (title: string, data: Bill[], icon: React.ReactNode, isPaidTable: boolean) => (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-8">
      <div className={`px-6 py-5 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${isPaidTable ? 'bg-emerald-50/20' : 'bg-slate-50/30'}`}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {icon}
            {title}
            {data.length > 0 && <span className="text-sm font-normal text-slate-400">({data.length} itens)</span>}
          </h2>
        </div>
        {!isPaidTable && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Plus size={16} /> Nova Conta
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        {data.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <p className="text-slate-400 font-medium italic">Nenhuma conta {isPaidTable ? 'paga' : 'pendente'} encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4 w-16 text-center">Status</th>
                <th className="px-6 py-4">Conta / Descrição</th>
                <th className="px-6 py-4 w-40 text-center">{isPaidTable ? 'Data Pagto' : 'Vencimento'}</th>
                <th className="px-6 py-4 w-40 text-right">Valor</th>
                <th className="px-6 py-4 w-16 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map(bill => {
                const meta = getCategoryMeta(bill.category);
                return (
                  <tr key={bill.id} className={`group transition-colors hover:bg-slate-50/80 ${bill.paid ? 'bg-emerald-50/5' : ''}`}>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => togglePaid(bill.id)}
                        className={`transition-all transform active:scale-90 ${bill.paid ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-400'}`}
                      >
                        {bill.paid ? <CheckSquare size={24} fill="currentColor" stroke="white" /> : <Square size={24} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`${meta.bgColor} ${meta.color} p-2 rounded-lg shrink-0`}>
                          {meta.icon}
                        </div>
                        <div>
                          <div className={`font-bold text-slate-800 ${bill.paid ? 'text-slate-500' : ''}`}>
                            {bill.category}
                          </div>
                          <div className="text-xs text-slate-400 font-medium truncate max-w-[150px]">
                            {bill.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-semibold ${bill.paid ? 'text-slate-500' : 'text-slate-600'}`}>
                        {bill.paid && bill.paidAt 
                          ? new Date(bill.paidAt).toLocaleDateString('pt-BR') 
                          : new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-base font-bold ${bill.paid ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => deleteBill(bill.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-4 sm:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
              <LayoutDashboard size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">BillControl AI</h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
              <input 
                type="number" 
                value={income === 0 ? '' : income}
                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                placeholder="Salário do Mês"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              {!isInstalled && (
                <button 
                  onClick={handleInstallApp}
                  title="Instalar App"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl transition-all border border-slate-200 flex items-center gap-2 px-4 group"
                >
                  <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                  <span className="hidden sm:inline font-bold text-xs">Instalar</span>
                </button>
              )}
              <button onClick={clearAllData} title="Limpar tudo" className="text-slate-400 hover:text-rose-600 p-2.5 rounded-xl transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100">
                <Eraser size={20} />
              </button>
              <button onClick={() => setShowAddForm(true)} title="Nova conta" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all shadow-md active:scale-95">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
        
        {/* Banner de Instalação Refinado */}
        {!isInstalled && showInstallBanner && (
          <section className="animate-in slide-in-from-top-4 duration-500 bg-white border border-indigo-100 p-6 rounded-[2rem] shadow-xl shadow-indigo-50 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <button onClick={() => setShowInstallBanner(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                <XCircle size={20} />
              </button>
            </div>
            <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-lg shadow-indigo-200 shrink-0">
               <Smartphone size={32} />
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">BillControl na sua Tela de Início</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Instale para acesso offline, notificações inteligentes e carregamento instantâneo como um aplicativo nativo.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
               <button 
                onClick={handleInstallApp}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 whitespace-nowrap"
               >
                 <Download size={18} /> Instalar Agora
               </button>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Receita Bruta" value={summary.income} icon={UI_ICONS.Income} variant="info" />
          <SummaryCard title="Descontado" value={summary.totalPaid} icon={<ArrowDownCircle className="text-emerald-500" />} variant="success" />
          <SummaryCard title="Saldo Final" value={summary.balance} icon={summary.balance >= 0 ? <CheckCircle2 /> : <XCircle />} variant={summary.balance >= 0 ? 'primary' : 'danger'} />
          <SummaryCard title="A Pagar (Pendente)" value={summary.totalPending} icon={<ArrowUpCircle className="text-rose-500" />} variant="danger" />
        </div>

        {summary.totalPaid > 0 && (
          <section className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex items-center gap-2 font-medium text-indigo-100 uppercase text-xs tracking-[0.2em]"><Sparkles size={14} /> Insight AI</div>
                <p className="text-lg font-medium leading-relaxed max-w-2xl">{advice || "Analise seus gastos agora."}</p>
              </div>
              <button onClick={fetchAdvice} disabled={loadingAdvice} className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-white/30 transition-all active:scale-95">
                {loadingAdvice ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                {advice ? 'Atualizar Dica' : 'Analisar Gastos'}
              </button>
            </div>
          </section>
        )}

        <div className="max-w-5xl mx-auto w-full space-y-4">
          {renderTable("Contas a Pagar Atuais", pendingBills, <History size={20} className="text-rose-500" />, false)}
          {renderTable("Contas Pagas Recentemente", paidBillsThisYear, <CheckCircle2 size={20} className="text-emerald-500" />, true)}
        </div>

        {monthlyReport.length > 0 && (
          <section className="space-y-8 pb-12 border-t pt-12 mt-16 bg-white -mx-4 sm:-mx-8 px-4 sm:px-8 rounded-t-3xl shadow-2xl">
            <div className="flex items-center justify-between px-2 max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-md">
                   <BarChart3 size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Evolução Mensal</h2>
              </div>
              {selectedMonthKey && (
                <button 
                  onClick={() => setSelectedMonthKey(null)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  Ver todos os meses <ArrowRight size={14} />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-7xl mx-auto">
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {monthlyReport.map((item) => (
                  <button 
                    key={item.key} 
                    onClick={() => setSelectedMonthKey(item.key === selectedMonthKey ? null : item.key)}
                    className={`bg-white border text-left rounded-3xl p-6 transition-all flex flex-col gap-4 group relative hover:shadow-xl ${selectedMonthKey === item.key ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl transition-all duration-300 ${selectedMonthKey === item.key ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50'}`}>
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div className="text-base font-black text-slate-800 leading-none">{item.monthName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">{item.year}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">{item.count} ITENS</div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-2 mt-auto">
                       <div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Valor Liquidado</div>
                          <div className={`text-xl font-black ${selectedMonthKey === item.key ? 'text-indigo-600' : 'text-slate-900'}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                          </div>
                       </div>
                       <div 
                         onClick={(e) => { e.stopPropagation(); handlePrintMonthlyReport(item); }}
                         className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm group-hover:shadow-md"
                       >
                         <Printer size={18} />
                       </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-indigo-500" />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Evolução de Gastos</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={handlePrintChart}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Imprimir Gráfico"
                      >
                         <Printer size={16} />
                      </button>
                      <button 
                        onClick={handleDownloadCSV}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Salvar Dados (CSV)"
                      >
                         <FileDown size={16} />
                      </button>
                   </div>
                </div>
                
                <div className="flex-1 flex gap-3 h-full">
                  <div className="flex flex-col justify-between py-6 text-[9px] font-black text-slate-400 border-r border-slate-100 pr-3 h-[calc(100%-40px)]">
                    {[maxExpense, maxExpense * 0.75, maxExpense * 0.5, maxExpense * 0.25, 0].map((val, idx) => (
                      <span key={idx} className="whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(val)}
                      </span>
                    ))}
                  </div>

                  <div className="flex-1 flex flex-col h-full">
                    <div className="flex-1 flex items-end justify-between gap-4 pt-6 relative px-1 border-b-2 border-slate-200">
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-1">
                        <div className="w-full border-t border-slate-50"></div>
                        <div className="w-full border-t border-slate-50"></div>
                        <div className="w-full border-t border-slate-50"></div>
                        <div className="w-full border-t border-slate-50"></div>
                      </div>

                      {chartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-[11px] font-bold italic">Aguardando lançamentos...</div>
                      ) : chartData.map((data, i) => {
                        const totalHeight = (data.totalAmount / maxExpense) * 100;
                        const isSelected = selectedMonthKey === data.key;
                        
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center h-full relative">
                            <button 
                              onClick={() => setSelectedMonthKey(isSelected ? null : data.key)}
                              className={`w-full max-w-[32px] flex flex-col justify-end bg-indigo-50/30 rounded-t-xl overflow-hidden group-hover:bg-indigo-50 transition-colors h-full outline-none relative z-10 group`}
                            >
                              <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl z-20 ${isSelected ? 'opacity-100 -translate-y-1' : ''}`}>
                                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalAmount)}
                              </div>

                              <div 
                                style={{ height: `${totalHeight}%` }}
                                className={`w-full rounded-t-xl transition-all duration-700 ease-out-expo shadow-lg ${isSelected ? 'bg-indigo-600' : 'bg-indigo-400 group-hover:bg-indigo-500'}`}
                              ></div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-4 px-1 mt-3">
                      {chartData.map((data, i) => {
                        const isSelected = selectedMonthKey === data.key;
                        return (
                          <div key={i} className={`flex-1 text-[9px] font-black uppercase tracking-tighter truncate text-center transition-colors ${isSelected ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
                            {data.monthName.slice(0, 3)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedMonthData && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-white border-2 border-indigo-100 rounded-[2.5rem] overflow-hidden shadow-2xl mt-8 max-w-7xl mx-auto">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-10 py-8 flex flex-col sm:flex-row items-center justify-between text-white gap-6">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-white/10 rounded-[1.5rem] backdrop-blur-md border border-white/20">
                       <ListPlus size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight">Detalhes de {selectedMonthData.monthName}</h3>
                      <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest opacity-80 mt-1">Todas as contas consolidadas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-10 bg-black/10 px-8 py-5 rounded-[2rem] backdrop-blur-sm border border-white/5">
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase opacity-60 tracking-widest mb-1">Total Previsto</div>
                      <div className="text-2xl font-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthData.totalAmount)}</div>
                    </div>
                    <div className="w-px h-12 bg-white/10"></div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase opacity-60 tracking-widest mb-1">Total Pago</div>
                      <div className="text-2xl font-black text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonthData.amount)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-10 py-5 text-center w-24">Status</th>
                        <th className="px-10 py-5">Categoria & Item</th>
                        <th className="px-10 py-5">Vencimento</th>
                        <th className="px-10 py-5 text-right">Valor Bruto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMonthData.bills.map(bill => (
                        <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-10 py-5 text-center">
                            <button onClick={() => togglePaid(bill.id)} className={`transition-all transform active:scale-90 ${bill.paid ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-400'}`}>
                              {bill.paid ? <CheckCircle2 size={24} /> : <History size={24} />}
                            </button>
                          </td>
                          <td className="px-10 py-5">
                             <div className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{bill.category}</div>
                             <div className="text-xs text-slate-400 font-medium truncate max-w-[200px] mt-0.5">{bill.description}</div>
                          </td>
                          <td className="px-10 py-5 text-xs font-bold text-slate-600">
                            {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-10 py-5 text-right font-black">
                            <span className={bill.paid ? 'text-emerald-600' : 'text-rose-500'}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
           <div className="text-[10px] font-black uppercase tracking-[0.2em]">© {currentYear} BillControl AI • PWA para Android e iPhone</div>
           <div className="flex items-center gap-6">
              {!isInstalled && (
                <button onClick={handleInstallApp} className="text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                  <Smartphone size={12} /> Instalar App
                </button>
              )}
              <a href="https://ai.google.dev/gemini-api/docs/billing" className="text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors">Cobrança API</a>
           </div>
        </footer>
      </main>

      {/* Instruções de Instalação para iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-10 flex flex-col gap-8 scale-in-center">
            <div className="flex justify-between items-start">
              <div className="bg-indigo-100 p-4 rounded-3xl text-indigo-600">
                <Smartphone size={32} />
              </div>
              <button onClick={() => setShowIOSInstructions(false)} className="text-slate-300 hover:text-rose-500 transition-colors">
                <XCircle size={32} />
              </button>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-800 leading-tight">Adicionar ao iPhone</h2>
              <p className="text-slate-500 font-medium">Siga os passos abaixo para instalar o BillControl AI na sua tela de início:</p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <Share size={24} className="text-indigo-600" />
                </div>
                <div className="text-sm font-bold text-slate-700">1. Toque no botão de <span className="text-indigo-600">Compartilhar</span> na barra do Safari.</div>
              </div>
              <div className="flex items-center gap-5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <PlusSquare size={24} className="text-indigo-600" />
                </div>
                <div className="text-sm font-bold text-slate-700">2. Role para baixo e toque em <span className="text-indigo-600">"Adicionar à Tela de Início"</span>.</div>
              </div>
            </div>
            <button 
              onClick={() => setShowIOSInstructions(false)}
              className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden scale-in-center">
            <div className="bg-slate-50 border-b px-8 py-6 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-3"><PlusCircle size={24} className="text-indigo-600" /> Adicionar Novo Lançamento</h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-rose-500 p-2 transition-colors"><XCircle size={28} /></button>
            </div>
            <form onSubmit={handleAddBill} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Escolha a Categoria</label>
                  <button type="button" onClick={() => setIsAddingNewCategory(!isAddingNewCategory)} className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                    {isAddingNewCategory ? 'Voltar para lista' : <span className="flex items-center gap-1"><Plus size={16} /> Criar Categoria</span>}
                  </button>
                </div>
                {isAddingNewCategory ? (
                  <div className="flex gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-indigo-100 p-4 rounded-2xl text-indigo-600 flex items-center justify-center shrink-0 w-14 h-14"><Tag size={24} /></div>
                    <input autoFocus type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex: Academia, Assinatura..." className="flex-1 px-5 py-3 bg-slate-50 border-2 border-indigo-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto p-2 custom-scrollbar border rounded-2xl bg-slate-50/30">
                    {allCategories.map(cat => (
                      <button key={cat} type="button" onClick={() => setFormCategory(cat)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black transition-all border-2 text-left ${formCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200'}`}>
                        <span className={formCategory === cat ? 'text-white' : ''}>{getCategoryMeta(cat).icon}</span>
                        <span className="truncate">{cat}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Quanto é o valor?</label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">R$</span>
                     <input type="number" step="0.01" required value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0,00" className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-2xl focus:ring-4 focus:ring-indigo-50 border-indigo-50 outline-none transition-all focus:border-indigo-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Qual o vencimento?</label>
                  <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full px-5 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all focus:border-indigo-500" />
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Descrição curta (opcional)</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Ex: Boleto de energia ref. Jan/2026..." className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50 outline-none transition-all focus:border-indigo-500" />
              </div>
              
              <div className="pt-6">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-black shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.97] text-lg uppercase tracking-widest">
                  Confirmar Agora <ChevronRight size={22} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        .ease-out-expo { transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1); }

        @keyframes scale-in-center {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .scale-in-center {
          animation: scale-in-center 0.25s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
      `}</style>
    </div>
  );
};

export default App;
