
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, Printer, 
  Calendar, Save, X, Calculator, Edit3, Copy, Check,
  Warehouse, Truck, MapPin, User, Phone, Map, ArrowRightLeft, Loader2
} from 'lucide-react';
import { getProcessedModels, RATE_DATA, PCS_PER_BOX, ProcessedModel } from '../tileData';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../lib/supabase';

type OrderType = 'warehouse' | 'twopoint' | 'site';

interface RowEntry {
  id: string;
  model: string;
  length: number;
  weight: number;
  size: string;
  qty: number;
  rate: number;
  remarks: string;
  sft: number;
  amount: number;
}

interface SavedOrder {
  id: string;
  date: string;
  type: OrderType;
  customerInfo?: {
    name: string;
    address: string;
    phone: string;
  };
  transitFlag?: 'wts' | 'stw';
  items?: RowEntry[];
  firstLoadItems?: RowEntry[];
  secondLoadItems?: RowEntry[];
  totals: {
    sft: number;
    amount: number;
    boxes: number;
  };
}

const TilesOrderView: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'type_selection' | 'list' | 'entry'>('list');
  const [orderType, setOrderType] = useState<OrderType>('warehouse');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [transitFlag, setTransitFlag] = useState<'wts' | 'stw'>('wts');

  const [items, setItems] = useState<RowEntry[]>([]);
  const [firstLoadItems, setFirstLoadItems] = useState<RowEntry[]>([]);
  const [secondLoadItems, setSecondLoadItems] = useState<RowEntry[]>([]);

  const allModels = useMemo(() => getProcessedModels(), []);
  const [suggestions, setSuggestions] = useState<ProcessedModel[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('orders').select('data');
    if (error) {
      console.error('Error fetching orders:', error);
      alert('Error fetching orders');
    } else {
      setSavedOrders(data.map((row: any) => row.data));
    }
    setIsLoading(false);
  };

  const calculateRowData = (row: Partial<RowEntry>): { sft: number; amount: number } => {
    const sizeKey = row.size || '';
    let pcs = PCS_PER_BOX[sizeKey] || 0;
    if (sizeKey === '20x20' && row.model?.toUpperCase().includes('HDT')) pcs = 15;

    if (row.length && row.weight && row.qty && pcs > 0) {
      const area = (row.length * row.weight) / 929.03;
      const sft = row.qty * pcs * area;
      const amount = sft * (row.rate || 0);
      return { sft: Number(sft.toFixed(2)), amount: Number(amount.toFixed(2)) };
    }
    return { sft: 0, amount: 0 };
  };

  const createEmptyRow = (): RowEntry => ({
    id: Math.random().toString(36).substr(2, 9),
    model: '', length: 0, weight: 0, size: '', qty: 0, rate: 0, remarks: '', sft: 0, amount: 0
  });

  const addRow = (target: 'main' | 'first' | 'second') => {
    if (target === 'main') setItems([...items, createEmptyRow()]);
    if (target === 'first') setFirstLoadItems([...firstLoadItems, createEmptyRow()]);
    if (target === 'second') setSecondLoadItems([...secondLoadItems, createEmptyRow()]);
  };

  const updateRow = (id: string, updates: Partial<RowEntry>, target: 'main' | 'first' | 'second') => {
    const updater = (prev: RowEntry[]) => prev.map(row => {
      if (row.id === id) {
        const merged = { ...row, ...updates };
        const { sft, amount } = calculateRowData(merged);
        return { ...merged, sft, amount };
      }
      return row;
    });

    if (target === 'main') setItems(updater);
    if (target === 'first') setFirstLoadItems(updater);
    if (target === 'second') setSecondLoadItems(updater);
  };

  const deleteRow = (id: string, target: 'main' | 'first' | 'second') => {
    if (target === 'main') setItems(items.filter(r => r.id !== id));
    if (target === 'first') setFirstLoadItems(firstLoadItems.filter(r => r.id !== id));
    if (target === 'second') setSecondLoadItems(secondLoadItems.filter(r => r.id !== id));
  };

  const handleModelInput = (id: string, val: string, target: 'main' | 'first' | 'second') => {
    updateRow(id, { model: val }, target);
    if (val.length < 2) {
      setSuggestions([]);
      setActiveSuggestionId(null);
      return;
    }
    const filtered = allModels.filter(m => m.model.toUpperCase().includes(val.toUpperCase())).slice(0, 8);
    setSuggestions(filtered);
    setActiveSuggestionId(id);
  };

  const selectSuggestion = (id: string, modelData: ProcessedModel, target: 'main' | 'first' | 'second') => {
    const rateStr = RATE_DATA.specials[modelData.model] || RATE_DATA.defaults[modelData.size as keyof typeof RATE_DATA.defaults] || '0';
    updateRow(id, {
      model: modelData.model,
      length: modelData.length,
      weight: modelData.weight,
      size: modelData.size,
      rate: parseFloat(rateStr)
    }, target);
    setSuggestions([]);
    setActiveSuggestionId(null);
  };

  const grandTotals = useMemo(() => {
    const activeItems = orderType === 'twopoint' ? [...firstLoadItems, ...secondLoadItems] : items;
    return activeItems.reduce((acc, curr) => ({
      sft: acc.sft + curr.sft,
      amount: acc.amount + curr.amount,
      boxes: acc.boxes + curr.qty
    }), { sft: 0, amount: 0, boxes: 0 });
  }, [items, firstLoadItems, secondLoadItems, orderType]);

  const saveOrder = async () => {
    const activeItems = orderType === 'twopoint' ? [...firstLoadItems, ...secondLoadItems] : items;
    if (activeItems.length === 0) return alert("Add at least one item");
    
    setIsLoading(true);
    let newOrder: SavedOrder;

    if (editingOrderId) {
      newOrder = { 
        ...savedOrders.find(o => o.id === editingOrderId)!,
        date: orderDate, items, firstLoadItems, secondLoadItems, 
        customerInfo: { name: customerName, address: customerAddress, phone: customerPhone },
        transitFlag,
        totals: { ...grandTotals } 
      };
    } else {
      const [y, m, d] = orderDate.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(m) - 1];
      const dateString = `${d}-${monthName}-${y.slice(-2)}`;
      const randomPart = Math.random().toString(36).substr(2, 3).toUpperCase();
      const newOrderId = `ORD-${dateString}-${randomPart}`;
      
      newOrder = { 
        id: newOrderId, date: orderDate, type: orderType, 
        customerInfo: { name: customerName, address: customerAddress, phone: customerPhone },
        transitFlag, items, firstLoadItems, secondLoadItems,
        totals: { ...grandTotals } 
      };
    }

    const { error } = await supabase.from('orders').upsert({ id: newOrder.id, data: newOrder }, { onConflict: 'id' });
    
    if (error) {
      console.error(error);
      alert('Failed to save order');
    } else {
      await fetchOrders();
      setView('list');
      resetForm();
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setItems([]); setFirstLoadItems([]); setSecondLoadItems([]);
    setCustomerName(''); setCustomerAddress(''); setCustomerPhone('');
    setEditingOrderId(null);
  };

  const deleteOrder = async (id: string) => {
    if(confirm('Delete this order?')) { 
      setIsLoading(true);
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) {
        alert('Failed to delete');
      } else {
        await fetchOrders();
      }
      setIsLoading(false);
    }
  };

  const generatePDF = (order: SavedOrder, type: 'order' | 'value') => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header - Blue, Bold, "Algerian" style
    doc.setFont("times", "bold").setFontSize(32).setTextColor(0, 0, 255);
    doc.text("CERAMICS TRADE", pageWidth / 2, 50, { align: 'center' });
    
    // Subtitle - Black
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(0, 0, 0);
    const titleText = order.type === 'warehouse' ? 'Warehouse Tiles Order' : 
                     order.type === 'twopoint' ? '2-Point Tiles Order' : 'Site Delivery Order';
    doc.text(titleText, pageWidth / 2, 75, { align: 'center' });
    
    // Customer and Date Info
    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(0, 0, 0);
    const infoY = 110;
    
    // Left side: Customer Info
    if (order.customerInfo?.name) {
      doc.setFont("helvetica", "bold").text(`Customer: ${order.customerInfo.name}`, 40, infoY);
      doc.setFont("helvetica", "normal").text(`Address: ${order.customerInfo.address}`, 40, infoY + 15);
      doc.text(`Phone: ${order.customerInfo.phone}`, 40, infoY + 30);
    }
    
    // Right side: Date (DD-MMM-YY format)
    const [y, m, d] = order.date.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m) - 1];
    const displayDate = `${d}-${monthName}-${y.slice(-2)}`;
    
    doc.setFont("helvetica", "bold").text(`Date: ${displayDate}`, pageWidth - 40, infoY, { align: 'right' });
    
    // Table Column Configuration
    const columns = ['SL', 'Model', 'Size', 'Qty/Box'];
    if (type === 'value') {
      columns.push('Rate', 'Amount');
    }
    columns.push('Remarks');

    const renderTable = (items: RowEntry[], label: string | null, startY: number) => {
      if (label) {
        doc.setFontSize(12).setFont("helvetica", "bold").text(label, pageWidth / 2, startY - 10, { align: 'center' });
      }
      
      const body = items.map((item, idx) => {
        const row = [idx + 1, item.model, item.size, item.qty];
        if (type === 'value') {
          row.push(item.rate.toFixed(2), item.amount.toFixed(2));
        }
        row.push(item.remarks || '-');
        return row;
      });

      (doc as any).autoTable({
        startY,
        head: [columns],
        body,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 5, halign: 'center', textColor: [0, 0, 0] },
      });
      
      return (doc as any).lastAutoTable.finalY;
    };

    let currentY = 165;
    if (order.type === 'twopoint') {
      currentY = renderTable(order.firstLoadItems || [], "1st Load", currentY + 15) + 40;
      currentY = renderTable(order.secondLoadItems || [], "2nd Load", currentY) + 30;
      
      // Transit Direction text centered and bold
      const transitText = `Transit Direction: ${order.transitFlag === 'wts' ? 'Warehouse to Site' : 'Site to Warehouse'}`;
      doc.setFontSize(11).setFont("helvetica", "bold").text(transitText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 25;
    } else {
      currentY = renderTable(order.items || [], null, currentY) + 35;
    }

    // Totals Section
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(0, 0, 0);
    
    // Total SFT and Amount only on Value PDF
    if (type === 'value') {
      doc.text(`Total SFT: ${order.totals.sft.toFixed(2)}`, 40, currentY);
      doc.text(`Grand Total Amount: BDT ${order.totals.amount.toLocaleString()}`, 40, currentY + 15);
    }
    
    doc.save(`${type === 'value' ? 'Value' : 'Order'}_${displayDate}.pdf`);
  };

  const renderItemCard = (row: RowEntry, target: 'main' | 'first' | 'second') => (
    <div key={row.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative space-y-4 mb-4">
      <button onClick={() => deleteRow(row.id, target)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
        <Trash2 size={16} />
      </button>
      <div className="relative">
        <label className="text-[9px] font-black text-slate-400 uppercase">Model No.</label>
        <input 
          type="text" placeholder="Search model..." 
          className="w-full mt-1 bg-slate-50 border-none rounded-lg p-2.5 text-sm font-bold uppercase" 
          value={row.model} onChange={(e) => handleModelInput(row.id, e.target.value, target)} 
        />
        {activeSuggestionId === row.id && suggestions.length > 0 && (
          <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
            {suggestions.map((s, si) => (
              <button key={si} onClick={() => selectSuggestion(row.id, s, target)} className="w-full text-left p-3 text-sm border-b border-slate-50 last:border-0 hover:bg-indigo-50 flex justify-between items-center">
                <div><p className="font-black text-slate-800">{s.model}</p><p className="text-[10px] text-slate-400 font-bold">{s.size} CM</p></div>
                <Plus size={14} className="text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-[9px] font-black text-slate-400 uppercase">Qty</label><input type="number" className="w-full mt-1 bg-slate-50 border-none rounded-lg p-2.5 text-sm font-bold" value={row.qty || ''} onChange={e => updateRow(row.id, { qty: parseFloat(e.target.value) || 0 }, target)} /></div>
        <div><label className="text-[9px] font-black text-slate-400 uppercase">Rate</label><input type="number" className="w-full mt-1 bg-slate-50 border-none rounded-lg p-2.5 text-sm font-bold" value={row.rate || ''} onChange={e => updateRow(row.id, { rate: parseFloat(e.target.value) || 0 }, target)} /></div>
        <div><label className="text-[9px] font-black text-slate-400 uppercase">Size</label><input type="text" readOnly className="w-full mt-1 bg-slate-100 border-none rounded-lg p-2.5 text-sm font-black text-slate-400 text-center uppercase" value={row.size} /></div>
      </div>
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase">Remarks</label>
        <input type="text" className="w-full mt-1 bg-slate-50 border-none rounded-lg p-2.5 text-sm font-medium" value={row.remarks} onChange={e => updateRow(row.id, { remarks: e.target.value }, target)} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => { 
              if (view === 'entry') setView('type_selection');
              else if (view === 'type_selection') setView('list');
              else navigate('/');
            }} 
            className="p-2 -ml-2 rounded-full active:bg-gray-100"
          >
            <ChevronLeft size={24} className="text-slate-800" />
          </button>
          <h1 className="ml-2 text-lg font-bold text-slate-800 uppercase tracking-tight">
            {view === 'list' ? 'Tiles Orders' : view === 'type_selection' ? 'Select Order Type' : orderType.replace('twopoint', '2-Point').toUpperCase() + ' Order'}
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden p-5">
        {view === 'list' && (
          <div className="space-y-4 pb-24">
            {isLoading && savedOrders.length === 0 && <div className="text-center py-10">Loading orders...</div>}
            
            {savedOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{order.type}</span>
                    <h3 className="text-sm font-black text-slate-800 mt-1 uppercase">
                      {order.customerInfo?.name || 'STOCK ORDER'}
                    </h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => generatePDF(order, 'order')} title="Print Order" className="p-2 text-slate-300 hover:text-blue-600 active:scale-90"><Printer size={18} /></button>
                    <button onClick={() => generatePDF(order, 'value')} title="Print Value" className="p-2 text-slate-300 hover:text-emerald-600 active:scale-90"><Calculator size={18} /></button>
                    <button onClick={() => { 
                      setOrderType(order.type);
                      setOrderDate(order.date);
                      setCustomerName(order.customerInfo?.name || '');
                      setCustomerAddress(order.customerInfo?.address || '');
                      setCustomerPhone(order.customerInfo?.phone || '');
                      setItems(order.items || []);
                      setFirstLoadItems(order.firstLoadItems || []);
                      setSecondLoadItems(order.secondLoadItems || []);
                      setTransitFlag(order.transitFlag || 'wts');
                      setEditingOrderId(order.id);
                      setView('entry');
                    }} className="p-2 text-slate-300 hover:text-orange-500 active:scale-90"><Edit3 size={18} /></button>
                    <button onClick={() => deleteOrder(order.id)} className="p-2 text-slate-300 hover:text-red-500 active:scale-90"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="pt-3 border-t border-dashed border-gray-100 flex justify-between items-center text-[11px]">
                  <div className="flex items-center text-slate-400 font-bold"><Calendar size={12} className="mr-1" /> {order.date}</div>
                  <div className="text-right">
                    <span className="text-slate-400 mr-1 uppercase font-bold tracking-tighter">SFT:</span>
                    <span className="font-black text-slate-900">{order.totals.sft.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => setView('type_selection')}
              className="fixed bottom-8 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50 border-4 border-white"
            >
              <Plus size={32} />
            </button>
          </div>
        )}

        {view === 'type_selection' && (
          <div className="space-y-4">
            <button onClick={() => { setOrderType('warehouse'); resetForm(); setView('entry'); }} className="w-full p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center active:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mr-4"><Warehouse size={24} /></div>
              <div className="text-left"><h3 className="font-black text-slate-800 uppercase tracking-tight">Warehouse Order</h3><p className="text-xs text-slate-400">Regular tiles order from stock</p></div>
            </button>
            <button onClick={() => { setOrderType('twopoint'); resetForm(); setView('entry'); }} className="w-full p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center active:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mr-4"><Truck size={24} /></div>
              <div className="text-left"><h3 className="font-black text-slate-800 uppercase tracking-tight">2-Point Order</h3><p className="text-xs text-slate-400">Manage 1st and 2nd load separately</p></div>
            </button>
            <button onClick={() => { setOrderType('site'); resetForm(); setView('entry'); }} className="w-full p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center active:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mr-4"><MapPin size={24} /></div>
              <div className="text-left"><h3 className="font-black text-slate-800 uppercase tracking-tight">Site Delivery</h3><p className="text-xs text-slate-400">Direct delivery to client location</p></div>
            </button>
          </div>
        )}

        {view === 'entry' && (
          <div className="pb-48 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Order Date</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="w-full mt-1 bg-slate-50 border-none rounded-xl p-3 text-sm font-semibold" />
              </div>

              {(orderType === 'twopoint' || orderType === 'site') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center bg-slate-50 p-3 rounded-xl">
                    <User size={16} className="text-slate-400 mr-3" />
                    <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="flex-1 bg-transparent text-sm font-bold border-none outline-none" />
                  </div>
                  <div className="flex items-center bg-slate-50 p-3 rounded-xl">
                    <Map size={16} className="text-slate-400 mr-3" />
                    <input type="text" placeholder="Delivery Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="flex-1 bg-transparent text-sm font-bold border-none outline-none" />
                  </div>
                  <div className="flex items-center bg-slate-50 p-3 rounded-xl">
                    <Phone size={16} className="text-slate-400 mr-3" />
                    <input type="tel" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="flex-1 bg-transparent text-sm font-bold border-none outline-none" />
                  </div>
                </div>
              )}
            </div>

            {orderType === 'twopoint' ? (
              <>
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">1st Load</h2>
                    <button onClick={() => addRow('first')} className="bg-emerald-600 text-white p-2 rounded-lg shadow-md active:scale-90"><Plus size={16} /></button>
                  </div>
                  {firstLoadItems.map(row => renderItemCard(row, 'first'))}
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1 rounded-full">2nd Load</h2>
                    <button onClick={() => addRow('second')} className="bg-blue-600 text-white p-2 rounded-lg shadow-md active:scale-90"><Plus size={16} /></button>
                  </div>
                  {secondLoadItems.map(row => renderItemCard(row, 'second'))}
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Transit Direction</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setTransitFlag('wts')}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${transitFlag === 'wts' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      <ArrowRightLeft size={20} className="mb-1" />
                      <span className="text-[9px] font-black uppercase">Warehouse to Site</span>
                    </button>
                    <button 
                      onClick={() => setTransitFlag('stw')}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${transitFlag === 'stw' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      <ArrowRightLeft size={20} className="mb-1 transform rotate-180" />
                      <span className="text-[9px] font-black uppercase">Site to Warehouse</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tile Items</h2>
                  <button onClick={() => addRow('main')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md flex items-center"><Plus size={14} className="mr-1" /> Add Item</button>
                </div>
                {items.map(row => renderItemCard(row, 'main'))}
              </div>
            )}
          </div>
        )}
      </main>

      {view === 'entry' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 shadow-2xl z-[60]">
          <div className="flex justify-between items-end mb-4 px-1">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Grand SFT</p><p className="text-xl font-black text-slate-800 leading-none">{grandTotals.sft.toFixed(2)}</p></div>
            <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Value</p><p className="text-xl font-black text-indigo-600 leading-none">৳{grandTotals.amount.toLocaleString()}</p></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="flex-1 py-4 bg-slate-50 text-slate-400 font-bold rounded-2xl border border-slate-100 flex items-center justify-center"><X size={18} className="mr-2" /> Cancel</button>
            <button disabled={isLoading} onClick={saveOrder} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center shadow-xl">
              {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={18} className="mr-2" /> {editingOrderId ? 'Update Order' : 'Save Order'}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TilesOrderView;
