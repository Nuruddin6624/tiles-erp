
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, TrendingUp, Calendar, Printer, BarChart3, PieChart,
  Truck, PackageX, PackageCheck, FileText, ExternalLink,
  ClipboardCheck, Download, Wallet, IndianRupee, FileBarChart,
  ClipboardList, Receipt, UserCheck, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../lib/supabase';

type ReportTab = 'orders' | 'invoice' | 'pipeline' | 'advance' | 'due';

interface SavedOrder {
  id: string;
  date: string;
  type: string;
  customerInfo?: { name: string; address: string; phone: string; };
  totals: { sft: number; amount: number; boxes: number; };
}

interface Invoice {
  id: string;
  clientName: string;
  date: string;
  totals: { net: number; advance: number; rest: number; };
}

interface SOEntry {
  id: string;
  orderRef: string;
  date: string;
  isUnloaded: boolean;
  truckNo?: string;
  pdfData?: string; 
  unloadPdfData?: string;
}

interface FinanceEntry {
  id: string;
  partyName: string;
  type: 'ADVANCE_ENTRY' | 'ADVANCE_ADJ' | 'DUE_ENTRY' | 'DUE_PAYMENT';
  amount: number;
  date: string;
}

const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportTab>('orders');
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pipeline, setPipeline] = useState<SOEntry[]>([]);
  const [finance, setFinance] = useState<FinanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, invoicesRes, soRes, financeRes] = await Promise.all([
        supabase.from('orders').select('data'),
        supabase.from('invoices').select('data'),
        supabase.from('so_entries').select('data'),
        supabase.from('finance_entries').select('data'),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data.map((r: any) => r.data));
      if (invoicesRes.data) setInvoices(invoicesRes.data.map((r: any) => r.data));
      if (soRes.data) setPipeline(soRes.data.map((r: any) => r.data));
      if (financeRes.data) setFinance(financeRes.data.map((r: any) => r.data));

    } catch (error) {
      console.error('Error fetching reports data:', error);
      alert('Failed to load reports data');
    }
    setIsLoading(false);
  };

  // -- Balances Calculation --
  const partyBalances = useMemo(() => {
    const map: Record<string, { adv: number, due: number, lastDate: string }> = {};
    finance.forEach(f => {
      if (!map[f.partyName]) {
        map[f.partyName] = { adv: 0, due: 0, lastDate: f.date };
      }
      
      if (f.type === 'ADVANCE_ENTRY') map[f.partyName].adv += f.amount;
      if (f.type === 'ADVANCE_ADJ') map[f.partyName].adv -= f.amount;
      if (f.type === 'DUE_ENTRY') map[f.partyName].due += f.amount;
      if (f.type === 'DUE_PAYMENT') map[f.partyName].due -= f.amount;
      
      // Track latest transaction date for the party
      if (new Date(f.date) > new Date(map[f.partyName].lastDate)) {
        map[f.partyName].lastDate = f.date;
      }
    });
    return map;
  }, [finance]);

  // -- Summaries --
  const ordersSummary = useMemo(() => orders.reduce((acc, curr) => ({
    sft: acc.sft + curr.totals.sft,
    amount: acc.amount + curr.totals.amount,
    count: acc.count + 1
  }), { sft: 0, amount: 0, count: 0 }), [orders]);

  const invoiceSummary = useMemo(() => invoices.reduce((acc, curr) => ({
    total: acc.total + curr.totals.net,
    pending: acc.pending + curr.totals.rest,
    count: acc.count + 1
  }), { total: 0, pending: 0, count: 0 }), [invoices]);

  const pipelineSummary = useMemo(() => pipeline.reduce((acc, curr) => ({
    total: acc.total + 1,
    unloaded: acc.unloaded + (curr.isUnloaded ? 1 : 0)
  }), { total: 0, unloaded: 0 }), [pipeline]);

  const financeSummary = useMemo(() => finance.reduce((acc, curr) => {
    if (curr.type === 'ADVANCE_ENTRY') acc.advTotal += curr.amount;
    if (curr.type === 'ADVANCE_ADJ') acc.advAdj += curr.amount;
    if (curr.type === 'DUE_ENTRY') acc.dueTotal += curr.amount;
    if (curr.type === 'DUE_PAYMENT') acc.duePaid += curr.amount;
    return acc;
  }, { advTotal: 0, advAdj: 0, dueTotal: 0, duePaid: 0 }), [finance]);

  const monthlyOrders = useMemo(() => {
    const groups: Record<string, any> = {};
    orders.forEach(o => {
      const key = o.date.substring(0, 7);
      if (!groups[key]) groups[key] = { label: new Date(o.date).toLocaleString('default', { month: 'long', year: 'numeric' }), sft: 0, amount: 0, count: 0, raw: key };
      groups[key].sft += o.totals.sft;
      groups[key].amount += o.totals.amount;
      groups[key].count += 1;
    });
    return Object.values(groups).sort((a: any, b: any) => b.raw.localeCompare(a.raw));
  }, [orders]);

  const monthlyFinance = useMemo(() => {
    const groups: Record<string, { label: string, raw: string, advIn: number, advOut: number, dueIn: number, dueOut: number }> = {};
    finance.forEach(f => {
      const key = f.date.substring(0, 7);
      if (!groups[key]) groups[key] = { label: new Date(f.date).toLocaleString('default', { month: 'long', year: 'numeric' }), raw: key, advIn: 0, advOut: 0, dueIn: 0, dueOut: 0 };
      if (f.type === 'ADVANCE_ENTRY') groups[key].advIn += f.amount;
      if (f.type === 'ADVANCE_ADJ') groups[key].advOut += f.amount;
      if (f.type === 'DUE_ENTRY') groups[key].dueIn += f.amount;
      if (f.type === 'DUE_PAYMENT') groups[key].dueOut += f.amount;
    });
    return Object.values(groups).sort((a, b) => b.raw.localeCompare(a.raw));
  }, [finance]);

  // -- PDF Helpers --
  const generateBasicReport = (title: string, headers: string[], body: any[][]) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.setFont("times", "bold").setFontSize(26).setTextColor(0, 84, 166).text("CERAMICS TRADE", 297, 50, { align: 'center' });
    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(0).text(title, 297, 75, { align: 'center' });
    (doc as any).autoTable({ 
      startY: 100, 
      head: [headers], 
      body, 
      theme: 'grid', 
      headStyles: { fillColor: [0, 84, 166] },
      styles: { fontSize: 9, halign: 'center' }
    });
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  };

  const generateMonthlyFinanceReport = (monthRaw: string, monthLabel: string, type: 'advance' | 'due') => {
    const prefix = type === 'advance' ? 'ADVANCE' : 'DUE';
    const filtered = finance.filter(f => f.date.startsWith(monthRaw) && f.type.startsWith(prefix));
    const tableData = filtered.map((f, idx) => [
      idx + 1,
      f.date,
      f.partyName,
      f.type.replace('_ENTRY', ' Entry').replace('_ADJ', ' Adjustment').replace('_PAYMENT', ' Payment'),
      f.amount.toLocaleString()
    ]);
    generateBasicReport(`${type.toUpperCase()} Transactions - ${monthLabel}`, ['SL', 'Date', 'Party Name', 'Type', 'Amount (৳)'], tableData);
  };

  const generateActiveBalanceReport = (type: 'advance' | 'due') => {
    const tableData: any[][] = [];
    Object.entries(partyBalances).forEach(([name, data]) => {
      const balanceValue = type === 'advance' ? data.adv : data.due;
      if (balanceValue > 0) {
        tableData.push([tableData.length + 1, name, data.lastDate, balanceValue.toLocaleString()]);
      }
    });
    generateBasicReport(`Active ${type.toUpperCase()} Balances`, ['SL', 'Party Name', 'Last Entry Date', `Current Balance (৳)`], tableData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Compiling Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-10">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-5 py-4 flex items-center">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full active:bg-gray-100">
          <ChevronLeft size={24} className="text-slate-800" />
        </button>
        <h1 className="ml-2 text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center">
          <BarChart3 size={20} className="mr-2 text-indigo-600" /> All Reports
        </h1>
      </header>

      {/* Primary Tab Navigation */}
      <div className="flex bg-white px-2 border-b border-gray-100 sticky top-[61px] z-40 overflow-x-auto no-scrollbar">
        {[
          { id: 'orders', label: 'Orders', icon: <Truck size={14} /> },
          { id: 'invoice', label: 'Invoices', icon: <Receipt size={14} /> },
          { id: 'pipeline', label: 'Pipeline', icon: <ClipboardList size={14} /> },
          { id: 'advance', label: 'Advance', icon: <Wallet size={14} /> },
          { id: 'due', label: 'Due List', icon: <IndianRupee size={14} /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportTab)} 
            className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-4 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <main className="p-5 space-y-6">
        
        {/* ORDERS VIEW */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 p-4 rounded-3xl text-white shadow-lg col-span-2">
                <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Lifetime SFT</p>
                <p className="text-2xl font-black">{ordersSummary.sft.toFixed(2)}</p>
              </div>
              <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg"><p className="text-[10px] font-bold opacity-80 mb-1">Orders</p><p className="text-lg font-black">{ordersSummary.count}</p></div>
              <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-lg"><p className="text-[10px] font-bold opacity-80 mb-1">Value</p><p className="text-lg font-black">৳{ordersSummary.amount.toLocaleString()}</p></div>
            </div>
            <div className="space-y-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Orders Breakdown</h2>
              {monthlyOrders.map((m: any) => (
                <div key={m.raw} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                  <div><h3 className="text-sm font-black text-slate-800">{m.label}</h3><p className="text-[10px] text-slate-400 font-bold uppercase">SFT: {m.sft.toFixed(0)} • Orders: {m.count}</p></div>
                  <button onClick={() => generateBasicReport(`Orders - ${m.label}`, ['SL', 'SFT', 'Value'], [[1, m.sft, m.amount]])} className="p-2 bg-slate-50 text-slate-400 rounded-lg"><Printer size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVOICE VIEW */}
        {activeTab === 'invoice' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl">
               <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1">Total Memo Value</p>
               <p className="text-3xl font-black">৳{invoiceSummary.total.toLocaleString()}</p>
               <div className="mt-4 flex justify-between pt-4 border-t border-white/10">
                  <div><p className="text-[9px] font-bold opacity-50 uppercase">Memos</p><p className="font-black">{invoiceSummary.count}</p></div>
                  <div className="text-right"><p className="text-[9px] font-bold opacity-50 uppercase text-rose-400">Rest Balance</p><p className="font-black text-rose-400">৳{invoiceSummary.pending.toLocaleString()}</p></div>
               </div>
            </div>
            <div className="space-y-3">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Recent Invoices</h2>
               {invoices.slice(0, 8).map(inv => (
                 <div key={inv.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div className="truncate pr-2"><h3 className="text-sm font-bold text-slate-800 uppercase">{inv.clientName}</h3><p className="text-[9px] text-blue-600 font-black">{inv.id} • {inv.date}</p></div>
                    <div className="text-right whitespace-nowrap"><p className="text-xs font-black text-slate-900 leading-none mb-1">৳{inv.totals.net.toLocaleString()}</p><p className={`text-[9px] font-black uppercase ${inv.totals.rest > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{inv.totals.rest > 0 ? `Due: ${inv.totals.rest.toLocaleString()}` : 'PAID'}</p></div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* PIPELINE VIEW */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-orange-500 p-5 rounded-3xl text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Total SO</p><p className="text-2xl font-black">{pipelineSummary.total}</p></div>
               <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-lg"><p className="text-[10px] font-black uppercase opacity-80">Unloaded</p><p className="text-2xl font-black">{pipelineSummary.unloaded}</p></div>
            </div>
            <div className="space-y-3">
               {pipeline.map(so => (
                 <div key={so.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div><h3 className="text-xs font-black text-slate-800 uppercase">SO: {so.id}</h3><p className="text-[9px] text-slate-400 font-bold uppercase">Order: {so.orderRef} • {so.truckNo || 'No Truck'}</p></div>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${so.isUnloaded ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{so.isUnloaded ? 'Unloaded' : 'In Transit'}</span>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* ADVANCE VIEW */}
        {activeTab === 'advance' && (
          <div className="space-y-6">
            <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
               <Wallet className="absolute -right-4 -bottom-4 opacity-10" size={100} />
               <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Net Advance Pool</p>
               <p className="text-3xl font-black">৳{(financeSummary.advTotal - financeSummary.advAdj).toLocaleString()}</p>
               <button 
                  onClick={() => generateActiveBalanceReport('advance')}
                  className="mt-4 w-full bg-white/20 backdrop-blur-sm border border-white/30 py-3 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
               >
                 <UserCheck size={14} className="mr-2" /> Active Advance List (PDF)
               </button>
            </div>
            <div className="space-y-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Transaction Reports</h2>
              {monthlyFinance.filter(m => m.advIn > 0 || m.advOut > 0).map(m => (
                <div key={m.raw} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                     <h3 className="text-sm font-black text-slate-800">{m.label}</h3>
                     <button onClick={() => generateMonthlyFinanceReport(m.raw, m.label, 'advance')} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg active:scale-90 transition-transform"><Printer size={14} /></button>
                   </div>
                   <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed border-slate-100">
                     <div><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Received</p><p className="text-sm font-black text-emerald-600">৳{m.advIn.toLocaleString()}</p></div>
                     <div className="text-right"><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Adjusted</p><p className="text-sm font-black text-blue-600">৳{m.advOut.toLocaleString()}</p></div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DUE VIEW */}
        {activeTab === 'due' && (
          <div className="space-y-6">
            <div className="bg-orange-600 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
               <IndianRupee className="absolute -right-4 -bottom-4 opacity-10" size={100} />
               <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Net Outstanding Due</p>
               <p className="text-3xl font-black">৳{(financeSummary.dueTotal - financeSummary.duePaid).toLocaleString()}</p>
               <button 
                  onClick={() => generateActiveBalanceReport('due')}
                  className="mt-4 w-full bg-white/20 backdrop-blur-sm border border-white/30 py-3 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
               >
                 <UserCheck size={14} className="mr-2" /> Active Due List (PDF)
               </button>
            </div>
            <div className="space-y-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Transaction Reports</h2>
              {monthlyFinance.filter(m => m.dueIn > 0 || m.dueOut > 0).map(m => (
                <div key={m.raw} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                   <div className="flex justify-between items-center mb-3">
                     <h3 className="text-sm font-black text-slate-800">{m.label}</h3>
                     <button onClick={() => generateMonthlyFinanceReport(m.raw, m.label, 'due')} className="p-1.5 bg-orange-50 text-orange-600 rounded-lg active:scale-90 transition-transform"><Printer size={14} /></button>
                   </div>
                   <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dashed border-slate-100">
                     <div><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Created</p><p className="text-sm font-black text-rose-500">৳{m.dueIn.toLocaleString()}</p></div>
                     <div className="text-right"><p className="text-[9px] font-black text-slate-300 uppercase mb-1">Paid</p><p className="text-sm font-black text-emerald-600">৳{m.dueOut.toLocaleString()}</p></div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ReportsDashboard;
