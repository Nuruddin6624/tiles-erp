
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, Printer, 
  Calendar, Save, X, Search, Edit3, 
  IndianRupee, Clock, User, Phone, MapPin, Hash, Loader2, RefreshCw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../lib/supabase';

interface InvoiceItem {
  id: string;
  desc: string;
  model: string;
  color: string;
  len: number;
  wid: number;
  size: string;
  brand: string;
  tpcs: number;
  sft: number;
  box: number;
  pcs: number;
  rate: number;
  discountPercent: number;
  discountAmt: number;
  grossAmt: number;
  netAmt: number;
}

interface Invoice {
  id: string;
  clientName: string;
  address: string;
  siteAddress: string;
  phone: string;
  remarks: string;
  salesperson: string;
  salesphone: string;
  date: string;
  time: string;
  poNo: string;
  items: InvoiceItem[];
  vatPercent: number;
  totals: {
    grossTotal: number;
    discountTotal: number;
    subtotal: number; // Sum of item Net Amounts
    less: number;
    carrying: number;
    unloading: number;
    advance: number;
    net: number;
    rest: number;
  };
}

const PCS_MAP: Record<string, number> = {
  '24X24': 4, '32X32': 2, '24X48': 2, '40X40': 2, '16X16': 9, 
  '12X12': 16, '10.5X12': 19, '8X12': 25, '10X16': 15, '8X20': 14, 
  '10X28': 8, '12X24': 8, '8X8': 20, '12X84': 4, '8X48': 6
};

