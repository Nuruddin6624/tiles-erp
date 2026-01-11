
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, Calendar, 
  Save, Search, User, Phone, Wallet, 
  IndianRupee, ArrowRightLeft, CheckCircle,
  MinusCircle, PlusCircle, UserCheck, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type EntryType = 'ADVANCE_ENTRY' | 'ADVANCE_ADJ' | 'DUE_ENTRY' | 'DUE_PAYMENT';

interface FinanceEntry {
  id: string;
  partyName: string;
  phone: string;
  type: EntryType;
  amount: number;
  date: string;
  remarks: string;
}

const AdvanceDueView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLedger, setActiveLedger] = useState<'advance' | 'due'>(location.hash === '#due' ? 'due' : 'advance');
  const [view, setView] = useState<'list' | 'entry'>('list');
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [partyName, setPartyName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<EntryType>('ADVANCE_ENTRY');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('finance_entries').select('data');
    if (error) {
      console.error(error);
      alert('Error fetching finance entries');
    } else {
      setEntries(data.map((row: any) => row.data));
    }
    setIsLoading(false);
  };

  // Calculate Balances to determine eligible parties for Adj/Payment
  const balances = useMemo(() => {
    const map: Record<string, { adv: number, due: number, phone: string }> = {};
    entries.forEach(e => {
      if (!map[e.partyName]) map[e.partyName] = { adv: 0, due: 0, phone: e.phone };
      if (e.type === 'ADVANCE_ENTRY') map[e.partyName].adv += e.amount;
      if (e.type === 'ADVANCE_ADJ') map[e.partyName].adv -= e.amount;
      if (e.type === 'DUE_ENTRY') map[e.partyName].due += e.amount;
      if (e.type === 'DUE_PAYMENT') map[e.partyName].due -= e.amount;
    });
    return map;
  }, [entries]);

  const eligibleParties = useMemo(() => {
    return Object.entries(balances)
      .filter(([name, bal]) => {
        if (type === 'ADVANCE_ADJ') return bal.adv > 0;
        if (type === 'DUE_PAYMENT') return bal.due > 0;
        return false;
      })
      .map(([name]) => name);
  }, [balances, type]);

  const saveEntry = async () => {
    if (!partyName || amount <= 0) return alert("Please fill Party Name and Amount");

    const currentBalance = balances[partyName] || { adv: 0, due: 0 };
    if (type === 'ADVANCE_ADJ' && amount > currentBalance.adv) {
      return alert(`Adjustment exceeds balance. Max: ৳${currentBalance.adv}`);
    }
    if (type === 'DUE_PAYMENT' && amount > currentBalance.due) {
      return alert(`Payment exceeds due balance. Max: ৳${currentBalance.due}`);
    }

    const prefix = type.startsWith('ADVANCE') ? 'ADV' : 'DUE';
    const newEntry: FinanceEntry = {
      id: `${prefix}-${Date.now().toString().slice(-4)}`,
      partyName, phone, type, amount, date, remarks
    };

    setIsLoading(true);
    const { error } = await supabase.from('finance_entries').upsert({ id: newEntry.id, data: newEntry }, { onConflict: 'id' });
    
    if (error) {
      alert('Failed to save entry');
    } else {
      await fetchEntries();
      setView('list');
      resetForm();
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setPartyName(''); setPhone(''); setAmount(0); setRemarks('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const deleteEntry = async (id: string) => {
    if (window.confirm("Delete this transaction?")) {
      setIsLoading(true);
      const { error } = await supabase.from('finance_entries').delete().eq('id', id);
      if (error) {
        alert('Failed to delete');
      } else {
        await fetchEntries();
      }
      setIsLoading(false);
    }
  };

  const getTypeLabel = (t: EntryType) => {
    switch(t) {
      case 'ADVANCE_ENTRY': return 'Advance Receipt';
      case 'ADVANCE_ADJ': return 'Adjustment';
      case 'DUE_ENTRY': return 'Due Created';
      case 'DUE_PAYMENT': return 'Collection';
      default: return '';
    }
  };

  const filteredEntries = entries.filter(e => {
    const isSearchMatch = e.partyName.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const isTabMatch = activeLedger === 'advance' ? e.type.includes('ADVANCE') : e.type.includes('DUE');
    return isSearchMatch && isTabMatch;
  });

  const isPositive = (t: EntryType) => t === 'ADVANCE_ENTRY' || t === 'DUE_PAYMENT';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => view === 'list' ? navigate('/') : setView('list')} className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors">
            <ChevronLeft size={24} className="text-slate-800" />
          </button>
          <h1 className="ml-2 text-lg font-bold text-slate-800 uppercase tracking-tight">
            {view === 'list' ? (activeLedger === 'advance' ? 'Advance Ledger' : 'Due Ledger') : 'Add Record'}
          </h1>
        </div>
      </header>

      {view === 'list' && (
        <div className="flex bg-white border-b border-slate-100 sticky top-[61px] z-40">
          <button onClick={() => setActiveLedger('advance')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeLedger === 'advance' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400'}`}>Advance List</button>
          <button onClick={() => setActiveLedger('due')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeLedger === 'due' ? 'border-orange-600 text-orange-600 bg-orange-50/30' : 'border-transparent text-slate-400'}`}>Due List</button>
        </div>
      )}

      <main className="flex-1 p-5 pb-24 overflow-x-hidden">
        {view === 'list' ? (
          <div className="space-y-4">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder={`Search in ${activeLedger}...`} 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading && entries.length === 0 && <div className="text-center py-10">Loading entries...</div>}

            {filteredEntries.map(entry => (
              <div key={entry.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.type.includes('ADVANCE') ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {entry.type.includes('ADVANCE') ? <Wallet size={20} /> : <IndianRupee size={20} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{entry.partyName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{entry.date} • {getTypeLabel(entry.type)}</p>
                  </div>
                </div>
                <div className="text-right pr-8">
                   <p className={`text-sm font-black ${isPositive(entry.type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPositive(entry.type) ? '+' : '-'}৳{entry.amount.toLocaleString()}
                   </p>
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{entry.id}</p>
                </div>
                <button onClick={() => deleteEntry(entry.id)} className="absolute right-4 text-slate-200 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            
            {!isLoading && filteredEntries.length === 0 && (
              <div className="text-center py-20 text-slate-300 font-medium italic">Empty {activeLedger} records.</div>
            )}

            <button 
              onClick={() => {
                setType(activeLedger === 'advance' ? 'ADVANCE_ENTRY' : 'DUE_ENTRY');
                setView('entry');
              }}
              className={`fixed bottom-8 right-6 w-16 h-16 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50 border-4 border-white ${activeLedger === 'advance' ? 'bg-blue-600' : 'bg-orange-600'}`}
            >
              <Plus size={32} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-3 tracking-widest">Type of record</label>
                <div className="grid grid-cols-2 gap-3">
                  {activeLedger === 'advance' ? (
                    <div className="col-span-2 grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                      <button onClick={() => { setType('ADVANCE_ENTRY'); setPartyName(''); }} className={`flex flex-col items-center p-3 rounded-xl transition-all ${type === 'ADVANCE_ENTRY' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
                        <PlusCircle size={20} className="mb-1" />
                        <span className="text-[9px] font-black uppercase">New Receipt</span>
                      </button>
                      <button onClick={() => { setType('ADVANCE_ADJ'); setPartyName(''); }} className={`flex flex-col items-center p-3 rounded-xl transition-all ${type === 'ADVANCE_ADJ' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
                        <MinusCircle size={20} className="mb-1" />
                        <span className="text-[9px] font-black uppercase">Adjustment</span>
                      </button>
                    </div>
                  ) : (
                    <div className="col-span-2 grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                      <button onClick={() => { setType('DUE_ENTRY'); setPartyName(''); }} className={`flex flex-col items-center p-3 rounded-xl transition-all ${type === 'DUE_ENTRY' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'}`}>
                        <PlusCircle size={20} className="mb-1" />
                        <span className="text-[9px] font-black uppercase">Create Due</span>
                      </button>
                      <button onClick={() => { setType('DUE_PAYMENT'); setPartyName(''); }} className={`flex flex-col items-center p-3 rounded-xl transition-all ${type === 'DUE_PAYMENT' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'}`}>
                        <CheckCircle size={20} className="mb-1" />
                        <span className="text-[9px] font-black uppercase">Due Payment</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center min-h-[52px]">
                  <User size={18} className="text-slate-300 mr-3 shrink-0" />
                  {(type === 'ADVANCE_ADJ' || type === 'DUE_PAYMENT') ? (
                    <select 
                      value={partyName} 
                      onChange={e => {
                        setPartyName(e.target.value);
                        setPhone(balances[e.target.value]?.phone || '');
                      }}
                      className="flex-1 bg-transparent border-none text-sm font-black uppercase outline-none appearance-none"
                    >
                      <option value="">Select Party From List</option>
                      {eligibleParties.map(p => (
                        <option key={p} value={p}>{p} (৳{type === 'ADVANCE_ADJ' ? balances[p].adv : balances[p].due})</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      placeholder="Party Name (Type to create/find)" 
                      value={partyName} 
                      onChange={e => setPartyName(e.target.value)} 
                      className="flex-1 bg-transparent border-none text-sm font-black uppercase outline-none" 
                    />
                  )}
                </div>
                
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center">
                  <Phone size={18} className="text-slate-300 mr-3 shrink-0" />
                  <input 
                    placeholder="Phone Number" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    readOnly={type === 'ADVANCE_ADJ' || type === 'DUE_PAYMENT'}
                    className={`flex-1 bg-transparent border-none text-sm font-bold outline-none ${ (type === 'ADVANCE_ADJ' || type === 'DUE_PAYMENT') ? 'text-slate-400' : ''}`} 
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl flex items-center">
                   <ArrowRightLeft size={18} className="text-slate-300 mr-3 shrink-0" />
                   <input type="number" placeholder="Amount (৳)" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value))} className="flex-1 bg-transparent border-none text-sm font-black outline-none" />
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl flex items-center">
                   <Calendar size={18} className="text-slate-300 mr-3 shrink-0" />
                   <input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 bg-transparent border-none text-sm font-bold outline-none" />
                </div>

                <textarea 
                  placeholder="Additional remarks..." 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-100"
                  rows={2}
                  value={remarks} onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <button disabled={isLoading} onClick={saveEntry} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center shadow-xl active:scale-95 transition-all">
              {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} className="mr-2" /> Save {activeLedger.toUpperCase()} Record</>}
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdvanceDueView;
