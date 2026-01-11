
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, FileText, 
  ExternalLink, Upload, CheckCircle2, Search, Save,
  Truck, PackageCheck, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SOEntry {
  id: string; // Generated SO-REF (e.g. SO-R-XXXX)
  orderRef: string;
  date: string;
  status: 'SO_READY' | 'TRUCK_ASSIGNED' | 'UNLOADED';
  pdfName?: string;
  pdfData?: string; 
  // Truck Info
  truckNo?: string;
  truckRef?: string;
  // Unload Info
  unloadPdfName?: string;
  unloadPdfData?: string;
  unloadRemarks?: string;
  isUnloaded: boolean;
}

interface SavedOrder {
  id: string;
  date: string;
}

const SOEntryView: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'add' | 'edit_unload'>('list');
  const [soEntries, setSoEntries] = useState<SOEntry[]>([]);
  const [availableOrders, setAvailableOrders] = useState<SavedOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSO, setSelectedSO] = useState<SOEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State for new SO
  const [newSOForm, setNewSOForm] = useState<Partial<SOEntry>>({
    orderRef: '',
    date: new Date().toISOString().split('T')[0],
    status: 'SO_READY',
    isUnloaded: false,
    unloadRemarks: ''
  });
  const [selectedFile, setSelectedFile] = useState<{name: string, data: string} | null>(null);

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch SO Entries
    const { data: soData, error: soError } = await supabase.from('so_entries').select('data');
    if (soError) {
      console.error('Error fetching SO entries:', soError);
    } else {
      setSoEntries(soData.map((row: any) => row.data));
    }

    // Fetch Orders for selection
    const { data: orderData, error: orderError } = await supabase.from('orders').select('data');
    if (orderError) {
      console.error('Error fetching orders:', orderError);
    } else {
      const orders: SavedOrder[] = orderData.map((row: any) => row.data);
      const existingRefs = (soData || []).map((row: any) => row.data.orderRef);
      setAvailableOrders(orders.filter(o => !existingRefs.includes(o.id)));
    }
    setIsLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'so' | 'unload') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'so') {
          setSelectedFile({ name: file.name, data: reader.result as string });
        } else if (selectedSO) {
          setSelectedSO({ ...selectedSO, unloadPdfName: file.name, unloadPdfData: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveNewSO = async () => {
    if (!newSOForm.orderRef || !selectedFile) {
      alert("Please select an Order and upload Factory SO PDF");
      return;
    }

    const newSO: SOEntry = {
      ...(newSOForm as SOEntry),
      id: `SO-R-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      pdfName: selectedFile?.name,
      pdfData: selectedFile?.data,
      isUnloaded: false
    };

    setIsLoading(true);
    const { error } = await supabase.from('so_entries').upsert({ id: newSO.id, data: newSO }, { onConflict: 'id' });
    
    if (error) {
      console.error(error);
      alert('Failed to save SO');
    } else {
      await fetchData();
      setView('list');
      setNewSOForm({ orderRef: '', date: new Date().toISOString().split('T')[0], status: 'SO_READY', isUnloaded: false, unloadRemarks: '' });
      setSelectedFile(null);
    }
    setIsLoading(false);
  };

  const updateTruckDetails = async (soId: string, truckNo: string) => {
    if (!truckNo) return;
    const so = soEntries.find(s => s.id === soId);
    if (!so) return;

    const updatedSO = { 
      ...so, 
      truckNo, 
      status: 'TRUCK_ASSIGNED' as const,
      truckRef: `TRK-${Math.random().toString(36).substr(2, 4).toUpperCase()}` 
    };

    setIsLoading(true);
    const { error } = await supabase.from('so_entries').upsert({ id: updatedSO.id, data: updatedSO }, { onConflict: 'id' });
    if (error) {
      alert('Failed to update truck');
    } else {
      await fetchData();
      alert(`Truck ${truckNo} assigned successfully!`);
    }
    setIsLoading(false);
  };

  const saveUnloadDetails = async () => {
    if (!selectedSO) return;
    setIsLoading(true);
    const { error } = await supabase.from('so_entries').upsert({ id: selectedSO.id, data: selectedSO }, { onConflict: 'id' });
    if (error) {
      alert('Failed to save unload details');
    } else {
      await fetchData();
      setView('list');
    }
    setIsLoading(false);
  };

  const deleteEntry = async (id: string) => {
    if (window.confirm("Delete this entry?")) {
      setIsLoading(true);
      const { error } = await supabase.from('so_entries').delete().eq('id', id);
      if (error) {
        alert('Failed to delete');
      } else {
        await fetchData();
      }
      setIsLoading(false);
    }
  };

  const filteredEntries = soEntries.filter(so => 
    so.orderRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
    so.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    so.truckNo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPdf = (data: string) => {
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
      alert("Please allow popups to view PDFs");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => view === 'list' ? navigate('/') : setView('list')} className="p-2 -ml-2 rounded-full active:bg-gray-100">
            <ChevronLeft size={24} className="text-slate-800" />
          </button>
          <h1 className="ml-2 text-lg font-bold text-slate-800 uppercase tracking-tight">
            {view === 'list' ? 'Pipeline Tracking' : view === 'add' ? 'New Factory SO' : 'Unload Entry'}
          </h1>
        </div>
      </header>

      <main className="flex-1 p-5">
        {view === 'list' ? (
          <div className="space-y-4">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder="Search by Order Ref, SO, or Truck..." 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-medium shadow-sm outline-none"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading && soEntries.length === 0 && <div className="text-center">Loading...</div>}

            {filteredEntries.map(so => (
              <div key={so.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                       <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">{so.id}</span>
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${so.isUnloaded ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {so.isUnloaded ? 'Unloaded' : 'Not Unload'}
                       </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Order Ref: <span className="text-indigo-600 font-black">{so.orderRef}</span></p>
                  </div>
                  <button onClick={() => deleteEntry(so.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-slate-100">
                  {/* Factory SO PDF Section */}
                  <div className="col-span-2 bg-slate-50 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText size={16} className="text-orange-500 mr-2" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">Factory SO Document</span>
                    </div>
                    {so.pdfData && (
                      <button onClick={() => openPdf(so.pdfData!)} className="text-[9px] font-black text-blue-600 uppercase flex items-center bg-white px-2 py-1 rounded-lg border border-blue-100 shadow-sm">
                        View <ExternalLink size={10} className="ml-1" />
                      </button>
                    )}
                  </div>

                  {/* Truck Entry Section */}
                  <div className="col-span-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Truck size={16} className="text-indigo-600 mr-2" />
                        <span className="text-[10px] font-black text-slate-500 uppercase">Truck Assignment</span>
                      </div>
                      {so.truckRef && <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{so.truckRef}</span>}
                    </div>

                    <div className="mb-3 px-1">
                      <p className="text-[9px] font-black text-indigo-300 uppercase leading-none mb-1">SO Reference</p>
                      <p className="text-[11px] font-black text-indigo-800">{so.id}</p>
                    </div>
                    
                    {so.truckNo ? (
                      <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-indigo-100">
                        <p className="text-sm font-black text-indigo-700 uppercase ml-1">No: {so.truckNo}</p>
                        <button 
                          onClick={() => {
                            const newNo = prompt("Enter new Truck Number:", so.truckNo);
                            if(newNo) updateTruckDetails(so.id, newNo);
                          }}
                          className="text-[9px] font-bold text-indigo-400 bg-white px-2 py-1 rounded-lg uppercase shadow-sm active:scale-95"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text" placeholder="Enter Truck Number" 
                          className="flex-1 text-sm font-bold p-2.5 rounded-xl border border-indigo-100 bg-white outline-none uppercase placeholder:text-slate-300"
                          id={`truck-input-${so.id}`}
                        />
                        <button 
                          onClick={() => {
                            const el = document.getElementById(`truck-input-${so.id}`) as HTMLInputElement;
                            updateTruckDetails(so.id, el.value);
                          }}
                          className="px-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 active:scale-95"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Unload Process Button */}
                  <button 
                    onClick={() => { setSelectedSO(so); setView('edit_unload'); }}
                    className={`col-span-2 py-4 rounded-2xl flex items-center justify-center text-[11px] font-black uppercase transition-all shadow-md ${so.isUnloaded ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-900 text-white shadow-slate-200'}`}
                  >
                    {so.isUnloaded ? <PackageCheck size={18} className="mr-2" /> : <AlertCircle size={18} className="mr-2" />}
                    {so.isUnloaded ? 'Unloaded Record' : 'Perform Unload Entry'}
                  </button>
                </div>
              </div>
            ))}
            
            {!isLoading && filteredEntries.length === 0 && (
              <div className="text-center py-20 text-slate-300 italic text-sm">No tracking entries found.</div>
            )}
          </div>
        ) : view === 'add' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-3">Link to Active Order</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableOrders.map(order => (
                    <button 
                      key={order.id}
                      onClick={() => setNewSOForm({ ...newSOForm, orderRef: order.id })}
                      className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${newSOForm.orderRef === order.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                    >
                      {order.id}
                    </button>
                  ))}
                  {availableOrders.length === 0 && (
                    <div className="col-span-2 text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">No pending orders available.</p>
                      <button onClick={() => navigate('/tiles-order')} className="mt-2 text-[9px] text-indigo-600 font-black uppercase underline">Create Order First</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-widest">Factory SO PDF Upload</label>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 cursor-pointer active:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                      <Upload size={24} className="text-slate-400" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-tight">
                      {selectedFile ? selectedFile.name : 'Select PDF File'}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'so')} />
                </label>
              </div>
            </div>
            
            <button 
              disabled={isLoading}
              onClick={saveNewSO} 
              className="w-full py-5 bg-orange-600 text-white font-black rounded-3xl shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center uppercase tracking-[0.2em]"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={20} className="mr-2" /> Save & Generate SO Ref</>}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">SO Reference</p>
                   <p className="text-lg font-black text-slate-800">{selectedSO?.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedSO({ ...selectedSO!, isUnloaded: !selectedSO?.isUnloaded })}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm ${selectedSO?.isUnloaded ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-rose-500 text-white shadow-rose-100'}`}
                >
                  {selectedSO?.isUnloaded ? 'Status: Unloaded' : 'Status: Not Unload'}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Unload Remarks</label>
                <textarea 
                  className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold min-h-[140px] placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="Enter breakage details, quality check, or location notes..."
                  value={selectedSO?.unloadRemarks}
                  onChange={e => setSelectedSO({...selectedSO!, unloadRemarks: e.target.value})}
                />
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-3 block tracking-widest">Unload Verification PDF</label>
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 cursor-pointer">
                  <div className="flex flex-col items-center">
                    <Upload size={24} className="text-slate-400 mb-2" />
                    <p className="text-[10px] text-slate-500 font-black uppercase">{selectedSO?.unloadPdfName || 'Upload Receipt/Challan'}</p>
                  </div>
                  <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileUpload(e, 'unload')} />
                </label>
                {selectedSO?.unloadPdfData && (
                  <button onClick={() => openPdf(selectedSO.unloadPdfData!)} className="w-full mt-3 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase border border-blue-100 active:scale-95 transition-transform flex items-center justify-center">
                    <FileText size={14} className="mr-2" /> View Uploaded Receipt
                  </button>
                )}
              </div>
            </div>
            
            <button 
              disabled={isLoading}
              onClick={saveUnloadDetails} 
              className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center uppercase tracking-widest"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} className="mr-2" /> Commit Unload Update</>}
            </button>
          </div>
        )}
      </main>

      {view === 'list' && (
        <button 
          onClick={() => { 
            setNewSOForm({ orderRef: '', date: new Date().toISOString().split('T')[0], status: 'SO_READY', isUnloaded: false, unloadRemarks: '' });
            setSelectedFile(null);
            setView('add'); 
          }}
          className="fixed bottom-8 right-6 w-16 h-16 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50 border-4 border-white"
        >
          <Plus size={32} />
        </button>
      )}
    </div>
  );
};

export default SOEntryView;