// Utility to load image safely
const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Failed to load image at ${url}. Proceeding with placeholder.`);
      resolve(null);
    };
    img.src = url;
  });
};

// Utility for number to words
const numberToWords = (amount: number): string => {
  const words = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (amount === 0) return 'Zero';

  const convert = (num: number): string => {
    if (num < 20) return words[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + words[num % 10] : '');
    if (num < 1000) return words[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) {
        const lakhs = Math.floor(num / 100000);
        const rem = num % 100000;
        return convert(lakhs) + ' Lac' + (rem !== 0 ? ' ' + convert(rem) : '');
    }
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convert(num % 10000000) : '');
  };

  return convert(Math.floor(amount)) + ' Taka Only';
};

const InvoiceView: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'entry'>('list');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [remarks, setRemarks] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [salesphone, setSalesphone] = useState('');
  const [poNo, setPoNo] = useState('');
  const [vatPercent, setVatPercent] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: true }));
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [less, setLess] = useState(0);
  const [carrying, setCarrying] = useState(0);
  const [unloading, setUnloading] = useState(0);
  const [advance, setAdvance] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('invoices').select('data');
    if (error) {
      console.error('Error fetching invoices:', error);
      alert('Error fetching data');
    } else {
      setInvoices(data.map((row: any) => row.data));
    }
    setIsLoading(false);
  };

  const calculateItem = (item: Partial<InvoiceItem>): Partial<InvoiceItem> => {
    const L = item.len || 0;
    const W = item.wid || 0;
    const tpcs = item.tpcs || 0;
    const rate = item.rate || 0;
    const discP = item.discountPercent || 0;

    const size = L && W ? `${L}X${W}` : 'X';
    const sft = ((L * W) / 144) * tpcs;
    const per = PCS_MAP[size] || 0;
    const box = per ? Math.floor(tpcs / per) : 0;
    const remPcs = per ? tpcs - (box * per) : tpcs;
    
    const grossAmt = rate * sft;
    const discountAmt = (grossAmt * discP) / 100;
    const netAmt = grossAmt - discountAmt;

    return {
      ...item,
      size,
      sft: Number(sft.toFixed(2)),
      box,
      pcs: remPcs,
      grossAmt: Number(grossAmt.toFixed(2)),
      discountAmt: Number(discountAmt.toFixed(2)),
      netAmt: Number(netAmt.toFixed(2))
    };
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      desc: '', model: '', color: '', len: 0, wid: 0, size: '', brand: '',
      tpcs: 0, sft: 0, box: 0, pcs: 0, rate: 0, discountPercent: 0, discountAmt: 0, grossAmt: 0, netAmt: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems(items.map(it => {
      if (it.id === id) {
        const merged = { ...it, ...updates };
        return { ...merged, ...calculateItem(merged) } as InvoiceItem;
      }
      return it;
    }));
  };

  const removeItem = (id: string) => setItems(items.filter(it => it.id !== id));

  const totals = useMemo(() => {
    const grossTotal = items.reduce((sum, it) => sum + it.grossAmt, 0);
    const discountTotal = items.reduce((sum, it) => sum + it.discountAmt, 0);
    const subtotal = items.reduce((sum, it) => sum + it.netAmt, 0);
    const vatAmt = (subtotal * vatPercent) / 100;
    const net = subtotal - less + carrying + unloading + vatAmt;
    const rest = net - advance;
    return { grossTotal, discountTotal, subtotal, less, carrying, unloading, advance, net, rest };
  }, [items, less, carrying, unloading, advance, vatPercent]);

  const saveInvoice = async () => {
    if (!clientName) return alert("Client Name is required");
    if (items.length === 0) return alert("Add at least one item");

    const newInvoice: Invoice = {
      id: editingId || `CT${Date.now().toString().slice(-5)}`,
      clientName, address, siteAddress, phone, remarks, salesperson, salesphone, date, time, poNo,
      items, vatPercent, totals: { ...totals }
    };

    setIsLoading(true);
    // Upsert to Supabase: id matches PK, data column stores full object
    const { error } = await supabase
      .from('invoices')
      .upsert({ id: newInvoice.id, data: newInvoice }, { onConflict: 'id' });

    if (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice');
    } else {
      await fetchInvoices();
      setView('list');
      resetForm();
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setClientName(''); setAddress(''); setSiteAddress(''); setPhone('');
    setRemarks(''); setSalesperson(''); setSalesphone(''); setPoNo(''); setVatPercent(0);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toLocaleTimeString('en-US', { hour12: true }));
    setItems([]); setLess(0); setCarrying(0); setUnloading(0); setAdvance(0);
    setEditingId(null);
  };

  const editInvoice = (inv: Invoice) => {
    setClientName(inv.clientName);
    setAddress(inv.address);
    setSiteAddress(inv.siteAddress);
    setPhone(inv.phone);
    setRemarks(inv.remarks);
    setSalesperson(inv.salesperson);
    setSalesphone(inv.salesphone);
    setPoNo(inv.poNo || '');
    setVatPercent(inv.vatPercent || 0);
    setDate(inv.date);
    setTime(inv.time || '');
    setItems(inv.items);
    setLess(inv.totals.less);
    setCarrying(inv.totals.carrying);
    setUnloading(inv.totals.unloading);
    setAdvance(inv.totals.advance);
    setEditingId(inv.id);
    setView('entry');
  };

  const deleteInvoice = async (id: string) => {
    if (confirm("Delete this invoice?")) {
      setIsLoading(true);
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) {
        alert('Failed to delete');
      } else {
        await fetchInvoices();
      }
      setIsLoading(false);
    }
  };

  const generatePDF = async (inv: Invoice) => {
    setIsPrinting(inv.id);
    
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Brand Logo URLs
    const leftLogoUrl = "https://ceramicstrade.iceiy.com/wp-content/uploads/2025/08/366673551_260917863413028_2922211607536135019_n.jpg";
    const rightLogoUrl = "https://ceramicstrade.iceiy.com/wp-content/uploads/2025/08/images-1.png";

    try {
      const [leftImg, rightImg] = await Promise.all([
        loadImage(leftLogoUrl),
        loadImage(rightLogoUrl)
      ]);

      // 1. Header Area with 2 logos
      if (leftImg) doc.addImage(leftImg, 'JPEG', 30, 20, 80, 80);
      if (rightImg) doc.addImage(rightImg, 'PNG', pageWidth - 110, 20, 80, 80);

      // Brand Title and Office Address
      doc.setFont("times", "bold").setFontSize(30).setTextColor(0, 84, 166);
      doc.text("CERAMICS TRADE", pageWidth / 2, 45, { align: 'center' });
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0, 112, 192);
      doc.text("House# 26,28, Road#6/C, Sector#12, Uttara, Dhaka", pageWidth / 2, 60, { align: 'center' });
      
      doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(0).text("INVOICE/CASH", pageWidth / 2, 90, { align: 'center' });
      doc.setLineWidth(1).line(pageWidth / 2 - 60, 93, pageWidth / 2 + 60, 93);

      // 2. Metadata Section
      doc.setFontSize(10).setTextColor(0);
      let metaY = 125;
      doc.setFont("helvetica", "bold").text("Client Name :", 30, metaY);
      doc.setFont("helvetica", "normal").text(inv.clientName, 100, metaY);
      doc.setFont("helvetica", "bold").text("Address      :", 30, metaY + 20);
      doc.setFont("helvetica", "normal").text(`:- ${inv.address}`, 100, metaY + 20, { maxWidth: 220 });
      doc.setFont("helvetica", "bold").text("Phone        :", 30, metaY + 45);
      doc.setFont("helvetica", "normal").text(`: ${inv.phone}`, 100, metaY + 45);
      doc.setFont("helvetica", "bold").text("Remarks      :", 30, metaY + 65);
      doc.setFont("helvetica", "normal").text(`:- ${inv.remarks}`, 100, metaY + 65);

      doc.setFont("helvetica", "bold").text("Date", pageWidth - 140, metaY);
      doc.setFont("helvetica", "normal").text(inv.date.split('-').reverse().join('/'), pageWidth - 70, metaY);

      // 3. Items Table (Balanced Columns)
      const tableHeaders = [['SL', 'Model', 'Description', 'Size/Inch', 'Brand', 'Sft', 'Total Pcs', 'Box', 'Pcs', 'Rate', 'Amt']];
      const tableBody: any[][] = inv.items.map((it, idx) => [
        idx + 1, it.model, it.desc, it.size, it.brand, 
        it.sft.toFixed(1), it.tpcs, it.box, it.pcs === 0 ? '' : it.pcs, 
        it.rate.toFixed(0), it.netAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ]);

      const totalSft = inv.items.reduce((sum, i) => sum + i.sft, 0);
      const totalPcs = inv.items.reduce((sum, i) => sum + i.tpcs, 0);
      const totalBoxes = inv.items.reduce((sum, i) => sum + i.box, 0);
      const totalRemPcs = inv.items.reduce((sum, i) => sum + i.pcs, 0);
      const totalAmt = inv.items.reduce((sum, i) => sum + i.netAmt, 0);

      tableBody.push([
        { content: 'Total', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: totalSft.toFixed(0), styles: { fontStyle: 'bold' } },
        { content: totalPcs.toString(), styles: { fontStyle: 'bold' } },
        { content: totalBoxes.toString(), styles: { fontStyle: 'bold' } },
        { content: totalRemPcs.toString(), styles: { fontStyle: 'bold' } },
        '',
        { content: totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }
      ]);

      (doc as any).autoTable({
        startY: 210,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, fontStyle: 'bold', halign: 'center', fontSize: 8.5 },
        styles: { fontSize: 8.5, halign: 'center', textColor: 0, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: { 
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { halign: 'left', cellWidth: 125 },
          3: { cellWidth: 50 },
          4: { cellWidth: 50 },
          10: { halign: 'right', cellWidth: 65 } 
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 1;

      // 4. Totals Calculation Summary
      const calcX = pageWidth - 220;
      const calcData: any[][] = [
        ['Less', inv.totals.less.toFixed(2)],
        ['Carrying', inv.totals.carrying.toFixed(2)],
        [{ content: 'Net Amount', styles: { fontStyle: 'bold' } }, { content: inv.totals.net.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } }],
        [{ content: 'Advance Taka', styles: { textColor: [0, 112, 192], fontStyle: 'bold' } }, { content: inv.totals.advance.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { textColor: [0, 112, 192], fontStyle: 'bold' } }],
        [{ content: 'Rest Amount', styles: { textColor: [0, 112, 192], fontStyle: 'bold' } }, { content: inv.totals.rest.toLocaleString('en-US', { minimumFractionDigits: 2 }), styles: { textColor: [0, 112, 192], fontStyle: 'bold' } }]
      ];

      (doc as any).autoTable({
        startY: finalY,
        margin: { left: calcX },
        tableWidth: 190,
        body: calcData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, halign: 'right' },
        columnStyles: { 0: { halign: 'center', cellWidth: 110 } }
      });

      // 5. Amount Words & Final Summary
      const summaryBottomY = (doc as any).lastAutoTable.finalY;
      const amountWordY = Math.max(summaryBottomY + 30, 480);
      doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(0);
      doc.text(`Amount In word :-   ${numberToWords(inv.totals.net)}`, 30, amountWordY);

      // 6. Signature Area (4 Equal Distributed Columns)
      const sigY = pageHeight - 110;
      const horizontalMargin = 30;
      const availableWidth = pageWidth - (horizontalMargin * 2);
      const colWidth = availableWidth / 4;
      const centers = [
        horizontalMargin + colWidth * 0.5,
        horizontalMargin + colWidth * 1.5,
        horizontalMargin + colWidth * 2.5,
        horizontalMargin + colWidth * 3.5
      ];

      doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(0);
      const lineLen = 100;

      // Col 1: Customer
      doc.line(centers[0] - lineLen/2, sigY, centers[0] + lineLen/2, sigY);
      doc.text("Customer's Signature", centers[0], sigY + 12, { align: 'center' });

      // Col 2: Prepared By
      doc.line(centers[1] - lineLen/2, sigY, centers[1] + lineLen/2, sigY);
      doc.text("Prepared By", centers[1], sigY + 12, { align: 'center' });
      doc.setFontSize(9.5).setTextColor(0, 112, 192).text("Md.Nuruddin Shamim", centers[1], sigY + 25, { align: 'center' });

      // Col 3: Cash Received
      doc.setTextColor(0).setFontSize(8.5);
      doc.line(centers[2] - lineLen/2, sigY, centers[2] + lineLen/2, sigY);
      doc.text("Cash Received By", centers[2], sigY + 12, { align: 'center' });

      // Col 4: Sales Team
      doc.line(centers[3] - lineLen/2, sigY, centers[3] + lineLen/2, sigY);
      doc.text("Sales Person", centers[3], sigY + 12, { align: 'center' });
      doc.setFontSize(9.5).setTextColor(200, 0, 0);
      doc.text(inv.salesperson || "Ceramics Trade", centers[3], sigY + 25, { align: 'center' });
      doc.text(inv.salesphone || "", centers[3], sigY + 38, { align: 'center' });

      // 7. Terms & Conditions (Fixed at Bottom Footer)
      const termsY = pageHeight - 50;
      doc.setFontSize(7.5).setFont("helvetica", "bold").setTextColor(120);
      doc.text("Terms & Conditions:", 30, termsY);
      doc.setFont("helvetica", "normal").setFontSize(7);
      doc.text("1. Do not return more than one packet. 2. Sold goods will be taken back at 20% less of the previous invoice value.", 30, termsY + 12);
      doc.text("3. Complaints must be requested within 7 days; otherwise, it will not be accepted.", 30, termsY + 22);

      doc.save(`Invoice_${inv.clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Error generating PDF. Please ensure all assets are accessible.");
    } finally {
      setIsPrinting(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24 text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => view === 'list' ? navigate('/') : setView('list')} className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors">
            <ChevronLeft size={24} className="text-slate-800" />
          </button>
          <h1 className="ml-2 text-lg font-bold text-slate-800 uppercase tracking-tight">
            {view === 'list' ? 'Invoices' : editingId ? 'Edit Memo' : 'New Memo'}
          </h1>
        </div>
        {view === 'list' && (
          <button onClick={fetchInvoices} className="p-2 bg-slate-100 rounded-full active:bg-slate-200">
            <RefreshCw size={18} className={`${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </header>

      <main className="flex-1 p-5 overflow-x-hidden">
        {view === 'list' ? (
          <div className="space-y-4">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder="Search client or invoice..." 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {isLoading && invoices.length === 0 && <div className="text-center py-10">Loading invoices...</div>}

            {filteredInvoices.map(inv => (
              <div key={inv.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">{inv.id}</span>
                    <h3 className="text-sm font-black text-slate-800 mt-1 uppercase tracking-tight">{inv.clientName}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => generatePDF(inv)} 
                      disabled={isPrinting === inv.id}
                      className="p-2 text-slate-300 hover:text-blue-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isPrinting === inv.id ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                    </button>
                    <button onClick={() => editInvoice(inv)} className="p-2 text-slate-300 hover:text-orange-500 active:scale-95 transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-slate-300 hover:text-red-500 active:scale-95 transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-dashed border-slate-50 pt-3">
                  <div className="flex items-center uppercase tracking-tighter"><Calendar size={12} className="mr-1" /> {inv.date}</div>
                  <div className="text-right text-indigo-600 font-black tracking-tight">NET: ৳{inv.totals.net.toLocaleString()}</div>
                </div>
              </div>
            ))}

            <button 
              onClick={() => { resetForm(); setView('entry'); }}
              className="fixed bottom-8 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50 border-4 border-white"
            >
              <Plus size={32} />
            </button>
          </div>
        ) : (
          <div className="space-y-6 pb-48">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Client Name</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full Name" className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXX-XXXXXX" className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Village, City, Post" className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Remarks</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes..." className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none min-h-[60px] focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tile Items</h2>
                <button onClick={addItem} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl flex items-center border border-blue-100 transition-all active:scale-95 shadow-sm">
                  <Plus size={14} className="mr-1" /> Add Tile
                </button>
              </div>

              {items.map((it, idx) => (
                <div key={it.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm relative space-y-4">
                  <button onClick={() => removeItem(it.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <div className="flex gap-4 items-center mb-1">
                    <span className="w-6 h-6 rounded-lg bg-slate-50 text-[10px] font-black text-slate-400 flex items-center justify-center border border-slate-100">{idx+1}</span>
                    <input 
                      placeholder="Description (e.g. FLOOR TILES)" 
                      value={it.desc} onChange={e => updateItem(it.id, { desc: e.target.value })}
                      className="flex-1 text-sm font-black text-slate-800 outline-none border-b border-dashed border-slate-100 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase ml-1">Model</label>
                      <input value={it.model} onChange={e => updateItem(it.id, { model: e.target.value })} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold uppercase" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase ml-1">Brand</label>
                      <input value={it.brand} onChange={e => updateItem(it.id, { brand: e.target.value })} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold uppercase" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase ml-1">Len(")</label>
                      <input type="number" value={it.len || ''} onChange={e => updateItem(it.id, { len: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase ml-1">Wid(")</label>
                      <input type="number" value={it.wid || ''} onChange={e => updateItem(it.id, { wid: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase ml-1">PCS</label>
                      <input type="number" value={it.tpcs || ''} onChange={e => updateItem(it.id, { tpcs: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-300 uppercase ml-1">Rate</label>
                      <input type="number" value={it.rate || ''} onChange={e => updateItem(it.id, { rate: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                    <span>SFT: <span className="text-slate-900">{it.sft}</span></span>
                    <span>Net Amount: <span className="text-blue-600">৳{it.netAmt.toLocaleString()}</span></span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center">
                <IndianRupee size={12} className="mr-1" /> Adjustments
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">Less (-)</label>
                  <input type="number" value={less || ''} onChange={e => setLess(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">Carrying (+)</label>
                  <input type="number" value={carrying || ''} onChange={e => setCarrying(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">Advance Received (-)</label>
                  <input type="number" value={advance || ''} onChange={e => setAdvance(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 p-3 rounded-2xl text-sm font-bold border-none outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                 <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sales Team</h4>
                   <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Sales Person" value={salesperson} onChange={e => setSalesperson(e.target.value)} className="w-full bg-white p-2.5 rounded-xl text-xs font-bold border border-slate-100 outline-none" />
                      <input placeholder="Sales Phone" value={salesphone} onChange={e => setSalesphone(e.target.value)} className="w-full bg-white p-2.5 rounded-xl text-xs font-bold border border-slate-100 outline-none" />
                   </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {view === 'entry' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 shadow-2xl z-[60]">
          <div className="flex justify-between items-end mb-4 px-2">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Net Amount</p>
              <p className="text-2xl font-black text-slate-800 leading-none tracking-tighter">৳{totals.net.toLocaleString()}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Due Balance</p>
              <p className="text-xl font-black text-blue-600 leading-none tracking-tighter">৳{totals.rest.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="flex-1 py-4 bg-slate-50 text-slate-400 font-bold rounded-2xl border border-slate-100 flex items-center justify-center transition-all active:scale-95"><X size={18} className="mr-2" /> Cancel</button>
            <button disabled={isLoading} onClick={saveInvoice} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all">
              {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={18} className="mr-2" /> {editingId ? 'Update' : 'Save Invoice'}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceView;
