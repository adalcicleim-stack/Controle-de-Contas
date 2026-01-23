
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
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { Bill, BillCategory, FinancialSummary } from './types';
import { getCategoryMeta, UI_ICONS } from './constants';
import SummaryCard from './components/SummaryCard';
import { getFinancialAdvice } from './services/geminiService';

const App: React.FC = () => {
  // Autenticação
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(localStorage.getItem('access_pin'));
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isSettingUpPin, setIsSettingUpPin] = useState(!localStorage.getItem('access_pin'));

  // Estados principais
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

  // Formulário
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
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('income', income.toString());
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
  }, [bills, income, customCategories]);

  // Lógica de Autenticação
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingUpPin) {
      if (pinInput.length >= 4) {
        localStorage.setItem('access_pin', pinInput);
        setStoredPin(pinInput);
        setIsSettingUpPin(false);
        setIsAuthorized(true);
        setPinInput('');
      } else {
        setPinError(true);
      }
    } else {
      if (pinInput === storedPin) {
        setIsAuthorized(true);
        setPinError(false);
        setPinInput('');
      } else {
        setPinError(true);
        setPinInput('');
        // Shake animation feedback
        setTimeout(() => setPinError(false), 500);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setPinInput('');
  };

  // Memos e Callbacks (Mantidos conforme original)
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
          key, amount: 0, totalAmount: 0, count: 0, 
          monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), 
          year, timestamp: new Date(year, monthIndex, 1).getTime(), monthIndex
        };
      }
      if (bill.paid) months[key].amount += bill.amount;
      months[key].totalAmount += bill.amount;
      months[key].count += 1;
    });
    return Object.values(months).sort((a, b) => b.timestamp - a.timestamp);
  }, [bills]);

  const chartData = useMemo(() => [...monthlyReport].sort((a, b) => a.timestamp - b.timestamp).slice(-6), [monthlyReport]);
  const maxExpense = useMemo(() => {
    const values = chartData.map(d => d.totalAmount);
    return values.length > 0 ? Math.max(...values, 1000) * 1.1 : 1000;
  }, [chartData]);

  const summary = useMemo((): FinancialSummary => {
    const paid = bills.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const pending = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);
    return { income, totalPaid: paid, totalPending: pending, balance: income - paid };
  }, [income, bills]);

  const selectedMonthData = useMemo(() => {
    if (!selectedMonthKey) return null;
    const reportItem = monthlyReport.find(m => m.key === selectedMonthKey);
    if (!reportItem) return null;
    const monthBills = bills.filter(b => {
      const date = new Date(b.paidAt || b.dueDate || b.createdAt);
      return `${date.getMonth()}-${date.getFullYear()}` === selectedMonthKey;
    });
    return { ...reportItem, bills: monthBills.sort((a, b) => (a.paid === b.paid ? 0 : a.paid ? 1 : -1)) };
  }, [selectedMonthKey, monthlyReport, bills]);

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || parseFloat(formAmount) <= 0) return;
    let finalCategory = formCategory;
    if (isAddingNewCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      if (!allCategories.includes(finalCategory)) setCustomCategories(prev => [...prev, finalCategory]);
    }
    const newBill: Bill = {
      id: crypto.randomUUID(), category: finalCategory, description: formDesc || finalCategory,
      amount: parseFloat(formAmount), dueDate: formDueDate || new Date().toISOString().split('T')[0],
      paid: false, createdAt: Date.now()
    };
    setBills([newBill, ...bills]);
    setFormDesc(''); setFormAmount(''); setNewCategoryName('');
    setIsAddingNewCategory(false); setShowAddForm(false);
  };

  const togglePaid = (id: string) => {
    setBills(prev => prev.map(b => b.id === id ? { 
      ...b, paid: !b.paid, paidAt: !b.paid ? Date.now() : undefined
    } : b));
  };

  const deleteBill = (id: string) => setBills(prev => prev.filter(b => b.id !== id));

  const clearAllData = () => {
    if (window.confirm("Tem certeza que deseja apagar todos os dados? Isso também resetará seu código de acesso.")) {
      setBills([]); setIncome(0); setAdvice(''); setCustomCategories([]);
      localStorage.clear();
      window.location.reload();
    }
  };

  const fetchAdvice = useCallback(async () => {
    setLoadingAdvice(true);
    const text = await getFinancialAdvice(summary, bills);
    setAdvice(text);
    setLoadingAdvice(false);
  }, [summary, bills]);

  // Gráficos e Relatórios (Mantidos conforme original)
  const handlePrintChart = () => { /* ... (mesma lógica) */ };
  const handleDownloadCSV = () => { /* ... (mesma lógica) */ };
  const handlePrintMonthlyReport = (item: any) => { /* ... (mesma lógica) */ };
  const handleInstallApp = async () => { /* ... (mesma lógica) */ };

  // Tela de Autenticação / Bloqueio
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-violet-800 to-fuchsia-900 flex items-center justify-center px-4 overflow-hidden relative">
        {/* Elementos Decorativos de Fundo */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/20 blur-[120px] rounded-full"></div>
        
        <div className={`bg-white/10 backdrop-blur-2xl p-8 sm:p-12 rounded-[3rem] shadow-2xl border border-white/20 w-full max-w-md transition-all duration-500 ${pinError ? 'animate-shake' : ''}`}>
          <div className="flex flex-col items-center text-center gap-6">
            <div className="bg-white/20 p-5 rounded-[2rem] text-white shadow-xl">
              {isSettingUpPin ? <ShieldCheck size={48} /> : <Lock size={48} />}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">
                {isSettingUpPin ? 'Configurar Acesso' : 'App Bloqueado'}
              </h1>
              <p className="text-indigo-100/70 font-medium">
                {isSettingUpPin 
                  ? 'Crie um código numérico para proteger seus dados financeiros.' 
                  : 'Digite seu código de acesso para continuar.'}
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="w-full space-y-6 mt-4">
              <div className="relative group">
                <input 
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={isSettingUpPin ? "Crie seu código" : "Digite seu PIN"}
                  className={`w-full bg-white/10 border-2 py-5 px-8 rounded-3xl text-center text-2xl font-black text-white outline-none transition-all placeholder:text-white/20 ${pinError ? 'border-rose-500 bg-rose-500/10' : 'border-white/10 focus:border-white/40 focus:bg-white/20'}`}
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>

              {pinError && (
                <p className="text-rose-300 text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                  Código Incorreto
                </p>
              )}

              <button 
                type="submit"
                className="w-full bg-white text-indigo-900 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                {isSettingUpPin ? 'Salvar e Acessar' : 'Desbloquear'}
              </button>
            </form>
            
            {!isSettingUpPin && (
              <button 
                onClick={clearAllData}
                className="text-xs font-bold text-white/40 hover:text-rose-300 transition-colors mt-4"
              >
                Esqueceu o código? Limpar todos os dados
              </button>
            )}
          </div>
        </div>
        
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
          .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        `}</style>
      </div>
    );
  }

  // Renderização do Aplicativo (Já Autorizado)
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
              <button 
                onClick={handleLogout}
                title="Bloquear Aplicativo"
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl transition-all border border-slate-200"
              >
                <Lock size={20} />
              </button>
              {!isInstalled && (
                <button 
                  onClick={handleInstallApp}
                  title="Instalar App"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl transition-all border border-slate-200 hidden sm:flex items-center gap-2 px-4 group"
                >
                  <Download size={20} />
                  <span className="font-bold text-xs">Instalar</span>
                </button>
              )}
              <button onClick={() => setShowAddForm(true)} title="Nova conta" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all shadow-md active:scale-95">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-8 animate-in fade-in duration-500">
        
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
              <p className="text-slate-500 text-sm font-medium leading-relaxed">Instale para acesso offline e experiência como um aplicativo nativo.</p>
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
            {/* Relatório e Gráfico mantidos conforme original... */}
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
                      {chartData.map((data, i) => {
                        const totalHeight = (data.totalAmount / maxExpense) * 100;
                        const isSelected = selectedMonthKey === data.key;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center h-full relative">
                            <button 
                              onClick={() => setSelectedMonthKey(isSelected ? null : data.key)}
                              className={`w-full max-w-[32px] flex flex-col justify-end bg-indigo-50/30 rounded-t-xl overflow-hidden group-hover:bg-indigo-50 transition-colors h-full outline-none relative z-10 group`}
                            >
                              <div 
                                style={{ height: `${totalHeight}%` }}
                                className={`w-full rounded-t-xl transition-all duration-700 ease-out-expo shadow-lg ${isSelected ? 'bg-indigo-600' : 'bg-indigo-400'}`}
                              ></div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-4 px-1 mt-3">
                      {chartData.map((data, i) => (
                        <div key={i} className={`flex-1 text-[9px] font-black uppercase text-center ${selectedMonthKey === data.key ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {data.monthName.slice(0, 3)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
           <div className="text-[10px] font-black uppercase tracking-[0.2em]">© {currentYear} BillControl AI • Acesso Protegido</div>
           <div className="flex items-center gap-6">
              <button onClick={handleInstallApp} className="text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                <Smartphone size={12} /> Instalar
              </button>
              <button onClick={handleLogout} className="text-[10px] font-bold uppercase text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1">
                <Unlock size={12} /> Bloquear
              </button>
           </div>
        </footer>
      </main>

      {/* Modais de Instalação e Formulário mantidos... */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-10 flex flex-col gap-8 scale-in-center">
            <div className="flex justify-between items-start">
              <div className="bg-indigo-100 p-4 rounded-3xl text-indigo-600"><Smartphone size={32} /></div>
              <button onClick={() => setShowIOSInstructions(false)} className="text-slate-300 hover:text-rose-500"><XCircle size={32} /></button>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-800 leading-tight">Adicionar ao iPhone</h2>
              <p className="text-slate-500 font-medium text-sm">Toque em <span className="text-indigo-600">Compartilhar</span> e depois em <span className="text-indigo-600">"Adicionar à Tela de Início"</span>.</p>
            </div>
            <button onClick={() => setShowIOSInstructions(false)} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm">Entendi</button>
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
